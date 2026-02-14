import { create } from 'zustand';
import type { AnalysisRunInput, FileNode, LiteLizardDocument } from '@litelizard/shared';
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
  apiKeyConfigured: boolean;
  statusMessage: string;
  openFolder: () => Promise<void>;
  createFolder: (name: string) => Promise<void>;
  createDocument: (title: string) => Promise<void>;
  loadDocument: (filePath: string) => Promise<void>;
  updateParagraph: (paragraphId: string, text: string) => void;
  reorderParagraphs: (orderedIds: string[]) => void;
  saveNow: () => Promise<void>;
  runAnalysis: () => Promise<void>;
  bootstrapApiKeyStatus: () => Promise<void>;
  saveApiKey: (apiKey: string) => Promise<void>;
  clearApiKey: () => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  rootPath: null,
  tree: [],
  currentFilePath: null,
  document: null,
  revision: 0,
  dirty: false,
  apiKeyConfigured: false,
  statusMessage: 'Ready',

  openFolder: async () => {
    try {
      const root = await window.litelizard.openFolder();
      if (!root) {
        set({ statusMessage: 'Open folder cancelled' });
        return;
      }
      const tree = await window.litelizard.listTree(root);
      set({ rootPath: root, tree, statusMessage: `Opened: ${root}` });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      set({ statusMessage: `Open folder failed: ${message}` });
    }
  },

  createFolder: async (name: string) => {
    const root = get().rootPath;
    if (!root) {
      set({ statusMessage: 'Open a folder first' });
      return;
    }

    const trimmed = name.trim();
    if (!trimmed) {
      set({ statusMessage: 'Folder name is required' });
      return;
    }

    try {
      await window.litelizard.createFolder(root, trimmed);
      const tree = await window.litelizard.listTree(root);
      set({ tree, statusMessage: `Folder created: ${trimmed}` });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      set({ statusMessage: `Create folder failed: ${message}` });
    }
  },

  createDocument: async (title: string) => {
    const root = get().rootPath;
    if (!root) {
      set({ statusMessage: 'Open a folder first' });
      return;
    }

    try {
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
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      set({ statusMessage: `Create document failed: ${message}` });
    }
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

    try {
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
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      set({ statusMessage: `Save failed: ${message}` });
    }
  },

  runAnalysis: async () => {
    const { document, apiKeyConfigured } = get();
    if (!document) {
      return;
    }

    if (!apiKeyConfigured) {
      set({ statusMessage: 'API key is not configured. Open Settings and save your API key.' });
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
      const result = await window.litelizard.runAnalysis(payload);
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

  bootstrapApiKeyStatus: async () => {
    try {
      const status = await window.litelizard.getApiKeyStatus();
      set({ apiKeyConfigured: status.configured });
    } catch {
      set({ statusMessage: 'Failed to load API key status' });
    }
  },

  saveApiKey: async (apiKey: string) => {
    const trimmed = apiKey.trim();
    if (!trimmed) {
      set({ statusMessage: 'API key is required' });
      return;
    }

    try {
      await window.litelizard.saveApiKey(trimmed);
      set({ apiKeyConfigured: true, statusMessage: 'API key saved' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      set({ statusMessage: `Failed to save API key: ${message}` });
    }
  },

  clearApiKey: async () => {
    try {
      await window.litelizard.clearApiKey();
      set({ apiKeyConfigured: false, statusMessage: 'API key cleared' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      set({ statusMessage: `Failed to clear API key: ${message}` });
    }
  },
}));
