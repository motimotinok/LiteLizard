import type { AnalysisRunInput, AnalysisRunResult, FileNode, LiteLizardDocument } from '@litelizard/shared';

declare global {
  interface Window {
    litelizard: {
      openFolder: () => Promise<string | null>;
      listTree: (root: string) => Promise<FileNode[]>;
      createEntry: (
        root: string,
        type: 'file' | 'folder',
        name: string
      ) => Promise<{ ok: boolean; path: string; type: 'file' | 'folder' }>;
      renameEntry: (targetPath: string, nextName: string) => Promise<{ ok: boolean; path: string }>;
      deleteEntry: (targetPath: string) => Promise<{ ok: boolean }>;
      loadDocument: (filePath: string) => Promise<LiteLizardDocument>;
      createDocument: (
        root: string,
        title: string
      ) => Promise<{ filePath: string; document: LiteLizardDocument }>;
      saveDocument: (
        filePath: string,
        doc: LiteLizardDocument,
        revision: number
      ) => Promise<{ ok: boolean; code?: string; revision: number }>;
      runAnalysis: (input: AnalysisRunInput) => Promise<AnalysisRunResult>;
      getApiKeyStatus: () => Promise<{ configured: boolean }>;
      saveApiKey: (apiKey: string) => Promise<{ ok: boolean }>;
      clearApiKey: () => Promise<{ ok: boolean }>;
    };
  }
}

export {};
