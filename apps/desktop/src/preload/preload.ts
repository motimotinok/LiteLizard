import { contextBridge, ipcRenderer } from 'electron';
import type {
  AnalysisRunInput,
  AnalysisRunResult,
  FileNode,
  LiteLizardDocument,
  Session,
  UsageResponse,
} from '@litelizard/shared';

const api = {
  openFolder: (): Promise<string | null> => ipcRenderer.invoke('dialog:openFolder'),
  listTree: (root: string): Promise<FileNode[]> => ipcRenderer.invoke('fs:listTree', root),
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
  getSession: (): Promise<Session | null> => ipcRenderer.invoke('auth:getSession'),
  requestEmailLink: (email: string): Promise<{ requestId: string; devCode?: string }> =>
    ipcRenderer.invoke('auth:requestEmailLink', email),
  verifyEmailLink: (email: string, code: string, requestId: string): Promise<Session> =>
    ipcRenderer.invoke('auth:verifyEmailLink', email, code, requestId),
  logout: (): Promise<{ ok: boolean }> => ipcRenderer.invoke('auth:logout'),
  runAnalysis: (input: AnalysisRunInput, accessToken: string): Promise<AnalysisRunResult> =>
    ipcRenderer.invoke('analysis:run', input, accessToken),
  getUsage: (accessToken: string): Promise<UsageResponse> => ipcRenderer.invoke('usage:get', accessToken),
};

contextBridge.exposeInMainWorld('litelizard', api);
