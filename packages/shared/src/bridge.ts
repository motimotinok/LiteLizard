import type {
  AnalysisSettings,
  AnalysisSettingsInput,
  FileNode,
  GenerationalAnalysisFile,
  LiteLizardDocument,
  ParagraphAnalysisPattern,
} from './types.js';
import type { AnalysisRunInput, AnalysisRunResult } from './api.js';

/**
 * Renderer → Main プロセス間の API 契約。
 * preload が contextBridge 経由で window.litelizard に公開する。
 */
export interface BridgeApi {
  openFolder(): Promise<string | null>;
  getLastOpenedFolder(): Promise<string | null>;
  setLastOpenedFolder(folderPath: string): Promise<{ ok: true }>;
  onRequestOpenFolder(listener: () => void): () => void;
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
  loadAnalysis(projectRoot: string, documentId: string, filePath?: string): Promise<GenerationalAnalysisFile | null>;
  saveAnalysisResult(
    projectRoot: string,
    documentId: string,
    paragraphId: string,
    pattern: ParagraphAnalysisPattern,
  ): Promise<void>;
  createAnalysisGeneration(projectRoot: string, documentId: string): Promise<number>;
  loadAnalysisSettings(): Promise<AnalysisSettings>;
  saveProviderApiKey(providerId: string, apiKey: string): Promise<{ ok: true }>;
  clearProviderApiKey(providerId: string): Promise<{ ok: true }>;
  saveAnalysisSettings(input: AnalysisSettingsInput): Promise<{ ok: true }>;
  testLocalLlmConnection(
    input: { endpoint: string; model: string }
  ): Promise<{ ok: true; model?: string } | { ok: false; message: string }>;
}

/**
 * IPC チャンネル名の定数マップ。
 * main (ipcMain.handle) と preload (ipcRenderer.invoke) で同じ値を使う。
 */
export const IPC_CHANNELS = {
  openFolder: 'dialog:openFolder',
  getLastOpenedFolder: 'app:getLastOpenedFolder',
  setLastOpenedFolder: 'app:setLastOpenedFolder',
  requestOpenFolder: 'menu:requestOpenFolder',
  listTree: 'fs:listTree',
  createEntry: 'fs:create',
  renameEntry: 'fs:rename',
  deleteEntry: 'fs:delete',
  loadDocument: 'doc:load',
  createDocument: 'doc:create',
  saveDocument: 'doc:save',
  runAnalysis: 'analysis:run',
  loadAnalysis: 'analysis:load',
  saveAnalysisResult: 'analysis:save',
  createAnalysisGeneration: 'analysis:newGeneration',
  loadAnalysisSettings: 'settings:analysis:load',
  saveProviderApiKey: 'settings:analysis:saveProviderApiKey',
  clearProviderApiKey: 'settings:analysis:clearProviderApiKey',
  saveAnalysisSettings: 'settings:analysis:save',
  testLocalLlmConnection: 'settings:analysis:testLocalLlmConnection',
} as const satisfies Record<Exclude<keyof BridgeApi, 'onRequestOpenFolder'> | 'requestOpenFolder', string>;

export type IpcChannelName = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS];
