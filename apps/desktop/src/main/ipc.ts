import path from 'node:path';
import fs from 'node:fs/promises';
import { app, dialog, ipcMain } from 'electron';
import type { AnalysisRunInput, LiteLizardDocument } from '@litelizard/shared';
import { createFileService } from './fileService.js';
import { createApiKeyVault } from './sessionVault.js';
import { runAnalysis } from './apiBridge.js';
import {
  ensureMarkdownFileName,
  sanitizeFileStem,
  toTitleFromFileName,
  validateEntryName,
} from './ipcPathUtils.js';

const fileService = createFileService();
const apiKeyVault = createApiKeyVault(app.getPath('userData'));

type FsEntryType = 'file' | 'folder';

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }
  return 'Unknown error';
}

function createDocumentId() {
  return `doc_${Math.random().toString(36).slice(2, 10)}`;
}

function createParagraphId() {
  return `p_${Math.random().toString(36).slice(2, 10)}`;
}

function buildInitialDocument(filePath: string, title: string): LiteLizardDocument {
  const now = new Date().toISOString();
  const paragraphText = '新しい段落';

  return {
    version: 1,
    documentId: createDocumentId(),
    title,
    personaMode: 'general-reader',
    createdAt: now,
    updatedAt: now,
    source: {
      format: 'markdown-md',
      originPath: filePath,
    },
    paragraphs: [
      {
        id: createParagraphId(),
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

export function registerIpcHandlers() {
  ipcMain.handle('dialog:openFolder', async () => {
    try {
      const result = await dialog.showOpenDialog({
        properties: ['openDirectory'],
      });

      if (result.canceled || result.filePaths.length === 0) {
        return null;
      }

      return result.filePaths[0];
    } catch (error) {
      console.error('[IPC dialog:openFolder] failed', error);
      throw new Error(`OPEN_FOLDER_FAILED: ${getErrorMessage(error)}`);
    }
  });

  ipcMain.handle('fs:listTree', async (_, root: string) => {
    try {
      return await fileService.listTree(root);
    } catch (error) {
      console.error('[IPC fs:listTree] failed', error);
      throw new Error(`LIST_TREE_FAILED: ${getErrorMessage(error)}`);
    }
  });

  ipcMain.handle('fs:create', async (_, root: string, type: FsEntryType, name: string) => {
    try {
      const validatedName = validateEntryName(name);

      if (type === 'folder') {
        const folderPath = path.join(root, validatedName);
        await fs.mkdir(folderPath);
        return { ok: true as const, path: folderPath, type };
      }

      const fileName = ensureMarkdownFileName(validateEntryName(sanitizeFileStem(validatedName)));
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

  ipcMain.handle('fs:rename', async (_, targetPath: string, nextName: string) => {
    try {
      const stats = await fs.stat(targetPath);

      if (stats.isDirectory()) {
        const validName = validateEntryName(nextName);
        const nextPath = path.join(path.dirname(targetPath), validName);
        await fs.rename(targetPath, nextPath);
        return { ok: true as const, path: nextPath };
      }

      const safeName = sanitizeFileStem(validateEntryName(nextName));
      const nextFileName = ensureMarkdownFileName(safeName);
      const nextPath = path.join(path.dirname(targetPath), nextFileName);

      await fs.rename(targetPath, nextPath);

      if (targetPath.endsWith('.md')) {
        const oldAnalysisPath = fileService.toAnalysisPath(targetPath);
        const nextAnalysisPath = fileService.toAnalysisPath(nextPath);

        if (await fileExists(oldAnalysisPath)) {
          await fs.rename(oldAnalysisPath, nextAnalysisPath);
        }
      }

      return { ok: true as const, path: nextPath };
    } catch (error) {
      console.error('[IPC fs:rename] failed', error);
      throw new Error(`RENAME_ENTRY_FAILED: ${getErrorMessage(error)}`);
    }
  });

  ipcMain.handle('fs:delete', async (_, targetPath: string) => {
    try {
      const stats = await fs.stat(targetPath);

      if (stats.isDirectory()) {
        await fs.rm(targetPath, { recursive: true, force: true });
        return { ok: true as const };
      }

      await fs.rm(targetPath, { force: true });

      if (targetPath.endsWith('.md')) {
        const analysisPath = fileService.toAnalysisPath(targetPath);
        await fs.rm(analysisPath, { force: true });
      }

      return { ok: true as const };
    } catch (error) {
      console.error('[IPC fs:delete] failed', error);
      throw new Error(`DELETE_ENTRY_FAILED: ${getErrorMessage(error)}`);
    }
  });

  ipcMain.handle('doc:load', async (_, filePath: string) => {
    return fileService.load(filePath);
  });

  ipcMain.handle('doc:create', async (_, root: string, title: string) => {
    const safeStem = sanitizeFileStem(title);
    const fileName = ensureMarkdownFileName(safeStem);
    const filePath = path.join(root, fileName);
    const doc = buildInitialDocument(filePath, toTitleFromFileName(fileName));

    if (await fileExists(filePath)) {
      throw new Error('File already exists.');
    }

    await fileService.createDocument(filePath, doc);
    return { filePath, document: doc };
  });

  ipcMain.handle('doc:save', async (_, filePath: string, doc: LiteLizardDocument, revision: number) => {
    return fileService.save(filePath, doc, revision);
  });

  ipcMain.handle('settings:apiKey:getStatus', async () => {
    const apiKey = await apiKeyVault.load();
    return { configured: Boolean(apiKey?.trim()) };
  });

  ipcMain.handle('settings:apiKey:save', async (_, apiKey: string) => {
    const trimmed = apiKey.trim();
    if (!trimmed) {
      throw new Error('API key must not be empty.');
    }
    await apiKeyVault.save(trimmed);
    return { ok: true };
  });

  ipcMain.handle('settings:apiKey:clear', async () => {
    await apiKeyVault.clear();
    return { ok: true };
  });

  ipcMain.handle('analysis:run', async (_, input: AnalysisRunInput) => {
    const apiKey = await apiKeyVault.load();
    if (!apiKey) {
      throw new Error('API key is not configured. Open Settings and save your API key.');
    }
    return runAnalysis(input, apiKey);
  });
}
