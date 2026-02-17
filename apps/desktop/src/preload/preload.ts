import { contextBridge, ipcRenderer } from 'electron';
import type { AnalysisRunInput, AnalysisRunResult, FileNode, LiteLizardDocument } from '@litelizard/shared';

const api = {
  openFolder: (): Promise<string | null> => ipcRenderer.invoke('dialog:openFolder'),
  listTree: (root: string): Promise<FileNode[]> => ipcRenderer.invoke('fs:listTree', root),
  createEntry: (root: string, type: 'file' | 'folder', name: string): Promise<{ ok: boolean; path: string; type: 'file' | 'folder' }> =>
    ipcRenderer.invoke('fs:create', root, type, name),
  renameEntry: (targetPath: string, nextName: string): Promise<{ ok: boolean; path: string }> =>
    ipcRenderer.invoke('fs:rename', targetPath, nextName),
  deleteEntry: (targetPath: string): Promise<{ ok: boolean }> => ipcRenderer.invoke('fs:delete', targetPath),
  loadDocument: (filePath: string): Promise<LiteLizardDocument> => ipcRenderer.invoke('doc:load', filePath),
  createDocument: (
    root: string,
    title: string
  ): Promise<{ filePath: string; document: LiteLizardDocument }> =>
    ipcRenderer.invoke('doc:create', root, title),
  saveDocument: (
    filePath: string,
    doc: LiteLizardDocument,
    revision: number
  ): Promise<{ ok: boolean; code?: string; revision: number }> =>
    ipcRenderer.invoke('doc:save', filePath, doc, revision),
  runAnalysis: (input: AnalysisRunInput): Promise<AnalysisRunResult> => ipcRenderer.invoke('analysis:run', input),
  getApiKeyStatus: (): Promise<{ configured: boolean }> => ipcRenderer.invoke('settings:apiKey:getStatus'),
  saveApiKey: (apiKey: string): Promise<{ ok: boolean }> => ipcRenderer.invoke('settings:apiKey:save', apiKey),
  clearApiKey: (): Promise<{ ok: boolean }> => ipcRenderer.invoke('settings:apiKey:clear'),
};

contextBridge.exposeInMainWorld('litelizard', api);
