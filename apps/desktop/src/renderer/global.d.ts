import type {
  AnalysisRunInput,
  AnalysisRunResult,
  FileNode,
  LiteLizardDocument,
  Session,
  UsageResponse,
} from '@litelizard/shared';

declare global {
  interface Window {
    litelizard: {
      openFolder: () => Promise<string | null>;
      listTree: (root: string) => Promise<FileNode[]>;
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
      getSession: () => Promise<Session | null>;
      requestEmailLink: (email: string) => Promise<{ requestId: string; devCode?: string }>;
      verifyEmailLink: (email: string, code: string, requestId: string) => Promise<Session>;
      logout: () => Promise<{ ok: boolean }>;
      runAnalysis: (input: AnalysisRunInput, accessToken: string) => Promise<AnalysisRunResult>;
      getUsage: (accessToken: string) => Promise<UsageResponse>;
    };
  }
}

export {};
