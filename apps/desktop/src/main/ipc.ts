import path from 'node:path';
import fs from 'node:fs/promises';
import { app, dialog, ipcMain } from 'electron';
import {
  buildImportedDocument,
  createChapterId,
  createDocumentId,
  createParagraphId,
  IPC_CHANNELS,
  parseTextToImportResult,
  type AnalysisRunInput,
  type AnalysisSettingsInput,
  type LiteLizardDocument,
  type ParagraphAnalysisPattern,
} from '@litelizard/shared';
import { createFileService } from './fileService.js';
import { createApiKeyVault } from './sessionVault.js';
import { runAnalysis } from './apiBridge.js';
import { createAnalysisSettingsStore, mergeAnalysisSettings } from './analysisSettingsStore.js';
import { resolveAnalysisProvider } from './analysisProvider.js';
import {
  appendParagraphPattern,
  createGeneration,
  deleteAnalysisFiles,
  loadLatestAnalysis,
  migrateFromV1,
} from './analysisStore.js';
import {
  ensureFileName,
  ensureLzlFileName,
  sanitizeFileStem,
  toTitleFromFileName,
  validateEntryName,
} from './ipcPathUtils.js';
import { ensureProject } from './projectManager.js';
import { getLastOpenedFolder, setLastOpenedFolder } from './appStore.js';

const fileService = createFileService();
const apiKeyVault = createApiKeyVault(app.getPath('userData'));
const analysisSettingsStore = createAnalysisSettingsStore(app.getPath('userData'));

type FsEntryType = 'file' | 'folder';

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }
  return 'Unknown error';
}

function buildInitialDocument(filePath: string, title: string): LiteLizardDocument {
  const now = new Date().toISOString();
  const paragraphText = '新しい段落';
  const chapterId = createChapterId();

  return {
    version: 2,
    documentId: createDocumentId(),
    title,
    personaMode: 'general-reader',
    createdAt: now,
    updatedAt: now,
    source: {
      format: 'markdown-md',
      originPath: filePath,
    },
    chapters: [
      {
        id: chapterId,
        order: 1,
        title: '章1',
      },
    ],
    paragraphs: [
      {
        id: createParagraphId(),
        chapterId,
        order: 1,
        light: {
          text: paragraphText,
          charCount: paragraphText.length,
        },
        lizard: {
          status: 'stale',
        },
      },
    ],
  };
}

async function fileExists(filePath: string) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/** ファイルパスからプロジェクトルートを上方向に探す（.litelizard/config.json の有無で判定）。 */
async function findProjectRoot(filePath: string): Promise<string | null> {
  let current = path.dirname(filePath);
  const root = path.parse(current).root;
  while (current !== root) {
    try {
      await fs.access(path.join(current, '.litelizard', 'config.json'));
      return current;
    } catch {
      current = path.dirname(current);
    }
  }
  return null;
}

/**
 * ファイルから documentId を軽量抽出する（削除前のクリーンアップ用）。
 * .lzl: YAML フロントマターの documentId 行をパース
 * .md:  旧サイドカー JSON の documentId フィールドを参照
 */
async function extractDocumentId(filePath: string): Promise<string | null> {
  try {
    if (/\.lzl$/i.test(filePath)) {
      const raw = await fs.readFile(filePath, 'utf8');
      const match = raw.match(/^documentId:\s*(\S+)/m);
      return match?.[1] ?? null;
    }
    if (/\.md$/i.test(filePath)) {
      const sidecar = await fileService.readSidecarAnalysis(filePath);
      return sidecar?.documentId ?? null;
    }
  } catch {
    // 読み込み失敗は無視して null を返す
  }
  return null;
}

async function assertRenameTargetAvailable(sourcePath: string, targetPath: string) {
  if (sourcePath === targetPath) {
    return;
  }
  if (await fileExists(targetPath)) {
    throw new Error(`Target already exists: ${targetPath}`);
  }
}

export function registerIpcHandlers() {
  ipcMain.handle(IPC_CHANNELS.openFolder, async () => {
    try {
      const result = await dialog.showOpenDialog({
        properties: ['openDirectory'],
      });

      if (result.canceled || result.filePaths.length === 0) {
        return null;
      }

      const folderPath = result.filePaths[0];
      await ensureProject(folderPath);
      return folderPath;
    } catch (error) {
      console.error('[IPC dialog:openFolder] failed', error);
      throw new Error(`OPEN_FOLDER_FAILED: ${getErrorMessage(error)}`);
    }
  });

  ipcMain.handle(IPC_CHANNELS.getLastOpenedFolder, async () => {
    return getLastOpenedFolder();
  });

  ipcMain.handle(IPC_CHANNELS.setLastOpenedFolder, async (_, folderPath: string) => {
    await setLastOpenedFolder(folderPath);
    return { ok: true as const };
  });

  ipcMain.handle(IPC_CHANNELS.listTree, async (_, root: string) => {
    try {
      return await fileService.listTree(root);
    } catch (error) {
      console.error('[IPC fs:listTree] failed', error);
      throw new Error(`LIST_TREE_FAILED: ${getErrorMessage(error)}`);
    }
  });

  ipcMain.handle(IPC_CHANNELS.createEntry, async (_, root: string, type: FsEntryType, name: string) => {
    try {
      const validatedName = validateEntryName(name);

      if (type === 'folder') {
        const folderPath = path.join(root, validatedName);
        await fs.mkdir(folderPath);
        return { ok: true as const, path: folderPath, type };
      }

      const fileName = ensureLzlFileName(validateEntryName(sanitizeFileStem(validatedName)));
      const filePath = path.join(root, fileName);
      const title = toTitleFromFileName(fileName);

      if (await fileExists(filePath)) {
        throw new Error('File already exists.');
      }

      const document = buildInitialDocument(filePath, title);
      await fileService.createDocument(filePath, document);

      return { ok: true as const, path: filePath, type };
    } catch (error) {
      console.error('[IPC fs:create] failed', error);
      throw new Error(`CREATE_ENTRY_FAILED: ${getErrorMessage(error)}`);
    }
  });

  ipcMain.handle(IPC_CHANNELS.renameEntry, async (_, targetPath: string, nextName: string) => {
    try {
      const stats = await fs.stat(targetPath);

      if (stats.isDirectory()) {
        const validName = validateEntryName(nextName);
        const nextPath = path.join(path.dirname(targetPath), validName);
        await assertRenameTargetAvailable(targetPath, nextPath);
        await fs.rename(targetPath, nextPath);
        return { ok: true as const, path: nextPath };
      }

      const safeName = sanitizeFileStem(validateEntryName(nextName));
      const nextFileName = ensureFileName(safeName, path.extname(targetPath));
      const nextPath = path.join(path.dirname(targetPath), nextFileName);
      await assertRenameTargetAvailable(targetPath, nextPath);

      if (/\.(md|lzl)$/i.test(targetPath)) {
        const oldAnalysisPath = fileService.toAnalysisPath(targetPath);
        const nextAnalysisPath = fileService.toAnalysisPath(nextPath);

        if (oldAnalysisPath !== nextAnalysisPath && (await fileExists(nextAnalysisPath))) {
          throw new Error(`Target analysis file already exists: ${nextAnalysisPath}`);
        }
      }

      await fs.rename(targetPath, nextPath);

      if (/\.(md|lzl)$/i.test(targetPath)) {
        const oldAnalysisPath = fileService.toAnalysisPath(targetPath);
        const nextAnalysisPath = fileService.toAnalysisPath(nextPath);

        if (oldAnalysisPath !== nextAnalysisPath && (await fileExists(oldAnalysisPath))) {
          await fs.rename(oldAnalysisPath, nextAnalysisPath);
        }
      }

      return { ok: true as const, path: nextPath };
    } catch (error) {
      console.error('[IPC fs:rename] failed', error);
      throw new Error(`RENAME_ENTRY_FAILED: ${getErrorMessage(error)}`);
    }
  });

  ipcMain.handle(IPC_CHANNELS.deleteEntry, async (_, targetPath: string) => {
    try {
      const stats = await fs.stat(targetPath);

      if (stats.isDirectory()) {
        await fs.rm(targetPath, { recursive: true, force: true });
        return { ok: true as const };
      }

      // 削除前に documentId とプロジェクトルートを取得（新形式クリーンアップ用）
      const [documentId, projectRoot] = await Promise.all([
        extractDocumentId(targetPath),
        findProjectRoot(targetPath),
      ]);

      await fs.rm(targetPath, { force: true });

      if (/\.(md|lzl)$/i.test(targetPath)) {
        // 旧サイドカー削除
        const analysisPath = fileService.toAnalysisPath(targetPath);
        await fs.rm(analysisPath, { force: true });
      }

      // 新形式世代ファイル削除
      if (documentId && projectRoot) {
        await deleteAnalysisFiles(projectRoot, documentId);
      }

      return { ok: true as const };
    } catch (error) {
      console.error('[IPC fs:delete] failed', error);
      throw new Error(`DELETE_ENTRY_FAILED: ${getErrorMessage(error)}`);
    }
  });

  ipcMain.handle(IPC_CHANNELS.loadDocument, async (_, filePath: string) => {
    return fileService.load(filePath);
  });

  ipcMain.handle(IPC_CHANNELS.createDocument, async (_, root: string, title: string) => {
    const safeStem = sanitizeFileStem(title);
    const fileName = ensureLzlFileName(safeStem);
    const filePath = path.join(root, fileName);
    const doc = buildInitialDocument(filePath, toTitleFromFileName(fileName));

    if (await fileExists(filePath)) {
      throw new Error('File already exists.');
    }

    await fileService.createDocument(filePath, doc);
    return { filePath, document: doc };
  });

  ipcMain.handle(IPC_CHANNELS.saveDocument, async (_, filePath: string, doc: LiteLizardDocument, revision: number) => {
    return fileService.save(filePath, doc, revision);
  });

  ipcMain.handle(IPC_CHANNELS.loadAnalysisSettings, async () => {
    const [savedSettings, secrets] = await Promise.all([
      analysisSettingsStore.load(),
      apiKeyVault.loadAll(),
    ]);

    return mergeAnalysisSettings(savedSettings, {
      openai: Boolean(secrets.openai?.trim()),
      anthropic: Boolean(secrets.anthropic?.trim()),
    });
  });

  ipcMain.handle(IPC_CHANNELS.saveProviderApiKey, async (_, providerId: string, apiKey: string) => {
    const trimmed = apiKey.trim();
    if (!trimmed) {
      throw new Error('API key must not be empty.');
    }
    await apiKeyVault.save(providerId, trimmed);
    return { ok: true };
  });

  ipcMain.handle(IPC_CHANNELS.clearProviderApiKey, async (_, providerId: string) => {
    await apiKeyVault.clear(providerId);
    return { ok: true };
  });

  ipcMain.handle(IPC_CHANNELS.saveAnalysisSettings, async (_, input: AnalysisSettingsInput) => {
    await analysisSettingsStore.save(input);
    return { ok: true };
  });

  ipcMain.handle(IPC_CHANNELS.testLocalLlmConnection, async (_, input: { endpoint: string; model: string }) => {
    const endpoint = input.endpoint.trim().replace(/\/$/, '');
    const model = input.model.trim();

    if (!endpoint) {
      return { ok: false as const, message: 'エンドポイント URL を入力してください。' };
    }

    if (!model) {
      return { ok: false as const, message: 'モデル名を入力してください。' };
    }

    try {
      const response = await fetch(`${endpoint}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(4_000),
      });

      if (!response.ok) {
        return { ok: false as const, message: `接続先が応答しましたが、状態コード ${response.status} でした。` };
      }

      const payload = await response.json() as { models?: Array<{ name?: string }> };
      const matched = payload.models?.find((entry) => entry.name === model);

      if (!matched) {
        return {
          ok: false as const,
          message: `接続できましたが、モデル「${model}」は見つかりませんでした。`,
        };
      }

      return { ok: true as const, model: matched.name };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { ok: false as const, message: `接続に失敗しました: ${message}` };
    }
  });

  ipcMain.handle(IPC_CHANNELS.runAnalysis, async (_, input: AnalysisRunInput) => {
    const [savedSettings, secrets] = await Promise.all([
      analysisSettingsStore.load(),
      apiKeyVault.loadAll(),
    ]);
    const analysisSettings = mergeAnalysisSettings(savedSettings, {
      openai: Boolean(secrets.openai?.trim()),
      anthropic: Boolean(secrets.anthropic?.trim()),
    });
    const provider = resolveAnalysisProvider(analysisSettings, secrets);
    return runAnalysis(input, provider);
  });

  ipcMain.handle(IPC_CHANNELS.loadAnalysis, async (_, projectRoot: string, documentId: string, filePath?: string) => {
    try {
      const result = await loadLatestAnalysis(projectRoot, documentId);
      if (result) return result;

      // 新形式が存在しない場合、旧サイドカーからマイグレーション
      if (filePath) {
        const v1 = await fileService.readSidecarAnalysis(filePath);
        if (v1) return migrateFromV1(v1);
      }
      return null;
    } catch (error) {
      console.error('[IPC analysis:load] failed', error);
      throw new Error(`LOAD_ANALYSIS_FAILED: ${getErrorMessage(error)}`);
    }
  });

  ipcMain.handle(
    IPC_CHANNELS.saveAnalysisResult,
    async (_, projectRoot: string, documentId: string, paragraphId: string, pattern: ParagraphAnalysisPattern) => {
      try {
        await appendParagraphPattern(projectRoot, documentId, paragraphId, pattern);
      } catch (error) {
        console.error('[IPC analysis:save] failed', error);
        throw new Error(`SAVE_ANALYSIS_FAILED: ${getErrorMessage(error)}`);
      }
    },
  );

  ipcMain.handle(IPC_CHANNELS.createAnalysisGeneration, async (_, projectRoot: string, documentId: string) => {
    try {
      const file = await createGeneration(projectRoot, documentId);
      return file.generation;
    } catch (error) {
      console.error('[IPC analysis:newGeneration] failed', error);
      throw new Error(`CREATE_GENERATION_FAILED: ${getErrorMessage(error)}`);
    }
  });

  ipcMain.handle(IPC_CHANNELS.importTextFile, async (_, createParent: string) => {
    try {
      const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [{ name: 'Text Files', extensions: ['txt', 'md'] }],
      });

      if (result.canceled || result.filePaths.length === 0) {
        return null;
      }

      const sourceFilePath = result.filePaths[0];
      const rawText = await fs.readFile(sourceFilePath, 'utf8');
      const title = toTitleFromFileName(path.basename(sourceFilePath));
      const importResult = parseTextToImportResult(rawText, title);

      const destFileName = ensureLzlFileName(sanitizeFileStem(title));
      const destFilePath = path.join(createParent, destFileName);

      if (await fileExists(destFilePath)) {
        throw new Error(`IMPORT_FILE_ALREADY_EXISTS: ${destFileName}`);
      }

      const document = buildImportedDocument(importResult, destFilePath);
      await fileService.createDocument(destFilePath, document);

      return { ok: true as const, filePath: destFilePath, document };
    } catch (error) {
      console.error('[IPC doc:importText] failed', error);
      throw new Error(`IMPORT_TEXT_FAILED: ${getErrorMessage(error)}`);
    }
  });
}
