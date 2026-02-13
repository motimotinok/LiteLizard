import path from 'node:path';
import { app, dialog, ipcMain } from 'electron';
import type { AnalysisRunInput, LiteLizardDocument } from '@litelizard/shared';
import { createFileService } from './fileService.js';
import { createSessionVault } from './sessionVault.js';
import { authRequestEmailLink, authVerifyEmailLink, getUsage, runAnalysis } from './apiBridge.js';

const fileService = createFileService();
const sessionVault = createSessionVault(app.getPath('userData'));

export function registerIpcHandlers() {
  ipcMain.handle('dialog:openFolder', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    return result.filePaths[0];
  });

  ipcMain.handle('fs:listTree', async (_, root: string) => {
    return fileService.listTree(root);
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

  ipcMain.handle('auth:getSession', async () => {
    return sessionVault.load();
  });

  ipcMain.handle('auth:requestEmailLink', async (_, email: string) => {
    return authRequestEmailLink(email);
  });

  ipcMain.handle('auth:verifyEmailLink', async (_, email: string, code: string, requestId: string) => {
    const session = await authVerifyEmailLink(email, code, requestId);
    await sessionVault.save(session);
    return session;
  });

  ipcMain.handle('auth:logout', async () => {
    await sessionVault.clear();
    return { ok: true };
  });

  ipcMain.handle('analysis:run', async (_, input: AnalysisRunInput, accessToken: string) => {
    return runAnalysis(input, accessToken);
  });

  ipcMain.handle('usage:get', async (_, accessToken: string) => {
    return getUsage(accessToken);
  });
}
