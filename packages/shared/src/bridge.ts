import type {
  AnalysisSettings,
  AnalysisSettingsInput,
  FileNode,
  GenerationalAnalysisFile,
  LiteLizardDocument,
  ParagraphAnalysisPattern,
  ReadingAgent,
  ReadingAgentInput,
  RecentProjectEntry,
} from './types.js';
import type { AnalysisParagraph, AnalysisResult, AnalysisRunInput, AnalysisRunResult } from './api.js';

export interface AnalysisProgressEvent {
  paragraphId: string;
  result: AnalysisResult;
}

export interface ReadingAgentDryRunInput {
  agent: ReadingAgentInput & { id?: string };
  paragraph: AnalysisParagraph;
  documentParagraphs: AnalysisParagraph[];
  promptVersion: string;
}

/**
 * Renderer → Main プロセス間の API 契約。
 * preload が contextBridge 経由で window.litelizard に公開する。
 */
export interface BridgeApi {
  openFolder(): Promise<string | null>;
  getLastOpenedFolder(): Promise<string | null>;
  setLastOpenedFolder(folderPath: string): Promise<{ ok: true }>;
  getRecentProjects(): Promise<RecentProjectEntry[]>;
  removeRecentProject(folderPath: string): Promise<{ ok: true }>;
  onRequestOpenFolder(listener: () => void): () => void;
  listTree(root: string): Promise<FileNode[]>;
  createEntry(
    root: string,
    type: 'file' | 'folder',
    name: string,
  ): Promise<{ ok: true; path: string; type: 'file' | 'folder' }>;
  renameEntry(targetPath: string, nextName: string): Promise<{ ok: true; path: string }>;
  moveEntry(sourcePath: string, destinationFolderPath: string): Promise<{ ok: true; path: string }>;
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
  exportDocumentText(
    filePath: string | null,
    doc: LiteLizardDocument,
  ): Promise<{ ok: true; filePath: string } | null>;
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
  onAnalysisProgress(listener: (event: AnalysisProgressEvent) => void): () => void;
  importTextFile(
    createParent: string,
  ): Promise<{ ok: true; filePath: string; document: LiteLizardDocument } | null>;
  getActiveReadingAgentId(): Promise<string | null>;
  setActiveReadingAgentId(id: string): Promise<{ ok: true }>;
  listReadingAgents(): Promise<ReadingAgent[]>;
  getReadingAgent(id: string): Promise<ReadingAgent | null>;
  saveReadingAgent(input: ReadingAgentInput & { id?: string }): Promise<ReadingAgent>;
  deleteReadingAgent(id: string): Promise<{ ok: true }>;
  resetReadingAgents(): Promise<ReadingAgent[]>;
  dryRunReadingAgent(input: ReadingAgentDryRunInput): Promise<AnalysisResult>;
}

/**
 * IPC チャンネル名の定数マップ。
 * main (ipcMain.handle) と preload (ipcRenderer.invoke) で同じ値を使う。
 */
export const IPC_CHANNELS = {
  openFolder: 'dialog:openFolder',
  getLastOpenedFolder: 'app:getLastOpenedFolder',
  setLastOpenedFolder: 'app:setLastOpenedFolder',
  getRecentProjects: 'app:getRecentProjects',
  removeRecentProject: 'app:removeRecentProject',
  requestOpenFolder: 'menu:requestOpenFolder',
  listTree: 'fs:listTree',
  createEntry: 'fs:create',
  renameEntry: 'fs:rename',
  moveEntry: 'fs:move',
  deleteEntry: 'fs:delete',
  loadDocument: 'doc:load',
  createDocument: 'doc:create',
  saveDocument: 'doc:save',
  exportDocumentText: 'doc:exportText',
  runAnalysis: 'analysis:run',
  loadAnalysis: 'analysis:load',
  saveAnalysisResult: 'analysis:save',
  createAnalysisGeneration: 'analysis:newGeneration',
  loadAnalysisSettings: 'settings:analysis:load',
  saveProviderApiKey: 'settings:analysis:saveProviderApiKey',
  clearProviderApiKey: 'settings:analysis:clearProviderApiKey',
  saveAnalysisSettings: 'settings:analysis:save',
  testLocalLlmConnection: 'settings:analysis:testLocalLlmConnection',
  analysisProgress: 'analysis:progress',
  importTextFile: 'doc:importText',
  getActiveReadingAgentId: 'agents:getActive',
  setActiveReadingAgentId: 'agents:setActive',
  listReadingAgents: 'agents:list',
  getReadingAgent: 'agents:get',
  saveReadingAgent: 'agents:save',
  deleteReadingAgent: 'agents:delete',
  resetReadingAgents: 'agents:reset',
  dryRunReadingAgent: 'agents:dryRun',
} as const satisfies Record<Exclude<keyof BridgeApi, 'onRequestOpenFolder' | 'onAnalysisProgress'> | 'requestOpenFolder' | 'analysisProgress', string>;

export type IpcChannelName = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS];
