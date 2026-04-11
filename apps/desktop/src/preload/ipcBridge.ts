import { ipcRenderer } from 'electron';
import type { BridgeApi } from '@litelizard/shared';
import { IPC_CHANNELS } from '@litelizard/shared';

export function createIpcBridge(): BridgeApi {
  return {
    openFolder: () => ipcRenderer.invoke(IPC_CHANNELS.openFolder),
    listTree: (root) => ipcRenderer.invoke(IPC_CHANNELS.listTree, root),
    createEntry: (root, type, name) =>
      ipcRenderer.invoke(IPC_CHANNELS.createEntry, root, type, name),
    renameEntry: (targetPath, nextName) =>
      ipcRenderer.invoke(IPC_CHANNELS.renameEntry, targetPath, nextName),
    deleteEntry: (targetPath) =>
      ipcRenderer.invoke(IPC_CHANNELS.deleteEntry, targetPath),
    loadDocument: (filePath) =>
      ipcRenderer.invoke(IPC_CHANNELS.loadDocument, filePath),
    createDocument: (root, title) =>
      ipcRenderer.invoke(IPC_CHANNELS.createDocument, root, title),
    saveDocument: (filePath, doc, revision) =>
      ipcRenderer.invoke(IPC_CHANNELS.saveDocument, filePath, doc, revision),
    runAnalysis: (input) =>
      ipcRenderer.invoke(IPC_CHANNELS.runAnalysis, input),
    loadAnalysis: (projectRoot, documentId, filePath) =>
      ipcRenderer.invoke(IPC_CHANNELS.loadAnalysis, projectRoot, documentId, filePath),
    saveAnalysisResult: (projectRoot, documentId, paragraphId, pattern) =>
      ipcRenderer.invoke(IPC_CHANNELS.saveAnalysisResult, projectRoot, documentId, paragraphId, pattern),
    createAnalysisGeneration: (projectRoot, documentId) =>
      ipcRenderer.invoke(IPC_CHANNELS.createAnalysisGeneration, projectRoot, documentId),
    getApiKeyStatus: () =>
      ipcRenderer.invoke(IPC_CHANNELS.getApiKeyStatus),
    saveApiKey: (apiKey) =>
      ipcRenderer.invoke(IPC_CHANNELS.saveApiKey, apiKey),
    clearApiKey: () =>
      ipcRenderer.invoke(IPC_CHANNELS.clearApiKey),
  };
}
