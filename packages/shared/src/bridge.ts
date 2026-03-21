import type { FileNode, LiteLizardDocument } from './types.js';
import type { AnalysisRunInput, AnalysisRunResult } from './api.js';

/**
 * Renderer → Main プロセス間の API 契約。
 * preload が contextBridge 経由で window.litelizard に公開する。
 */
export interface BridgeApi {
  openFolder(): Promise<string | null>;
  listTree(root: string): Promise<FileNode[]>;
  createEntry(
    root: string,
    type: 'file' | 'folder',
    name: string,
  ): Promise<{ ok: true; path: string; type: 'file' | 'folder' }>;
  renameEntry(targetPath: string, nextName: string): Promise<{ ok: true; path: string }>;
  deleteEntry(targetPath: string): Promise<{ ok: true }>;
  loadDocument(filePath: string): Promise<LiteLizardDocument>;
  createDocument(
    root: string,
    title: string,
  ): Promise<{ filePath: string; document: LiteLizardDocument }>;
  saveDocument(
    filePath: string,
    doc: LiteLizardDocument,
    revision: number,
  ): Promise<{ ok: boolean; code?: string; revision: number }>;
  runAnalysis(input: AnalysisRunInput): Promise<AnalysisRunResult>;
  getApiKeyStatus(): Promise<{ configured: boolean }>;
  saveApiKey(apiKey: string): Promise<{ ok: true }>;
  clearApiKey(): Promise<{ ok: true }>;
}

/**
 * IPC チャンネル名の定数マップ。
 * main (ipcMain.handle) と preload (ipcRenderer.invoke) で同じ値を使う。
 */
export const IPC_CHANNELS = {
  openFolder: 'dialog:openFolder',
  listTree: 'fs:listTree',
  createEntry: 'fs:create',
  renameEntry: 'fs:rename',
  deleteEntry: 'fs:delete',
  loadDocument: 'doc:load',
  createDocument: 'doc:create',
  saveDocument: 'doc:save',
  runAnalysis: 'analysis:run',
  getApiKeyStatus: 'settings:apiKey:getStatus',
  saveApiKey: 'settings:apiKey:save',
  clearApiKey: 'settings:apiKey:clear',
} as const satisfies Record<keyof BridgeApi, string>;

export type IpcChannelName = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS];
