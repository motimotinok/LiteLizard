import path from 'node:path';
import fs from 'node:fs/promises';
import { app, dialog, ipcMain } from 'electron';
import type { AnalysisRunInput, LiteLizardDocument } from '@litelizard/shared';
import { createFileService } from './fileService.js';
import { createApiKeyVault } from './sessionVault.js';
import { runAnalysis } from './apiBridge.js';

const fileService = createFileService();
const apiKeyVault = createApiKeyVault(app.getPath('userData'));

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }
  return 'Unknown error';
}

function validateFolderName(input: string) {
  const name = input.trim();
  if (!name) {
    throw new Error('Folder name is required.');
  }
  if (name === '.' || name === '..') {
    throw new Error('Folder name is invalid.');
  }
  if (name.includes('/') || name.includes('\\')) {
    throw new Error('Folder name must not contain path separators.');
  }
  return name;
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

  ipcMain.handle('fs:createFolder', async (_, root: string, name: string) => {
    try {
      const validatedName = validateFolderName(name);
      const folderPath = path.join(root, validatedName);
      await fs.mkdir(folderPath);
      return { ok: true as const, path: folderPath };
    } catch (error) {
      console.error('[IPC fs:createFolder] failed', error);
      throw new Error(`CREATE_FOLDER_FAILED: ${getErrorMessage(error)}`);
    }
  });

  ipcMain.handle('doc:load', async (_, filePath: string) => {
    return fileService.load(filePath);
  });

  ipcMain.handle('doc:create', async (_, root: string, title: string) => {
    const documentId = `doc_${Math.random().toString(36).slice(2, 10)}`;
    const paragraphId = `p_${Math.random().toString(36).slice(2, 10)}`;
    const now = new Date().toISOString();
    const safeTitle = title.trim() || 'Untitled';
    const fileName = `${safeTitle.replace(/[^a-zA-Z0-9-_]/g, '_')}.litelizard.json`;
    const filePath = path.join(root, fileName);

    const doc: LiteLizardDocument = {
      version: 1,
      documentId,
      title: safeTitle,
      personaMode: 'general-reader',
      createdAt: now,
      updatedAt: now,
      source: {
        format: 'litelizard-json',
        originPath: filePath,
      },
      paragraphs: [
        {
          id: paragraphId,
          order: 1,
          light: {
            text: '新しい段落',
            charCount: '新しい段落'.length,
          },
          lizard: {
            status: 'stale',
          },
        },
      ],
    };

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
