import { create } from 'zustand';
import type { AnalysisRunInput, FileNode, LiteLizardDocument, Session, UsageResponse } from '@litelizard/shared';
import {
  collectStaleParagraphs,
  reorderParagraphsInDocument,
  updateParagraphInDocument,
} from './documentOps.js';

interface AppState {
  rootPath: string | null;
  tree: FileNode[];
  currentFilePath: string | null;
  document: LiteLizardDocument | null;
  revision: number;
  dirty: boolean;
  session: Session | null;
  usage: UsageResponse | null;
  emailRequestId: string | null;
  devCode: string | null;
  statusMessage: string;
  openFolder: () => Promise<void>;
  createDocument: (title: string) => Promise<void>;
  loadDocument: (filePath: string) => Promise<void>;
  updateParagraph: (paragraphId: string, text: string) => void;
  reorderParagraphs: (orderedIds: string[]) => void;
  saveNow: () => Promise<void>;
  runAnalysis: () => Promise<void>;
  bootstrapSession: () => Promise<void>;
  requestEmailLink: (email: string) => Promise<void>;
  verifyEmailLink: (email: string, code: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUsage: () => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  rootPath: null,
  tree: [],
  currentFilePath: null,
  document: null,
  revision: 0,
  dirty: false,
  session: null,
  usage: null,
  emailRequestId: null,
  devCode: null,
  statusMessage: 'Ready',

  openFolder: async () => {
    const root = await window.litelizard.openFolder();
    if (!root) {
      return;
    }
    const tree = await window.litelizard.listTree(root);
    set({ rootPath: root, tree, statusMessage: `Opened: ${root}` });
  },

  createDocument: async (title: string) => {
    const root = get().rootPath;
    if (!root) {
      set({ statusMessage: 'Open a folder first' });
      return;
    }

    const created = await window.litelizard.createDocument(root, title);
    const tree = await window.litelizard.listTree(root);
    set({
      tree,
      currentFilePath: created.filePath,
      document: created.document,
      revision: 0,
      dirty: false,
      statusMessage: 'Document created',
    });
  },

  loadDocument: async (filePath: string) => {
    try {
      const document = await window.litelizard.loadDocument(filePath);
      set({
        currentFilePath: filePath,
        document,
        revision: 0,
        dirty: false,
        statusMessage: 'Document loaded',
      });
    } catch {
      set({ statusMessage: 'JSON is invalid. Please repair manually.' });
    }
  },

  updateParagraph: (paragraphId: string, text: string) => {
    const document = get().document;
    if (!document) {
      return;
    }

    set({
      document: updateParagraphInDocument(document, paragraphId, text),
      dirty: true,
      statusMessage: 'Edited',
    });
  },

  reorderParagraphs: (orderedIds: string[]) => {
    const document = get().document;
    if (!document) {
      return;
    }

    set({
      document: reorderParagraphsInDocument(document, orderedIds),
      dirty: true,
      statusMessage: 'Paragraphs reordered',
    });
  },

  saveNow: async () => {
    const { currentFilePath, document, revision } = get();
    if (!currentFilePath || !document) {
      return;
    }

    const result = await window.litelizard.saveDocument(currentFilePath, document, revision);
    if (!result.ok) {
      if (result.code === 'REVISION_MISMATCH') {
        set({ statusMessage: 'Revision mismatch. Reload and retry.' });
        return;
      }
      set({ statusMessage: 'Save failed' });
      return;
    }

    set({ dirty: false, revision: result.revision, statusMessage: 'Saved' });
  },

  runAnalysis: async () => {
    const { document, session } = get();
    if (!document) {
      return;
    }

    if (!session) {
      set({ statusMessage: 'Login required for analysis (401).' });
      return;
    }

    const staleParagraphs = collectStaleParagraphs(document);
    if (staleParagraphs.length === 0) {
      set({ statusMessage: 'No stale paragraphs.' });
      return;
    }

    const pendingDoc: LiteLizardDocument = {
      ...document,
      paragraphs: document.paragraphs.map((paragraph) =>
        paragraph.lizard.status === 'stale'
          ? {
              ...paragraph,
              lizard: { ...paragraph.lizard, status: 'pending' },
            }
          : paragraph
      ),
    };
    set({ document: pendingDoc, statusMessage: 'Analyzing...' });

    const payload: AnalysisRunInput = {
      documentId: document.documentId,
      personaMode: document.personaMode,
      promptVersion: 'v1.0.0',
      paragraphs: staleParagraphs.map((paragraph) => ({
        paragraphId: paragraph.id,
        order: paragraph.order,
        text: paragraph.light.text,
      })),
    };

    try {
      const result = await window.litelizard.runAnalysis(payload, session.accessToken);
      const resultMap = new Map(result.results.map((r) => [r.paragraphId, r]));

      const nextDoc: LiteLizardDocument = {
        ...pendingDoc,
        paragraphs: pendingDoc.paragraphs.map((paragraph) => {
          const analyzed = resultMap.get(paragraph.id);
          if (!analyzed) {
            return paragraph;
          }

          return {
            ...paragraph,
            lizard: {
              status: 'complete',
              emotion: analyzed.emotion,
              theme: analyzed.theme,
              deepMeaning: analyzed.deepMeaning,
              confidence: analyzed.confidence,
              model: analyzed.model,
              requestId: result.requestId,
              analyzedAt: analyzed.analyzedAt,
            },
          };
        }),
      };

      set({
        document: {
          ...nextDoc,
          updatedAt: new Date().toISOString(),
        },
        dirty: true,
        statusMessage: 'Analysis complete',
      });
      await get().refreshUsage();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Analysis failed';
      const failedDoc: LiteLizardDocument = {
        ...pendingDoc,
        paragraphs: pendingDoc.paragraphs.map((paragraph) =>
          paragraph.lizard.status === 'pending'
            ? {
                ...paragraph,
                lizard: {
                  status: 'failed',
                  error: {
                    code: 'ANALYSIS_ABORTED',
                    message: 'At least one paragraph failed. No results were applied.',
                  },
                },
              }
            : paragraph
        ),
      };
      set({ document: failedDoc, statusMessage: `Analysis failed: ${message}` });
    }
  },

  bootstrapSession: async () => {
    const session = await window.litelizard.getSession();
    set({ session });
    if (session) {
      await get().refreshUsage();
    }
  },

  requestEmailLink: async (email: string) => {
    const result = await window.litelizard.requestEmailLink(email);
    set({
      emailRequestId: result.requestId,
      devCode: result.devCode ?? null,
      statusMessage: 'Email link requested',
    });
  },

  verifyEmailLink: async (email: string, code: string) => {
    const requestId = get().emailRequestId;
    if (!requestId) {
      set({ statusMessage: 'Request email link first' });
      return;
    }

    const session = await window.litelizard.verifyEmailLink(email, code, requestId);
    set({ session, statusMessage: 'Logged in' });
    await get().refreshUsage();
  },

  logout: async () => {
    await window.litelizard.logout();
    set({ session: null, usage: null, statusMessage: 'Logged out' });
  },

  refreshUsage: async () => {
    const session = get().session;
    if (!session) {
      return;
    }

    try {
      const usage = await window.litelizard.getUsage(session.accessToken);
      set({ usage });
    } catch {
      set({ statusMessage: 'Failed to load usage' });
    }
  },
}));
