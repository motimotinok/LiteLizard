import { ipcRenderer } from 'electron';
import type { AnalysisProgressEvent, BridgeApi } from '@litelizard/shared';
import { IPC_CHANNELS } from '@litelizard/shared';

export function createIpcBridge(): BridgeApi {
  return {
    openFolder: () => ipcRenderer.invoke(IPC_CHANNELS.openFolder),
    getLastOpenedFolder: () => ipcRenderer.invoke(IPC_CHANNELS.getLastOpenedFolder),
    setLastOpenedFolder: (folderPath) => ipcRenderer.invoke(IPC_CHANNELS.setLastOpenedFolder, folderPath),
    getRecentProjects: () => ipcRenderer.invoke(IPC_CHANNELS.getRecentProjects),
    removeRecentProject: (folderPath) =>
      ipcRenderer.invoke(IPC_CHANNELS.removeRecentProject, folderPath),
    onRequestOpenFolder: (listener) => {
      const wrapped = () => {
        listener();
      };
      ipcRenderer.on(IPC_CHANNELS.requestOpenFolder, wrapped);
      return () => {
        ipcRenderer.removeListener(IPC_CHANNELS.requestOpenFolder, wrapped);
      };
    },
    listTree: (root) => ipcRenderer.invoke(IPC_CHANNELS.listTree, root),
    createEntry: (root, type, name) =>
      ipcRenderer.invoke(IPC_CHANNELS.createEntry, root, type, name),
    renameEntry: (targetPath, nextName) =>
      ipcRenderer.invoke(IPC_CHANNELS.renameEntry, targetPath, nextName),
    moveEntry: (sourcePath, destinationFolderPath) =>
      ipcRenderer.invoke(IPC_CHANNELS.moveEntry, sourcePath, destinationFolderPath),
    deleteEntry: (targetPath) =>
      ipcRenderer.invoke(IPC_CHANNELS.deleteEntry, targetPath),
    loadDocument: (filePath) =>
      ipcRenderer.invoke(IPC_CHANNELS.loadDocument, filePath),
    createDocument: (root, title) =>
      ipcRenderer.invoke(IPC_CHANNELS.createDocument, root, title),
    saveDocument: (filePath, doc, revision) =>
      ipcRenderer.invoke(IPC_CHANNELS.saveDocument, filePath, doc, revision),
    exportDocumentText: (filePath, doc) =>
      ipcRenderer.invoke(IPC_CHANNELS.exportDocumentText, filePath, doc),
    runAnalysis: (input) =>
      ipcRenderer.invoke(IPC_CHANNELS.runAnalysis, input),
    loadAnalysis: (projectRoot, documentId, filePath) =>
      ipcRenderer.invoke(IPC_CHANNELS.loadAnalysis, projectRoot, documentId, filePath),
    saveAnalysisResult: (projectRoot, documentId, paragraphId, pattern) =>
      ipcRenderer.invoke(IPC_CHANNELS.saveAnalysisResult, projectRoot, documentId, paragraphId, pattern),
    createAnalysisGeneration: (projectRoot, documentId) =>
      ipcRenderer.invoke(IPC_CHANNELS.createAnalysisGeneration, projectRoot, documentId),
    loadAnalysisSettings: () =>
      ipcRenderer.invoke(IPC_CHANNELS.loadAnalysisSettings),
    saveProviderApiKey: (providerId, apiKey) =>
      ipcRenderer.invoke(IPC_CHANNELS.saveProviderApiKey, providerId, apiKey),
    clearProviderApiKey: (providerId) =>
      ipcRenderer.invoke(IPC_CHANNELS.clearProviderApiKey, providerId),
    saveAnalysisSettings: (input) =>
      ipcRenderer.invoke(IPC_CHANNELS.saveAnalysisSettings, input),
    testLocalLlmConnection: (input) =>
      ipcRenderer.invoke(IPC_CHANNELS.testLocalLlmConnection, input),
    onAnalysisProgress: (listener) => {
      const wrapped = (_: unknown, event: AnalysisProgressEvent) => listener(event);
      ipcRenderer.on(IPC_CHANNELS.analysisProgress, wrapped);
      return () => {
        ipcRenderer.removeListener(IPC_CHANNELS.analysisProgress, wrapped);
      };
    },
    importTextFile: (createParent) =>
      ipcRenderer.invoke(IPC_CHANNELS.importTextFile, createParent),
    getActiveReadingAgentId: () =>
      ipcRenderer.invoke(IPC_CHANNELS.getActiveReadingAgentId),
    setActiveReadingAgentId: (id) =>
      ipcRenderer.invoke(IPC_CHANNELS.setActiveReadingAgentId, id),
    listReadingAgents: () =>
      ipcRenderer.invoke(IPC_CHANNELS.listReadingAgents),
    listReadingAgentTemplates: () =>
      ipcRenderer.invoke(IPC_CHANNELS.listReadingAgentTemplates),
    addReadingAgentFromTemplate: (templateId) =>
      ipcRenderer.invoke(IPC_CHANNELS.addReadingAgentFromTemplate, templateId),
    getReadingAgent: (id) =>
      ipcRenderer.invoke(IPC_CHANNELS.getReadingAgent, id),
    saveReadingAgent: (input) =>
      ipcRenderer.invoke(IPC_CHANNELS.saveReadingAgent, input),
    deleteReadingAgent: (id) =>
      ipcRenderer.invoke(IPC_CHANNELS.deleteReadingAgent, id),
    resetReadingAgents: () =>
      ipcRenderer.invoke(IPC_CHANNELS.resetReadingAgents),
    dryRunReadingAgent: (input) =>
      ipcRenderer.invoke(IPC_CHANNELS.dryRunReadingAgent, input),
    getAppVersion: () => ipcRenderer.invoke(IPC_CHANNELS.getAppVersion),
    checkForUpdates: () => ipcRenderer.invoke(IPC_CHANNELS.checkForUpdates),
    openReleasesPage: () => ipcRenderer.invoke(IPC_CHANNELS.openReleasesPage),
    downloadLatestRelease: () => ipcRenderer.invoke(IPC_CHANNELS.downloadLatestRelease),
  };
}
