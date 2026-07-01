import path from 'node:path';
import fs from 'node:fs/promises';
import { app, dialog, ipcMain, shell } from 'electron';
import { fetchLatestRelease, RELEASE_DOWNLOAD_URL, RELEASES_PAGE_URL } from './updateChecker.js';
import {
  buildImportedDocument,
  createChapterId,
  createDocumentId,
  createParagraphId,
  exportDocumentToPlainText,
  IPC_CHANNELS,
  type AnalysisProgressEvent,
  parseTextToImportResult,
  type AnalysisRunInput,
  type AnalysisSettingsInput,
  type LiteLizardDocument,
  type ParagraphAnalysisPattern,
  type ReadingAgentDryRunInput,
  type ReadingAgentInput,
} from '@litelizard/shared';
import { createFileService } from './fileService.js';
import { createApiKeyVault } from './sessionVault.js';
import { dryRunReadingAgent, runAnalysis } from './apiBridge.js';
import { createAnalysisSettingsStore, mergeAnalysisSettings } from './analysisSettingsStore.js';
import { resolveAnalysisProvider } from './analysisProvider.js';
import { createReadingAgentStore } from './agentStore.js';
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
import { assertProjectLocationSafe, assertProjectWritable, ensureProject } from './projectManager.js';
import {
  getActiveReadingAgentId,
  getLastOpenedFolder,
  getRecentProjects,
  removeRecentProject,
  setActiveReadingAgentId,
  setLastOpenedFolder,
} from './appStore.js';

const fileService = createFileService();
const apiKeyVault = createApiKeyVault(app.getPath('userData'));
const analysisSettingsStore = createAnalysisSettingsStore(app.getPath('userData'));
const readingAgentStore = createReadingAgentStore(app.getPath('userData'));

type FsEntryType = 'file' | 'folder';

const DOCUMENT_ID_PATTERN = /^d_[a-z0-9]{10}$/;
const PARAGRAPH_ID_PATTERN = /^p_[a-z0-9]{10}$/;

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

async function realpathIfExists(filePath: string): Promise<string | null> {
  try {
    return await fs.realpath(filePath);
  } catch {
    return null;
  }
}

function isInsideOrSamePath(root: string, targetPath: string) {
  const relative = path.relative(root, targetPath);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

async function assertResolvedInsideProject(projectRoot: string, targetPath: string) {
  const resolvedRoot = path.resolve(projectRoot);
  const resolvedTarget = path.resolve(targetPath);
  if (!isInsideOrSamePath(resolvedRoot, resolvedTarget)) {
    throw new Error(`Path is outside the project root: ${targetPath}`);
  }

  const realRoot = await fs.realpath(resolvedRoot);
  const realTarget = await realpathIfExists(resolvedTarget);
  if (realTarget && !isInsideOrSamePath(realRoot, realTarget)) {
    throw new Error(`Path resolves outside the project root: ${targetPath}`);
  }
}

/** ファイルパスからプロジェクトルートを上方向に探す（.litelizard/config.json の有無で判定）。 */
async function findProjectRoot(filePath: string, options: { includeSelf?: boolean } = {}): Promise<string | null> {
  let current = options.includeSelf ? filePath : path.dirname(filePath);
  const root = path.parse(current).root;
  while (true) {
    try {
      await fs.access(path.join(current, '.litelizard', 'config.json'));
      return current;
    } catch {
      if (current === root) {
        return null;
      }
      current = path.dirname(current);
    }
  }
}

async function assertProjectRoot(projectRoot: string): Promise<string> {
  const resolvedRoot = path.resolve(projectRoot);
  const detectedRoot = await findProjectRoot(resolvedRoot, { includeSelf: true });
  if (!detectedRoot || path.resolve(detectedRoot) !== resolvedRoot) {
    throw new Error(`Project root is invalid: ${projectRoot}`);
  }
  await assertProjectLocationSafe(resolvedRoot);
  await fs.realpath(resolvedRoot);
  return resolvedRoot;
}

async function assertPathInsideDetectedProject(targetPath: string): Promise<{ projectRoot: string; path: string }> {
  const resolvedPath = path.resolve(targetPath);
  const projectRoot = await findProjectRoot(resolvedPath, { includeSelf: true });
  if (!projectRoot) {
    throw new Error(`Project root was not found for path: ${targetPath}`);
  }
  await assertResolvedInsideProject(projectRoot, resolvedPath);
  return { projectRoot: path.resolve(projectRoot), path: resolvedPath };
}

async function assertPathInsideProject(projectRoot: string, targetPath: string): Promise<string> {
  const resolvedRoot = await assertProjectRoot(projectRoot);
  const resolvedPath = path.resolve(targetPath);
  await assertResolvedInsideProject(resolvedRoot, resolvedPath);
  return resolvedPath;
}

function assertDocumentId(documentId: string) {
  if (!DOCUMENT_ID_PATTERN.test(documentId)) {
    throw new Error(`Invalid documentId: ${documentId}`);
  }
}

function assertParagraphId(paragraphId: string) {
  if (!PARAGRAPH_ID_PATTERN.test(paragraphId)) {
    throw new Error(`Invalid paragraphId: ${paragraphId}`);
  }
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

async function collectDocumentIdsInDirectory(directoryPath: string): Promise<string[]> {
  const documentIds = new Set<string>();
  const pendingDirectories = [directoryPath];

  while (pendingDirectories.length > 0) {
    const currentDirectory = pendingDirectories.pop()!;
    const entries = await fs.readdir(currentDirectory, { withFileTypes: true });

    for (const entry of entries) {
      const entryPath = path.join(currentDirectory, entry.name);
      if (entry.isDirectory()) {
        pendingDirectories.push(entryPath);
        continue;
      }
      if (!entry.isFile() || !/\.(md|lzl)$/i.test(entry.name)) {
        continue;
      }

      const documentId = await extractDocumentId(entryPath);
      if (documentId && DOCUMENT_ID_PATTERN.test(documentId)) {
        documentIds.add(documentId);
      }
    }
  }

  return [...documentIds];
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
        properties: ['openDirectory', 'createDirectory'],
        buttonLabel: 'このフォルダを開く',
        message: 'LiteLizard の作業フォルダを選ぶか、新しいフォルダを作成してください。',
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

  ipcMain.handle(IPC_CHANNELS.getRecentProjects, async () => {
    return getRecentProjects();
  });

  ipcMain.handle(IPC_CHANNELS.removeRecentProject, async (_, folderPath: string) => {
    await removeRecentProject(folderPath);
    return { ok: true as const };
  });

  ipcMain.handle(IPC_CHANNELS.listTree, async (_, root: string) => {
    try {
      const projectRoot = await assertProjectRoot(root);
      await assertProjectWritable(projectRoot);
      return await fileService.listTree(projectRoot);
    } catch (error) {
      console.error('[IPC fs:listTree] failed', error);
      throw new Error(`LIST_TREE_FAILED: ${getErrorMessage(error)}`);
    }
  });

  ipcMain.handle(IPC_CHANNELS.createEntry, async (_, root: string, type: FsEntryType, name: string) => {
    try {
      const validatedParent = await assertPathInsideDetectedProject(root);
      const parentPath = validatedParent.path;
      const validatedName = validateEntryName(name);

      if (type === 'folder') {
        const folderPath = path.join(parentPath, validatedName);
        await assertResolvedInsideProject(validatedParent.projectRoot, folderPath);
        await fs.mkdir(folderPath);
        return { ok: true as const, path: folderPath, type };
      }

      const fileName = ensureLzlFileName(validateEntryName(sanitizeFileStem(validatedName)));
      const filePath = path.join(parentPath, fileName);
      await assertResolvedInsideProject(validatedParent.projectRoot, filePath);
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
      const validatedTarget = await assertPathInsideDetectedProject(targetPath);
      const stats = await fs.stat(validatedTarget.path);

      if (stats.isDirectory()) {
        const validName = validateEntryName(nextName);
        const nextPath = path.join(path.dirname(validatedTarget.path), validName);
        await assertResolvedInsideProject(validatedTarget.projectRoot, nextPath);
        await assertRenameTargetAvailable(validatedTarget.path, nextPath);
        await fs.rename(validatedTarget.path, nextPath);
        return { ok: true as const, path: nextPath };
      }

      const safeName = sanitizeFileStem(validateEntryName(nextName));
      const nextFileName = ensureFileName(safeName, path.extname(validatedTarget.path));
      const nextPath = path.join(path.dirname(validatedTarget.path), nextFileName);
      await assertResolvedInsideProject(validatedTarget.projectRoot, nextPath);
      await assertRenameTargetAvailable(validatedTarget.path, nextPath);

      if (/\.(md|lzl)$/i.test(validatedTarget.path)) {
        const oldAnalysisPath = fileService.toAnalysisPath(validatedTarget.path);
        const nextAnalysisPath = fileService.toAnalysisPath(nextPath);

        if (oldAnalysisPath !== nextAnalysisPath && (await fileExists(nextAnalysisPath))) {
          throw new Error(`Target analysis file already exists: ${nextAnalysisPath}`);
        }
      }

      await fs.rename(validatedTarget.path, nextPath);

      if (/\.(md|lzl)$/i.test(validatedTarget.path)) {
        const oldAnalysisPath = fileService.toAnalysisPath(validatedTarget.path);
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

  ipcMain.handle(IPC_CHANNELS.moveEntry, async (_, sourcePath: string, destinationFolderPath: string) => {
    try {
      const validatedSource = await assertPathInsideDetectedProject(sourcePath);
      const validatedDestination = await assertPathInsideDetectedProject(destinationFolderPath);

      if (validatedSource.projectRoot !== validatedDestination.projectRoot) {
        throw new Error('Destination must be inside the same project root.');
      }

      const sourceStats = await fs.stat(validatedSource.path);
      if (sourceStats.isDirectory()) {
        throw new Error('Folders cannot be moved with this operation.');
      }

      const destinationStats = await fs.stat(validatedDestination.path);
      if (!destinationStats.isDirectory()) {
        throw new Error('Destination must be a folder.');
      }

      const nextPath = path.join(validatedDestination.path, path.basename(validatedSource.path));
      await assertResolvedInsideProject(validatedSource.projectRoot, nextPath);
      await assertRenameTargetAvailable(validatedSource.path, nextPath);

      if (/\.(md|lzl)$/i.test(validatedSource.path)) {
        const oldAnalysisPath = fileService.toAnalysisPath(validatedSource.path);
        const nextAnalysisPath = fileService.toAnalysisPath(nextPath);

        if (oldAnalysisPath !== nextAnalysisPath && (await fileExists(nextAnalysisPath))) {
          throw new Error(`Target analysis file already exists: ${nextAnalysisPath}`);
        }
      }

      await fs.rename(validatedSource.path, nextPath);

      if (/\.(md|lzl)$/i.test(validatedSource.path)) {
        const oldAnalysisPath = fileService.toAnalysisPath(validatedSource.path);
        const nextAnalysisPath = fileService.toAnalysisPath(nextPath);

        if (oldAnalysisPath !== nextAnalysisPath && (await fileExists(oldAnalysisPath))) {
          await fs.rename(oldAnalysisPath, nextAnalysisPath);
        }
      }

      return { ok: true as const, path: nextPath };
    } catch (error) {
      console.error('[IPC fs:move] failed', error);
      throw new Error(`MOVE_ENTRY_FAILED: ${getErrorMessage(error)}`);
    }
  });

  ipcMain.handle(IPC_CHANNELS.deleteEntry, async (_, targetPath: string) => {
    try {
      const validatedTarget = await assertPathInsideDetectedProject(targetPath);
      const stats = await fs.stat(validatedTarget.path);

      if (stats.isDirectory()) {
        const documentIds = await collectDocumentIdsInDirectory(validatedTarget.path);
        await fs.rm(validatedTarget.path, { recursive: true, force: true });
        await Promise.all(
          documentIds.map((documentId) => deleteAnalysisFiles(validatedTarget.projectRoot, documentId)),
        );
        return { ok: true as const };
      }

      // 削除前に documentId とプロジェクトルートを取得（新形式クリーンアップ用）
      const documentId = await extractDocumentId(validatedTarget.path);

      await fs.rm(validatedTarget.path, { force: true });

      if (/\.(md|lzl)$/i.test(validatedTarget.path)) {
        // 旧サイドカー削除
        const analysisPath = fileService.toAnalysisPath(validatedTarget.path);
        await fs.rm(analysisPath, { force: true });
      }

      // 新形式世代ファイル削除
      if (documentId && DOCUMENT_ID_PATTERN.test(documentId)) {
        await deleteAnalysisFiles(validatedTarget.projectRoot, documentId);
      }

      return { ok: true as const };
    } catch (error) {
      console.error('[IPC fs:delete] failed', error);
      throw new Error(`DELETE_ENTRY_FAILED: ${getErrorMessage(error)}`);
    }
  });

  ipcMain.handle(IPC_CHANNELS.loadDocument, async (_, filePath: string) => {
    const validatedFilePath = (await assertPathInsideDetectedProject(filePath)).path;
    return fileService.load(validatedFilePath);
  });

  ipcMain.handle(IPC_CHANNELS.createDocument, async (_, root: string, title: string) => {
    const validatedParent = await assertPathInsideDetectedProject(root);
    const parentPath = validatedParent.path;
    const safeStem = sanitizeFileStem(title);
    const fileName = ensureLzlFileName(safeStem);
    const filePath = path.join(parentPath, fileName);
    await assertResolvedInsideProject(validatedParent.projectRoot, filePath);
    const doc = buildInitialDocument(filePath, toTitleFromFileName(fileName));

    if (await fileExists(filePath)) {
      throw new Error('File already exists.');
    }

    await fileService.createDocument(filePath, doc);
    return { filePath, document: doc };
  });

  ipcMain.handle(IPC_CHANNELS.saveDocument, async (_, filePath: string, doc: LiteLizardDocument, revision: number) => {
    const validatedFilePath = (await assertPathInsideDetectedProject(filePath)).path;
    return fileService.save(validatedFilePath, doc, revision);
  });

  ipcMain.handle(IPC_CHANNELS.exportDocumentText, async (_, filePath: string | null, doc: LiteLizardDocument) => {
    try {
      const defaultFileName = `${sanitizeFileStem(doc.title)}.txt`;
      const defaultPath = filePath
        ? path.join(path.dirname((await assertPathInsideDetectedProject(filePath)).path), defaultFileName)
        : defaultFileName;
      const result = await dialog.showSaveDialog({
        defaultPath,
        filters: [{ name: 'Text Files', extensions: ['txt'] }],
      });

      if (result.canceled || !result.filePath) {
        return null;
      }

      const outputPath = path.extname(result.filePath) ? result.filePath : `${result.filePath}.txt`;
      await fs.writeFile(outputPath, exportDocumentToPlainText(doc), 'utf8');
      return { ok: true as const, filePath: outputPath };
    } catch (error) {
      console.error('[IPC doc:exportText] failed', error);
      throw new Error(`EXPORT_TEXT_FAILED: ${getErrorMessage(error)}`);
    }
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

  ipcMain.handle(IPC_CHANNELS.runAnalysis, async (event, input: AnalysisRunInput) => {
    const [savedSettings, secrets, agent] = await Promise.all([
      analysisSettingsStore.load(),
      apiKeyVault.loadAll(),
      readingAgentStore.get(input.agentId),
    ]);
    if (!agent) {
      throw new Error(`Reading Agent が見つかりません: ${input.agentId}`);
    }
    const analysisSettings = mergeAnalysisSettings(savedSettings, {
      openai: Boolean(secrets.openai?.trim()),
      anthropic: Boolean(secrets.anthropic?.trim()),
    });
    const provider = resolveAnalysisProvider(analysisSettings, secrets);
    return runAnalysis(
      input,
      provider,
      agent,
      (result) => {
        event.sender.send(IPC_CHANNELS.analysisProgress, {
          paragraphId: result.paragraphId,
          result,
        } satisfies AnalysisProgressEvent);
      },
      agent.contextPolicy,
    );
  });

  ipcMain.handle(IPC_CHANNELS.loadAnalysis, async (_, projectRoot: string, documentId: string, filePath?: string) => {
    try {
      const validatedProjectRoot = await assertProjectRoot(projectRoot);
      assertDocumentId(documentId);
      const result = await loadLatestAnalysis(validatedProjectRoot, documentId);
      if (result) return result;

      // 新形式が存在しない場合、旧サイドカーからマイグレーション
      if (filePath) {
        const validatedFilePath = await assertPathInsideProject(validatedProjectRoot, filePath);
        const v1 = await fileService.readSidecarAnalysis(validatedFilePath);
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
        const validatedProjectRoot = await assertProjectRoot(projectRoot);
        assertDocumentId(documentId);
        assertParagraphId(paragraphId);
        await appendParagraphPattern(validatedProjectRoot, documentId, paragraphId, pattern);
      } catch (error) {
        console.error('[IPC analysis:save] failed', error);
        throw new Error(`SAVE_ANALYSIS_FAILED: ${getErrorMessage(error)}`);
      }
    },
  );

  ipcMain.handle(IPC_CHANNELS.createAnalysisGeneration, async (_, projectRoot: string, documentId: string) => {
    try {
      const validatedProjectRoot = await assertProjectRoot(projectRoot);
      assertDocumentId(documentId);
      const file = await createGeneration(validatedProjectRoot, documentId);
      return file.generation;
    } catch (error) {
      console.error('[IPC analysis:newGeneration] failed', error);
      throw new Error(`CREATE_GENERATION_FAILED: ${getErrorMessage(error)}`);
    }
  });

  ipcMain.handle(IPC_CHANNELS.importTextFile, async (_, createParent: string) => {
    try {
      const validatedParent = await assertPathInsideDetectedProject(createParent);
      const parentPath = validatedParent.path;
      const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [{ name: 'Text Files', extensions: ['txt', 'md'] }],
      });

      if (result.canceled || result.filePaths.length === 0) {
        return null;
      }

      const sourceFilePath = result.filePaths[0];
      const rawText = await fs.readFile(sourceFilePath, 'utf8');
      const baseName = path.basename(sourceFilePath);
      const title = baseName.replace(/\.[^.]+$/, '') || baseName;
      const importResult = parseTextToImportResult(rawText, title);

      const destFileName = ensureLzlFileName(sanitizeFileStem(title));
      const destFilePath = path.join(parentPath, destFileName);
      await assertResolvedInsideProject(validatedParent.projectRoot, destFilePath);

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

  ipcMain.handle(IPC_CHANNELS.getActiveReadingAgentId, async () => {
    return getActiveReadingAgentId();
  });

  ipcMain.handle(IPC_CHANNELS.setActiveReadingAgentId, async (_, id: string) => {
    await setActiveReadingAgentId(id);
    return { ok: true as const };
  });

  ipcMain.handle(IPC_CHANNELS.listReadingAgents, async () => {
    try {
      return await readingAgentStore.list();
    } catch (error) {
      console.error('[IPC agents:list] failed', error);
      throw new Error(`LIST_READING_AGENTS_FAILED: ${getErrorMessage(error)}`);
    }
  });

  ipcMain.handle(IPC_CHANNELS.listReadingAgentTemplates, async () => {
    try {
      return readingAgentStore.listTemplates();
    } catch (error) {
      console.error('[IPC agents:templates:list] failed', error);
      throw new Error(`LIST_READING_AGENT_TEMPLATES_FAILED: ${getErrorMessage(error)}`);
    }
  });

  ipcMain.handle(IPC_CHANNELS.addReadingAgentFromTemplate, async (_, templateId: string) => {
    try {
      return await readingAgentStore.addFromTemplate(templateId);
    } catch (error) {
      console.error('[IPC agents:templates:add] failed', error);
      throw new Error(`ADD_READING_AGENT_FROM_TEMPLATE_FAILED: ${getErrorMessage(error)}`);
    }
  });

  ipcMain.handle(IPC_CHANNELS.getReadingAgent, async (_, id: string) => {
    try {
      return await readingAgentStore.get(id);
    } catch (error) {
      console.error('[IPC agents:get] failed', error);
      throw new Error(`GET_READING_AGENT_FAILED: ${getErrorMessage(error)}`);
    }
  });

  ipcMain.handle(IPC_CHANNELS.saveReadingAgent, async (_, input: ReadingAgentInput & { id?: string }) => {
    try {
      return await readingAgentStore.save(input);
    } catch (error) {
      console.error('[IPC agents:save] failed', error);
      throw new Error(`SAVE_READING_AGENT_FAILED: ${getErrorMessage(error)}`);
    }
  });

  ipcMain.handle(IPC_CHANNELS.deleteReadingAgent, async (_, id: string) => {
    try {
      await readingAgentStore.delete(id);
      return { ok: true as const };
    } catch (error) {
      console.error('[IPC agents:delete] failed', error);
      throw new Error(`DELETE_READING_AGENT_FAILED: ${getErrorMessage(error)}`);
    }
  });

  ipcMain.handle(IPC_CHANNELS.resetReadingAgents, async () => {
    try {
      return await readingAgentStore.resetToDefaults();
    } catch (error) {
      console.error('[IPC agents:reset] failed', error);
      throw new Error(`RESET_READING_AGENTS_FAILED: ${getErrorMessage(error)}`);
    }
  });

  ipcMain.handle(IPC_CHANNELS.getAppVersion, async () => app.getVersion());

  ipcMain.handle(IPC_CHANNELS.checkForUpdates, async () => {
    const currentVersion = app.getVersion();
    return fetchLatestRelease(currentVersion, { signal: AbortSignal.timeout(5_000) });
  });

  ipcMain.handle(IPC_CHANNELS.openReleasesPage, async () => {
    await shell.openExternal(RELEASES_PAGE_URL);
    return { ok: true as const };
  });

  ipcMain.handle(IPC_CHANNELS.downloadLatestRelease, async () => {
    await shell.openExternal(RELEASE_DOWNLOAD_URL);
    return { ok: true as const };
  });

  ipcMain.handle(IPC_CHANNELS.dryRunReadingAgent, async (_, input: ReadingAgentDryRunInput) => {
    try {
      const [savedSettings, secrets] = await Promise.all([
        analysisSettingsStore.load(),
        apiKeyVault.loadAll(),
      ]);
      const analysisSettings = mergeAnalysisSettings(savedSettings, {
        openai: Boolean(secrets.openai?.trim()),
        anthropic: Boolean(secrets.anthropic?.trim()),
      });
      const provider = resolveAnalysisProvider(analysisSettings, secrets);
      return await dryRunReadingAgent(input, provider);
    } catch (error) {
      console.error('[IPC agents:dryRun] failed', error);
      throw new Error(`DRY_RUN_READING_AGENT_FAILED: ${getErrorMessage(error)}`);
    }
  });
}
