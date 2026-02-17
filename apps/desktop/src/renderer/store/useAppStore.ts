import { create } from 'zustand';
import type { AnalysisRunInput, FileNode, LiteLizardDocument } from '@litelizard/shared';
import {
  collectStaleParagraphs,
  reorderParagraphsInDocument,
  replaceParagraphsInDocument,
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
  replaceParagraphs: (paragraphTexts: string[]) => void;
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
  statusMessage: '準備完了',

  openFolder: async () => {
    try {
      const root = await window.litelizard.openFolder();
      if (!root) {
        set({ statusMessage: 'フォルダ選択をキャンセルしました' });
        return;
      }
      const tree = await window.litelizard.listTree(root);
      set({ rootPath: root, tree, statusMessage: `フォルダを開きました: ${root}` });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      set({ statusMessage: `フォルダを開けませんでした: ${message}` });
    }
  },

  createFolder: async (name: string) => {
    const root = get().rootPath;
    if (!root) {
      set({ statusMessage: '先にフォルダを開いてください' });
      return;
    }

    const trimmed = name.trim();
    if (!trimmed) {
      set({ statusMessage: 'フォルダ名を入力してください' });
      return;
    }

    try {
      await window.litelizard.createFolder(root, trimmed);
      const tree = await window.litelizard.listTree(root);
      set({ tree, statusMessage: `フォルダを作成しました: ${trimmed}` });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      set({ statusMessage: `フォルダ作成に失敗しました: ${message}` });
    }
  },

  createDocument: async (title: string) => {
    const root = get().rootPath;
    if (!root) {
      set({ statusMessage: '先にフォルダを開いてください' });
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
        statusMessage: 'ドキュメントを作成しました',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      set({ statusMessage: `ドキュメント作成に失敗しました: ${message}` });
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
        statusMessage: 'ドキュメントを読み込みました',
      });
    } catch {
      set({ statusMessage: 'ドキュメントを読み込めませんでした。形式を確認してください。' });
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
      statusMessage: '本文を編集中',
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
      statusMessage: '段落順を変更しました',
    });
  },

  replaceParagraphs: (paragraphTexts: string[]) => {
    const document = get().document;
    if (!document) {
      return;
    }

    set({
      document: replaceParagraphsInDocument(document, paragraphTexts),
      dirty: true,
      statusMessage: '編集中',
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
          set({ statusMessage: '保存競合が発生しました。再読み込みして再実行してください。' });
          return;
        }
        set({ statusMessage: '保存に失敗しました' });
        return;
      }

      set({ dirty: false, revision: result.revision, statusMessage: '保存しました' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      set({ statusMessage: `保存に失敗しました: ${message}` });
    }
  },

  runAnalysis: async () => {
    const { document, apiKeyConfigured } = get();
    if (!document) {
      return;
    }

    if (!apiKeyConfigured) {
      set({ statusMessage: '解析の実行にはログインが必要です。' });
      return;
    }

    const staleParagraphs = collectStaleParagraphs(document);
    if (staleParagraphs.length === 0) {
      set({ statusMessage: '再解析が必要な段落はありません' });
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
    set({ document: pendingDoc, statusMessage: '全体解析を実行中...' });

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
        statusMessage: '全体解析が完了しました',
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
      set({ document: failedDoc, statusMessage: `解析に失敗しました: ${message}` });
    }
  },

  bootstrapApiKeyStatus: async () => {
    try {
      const status = await window.litelizard.getApiKeyStatus();
      set({ apiKeyConfigured: status.configured });
    } catch {
      set({ statusMessage: '認証状態の取得に失敗しました' });
    }
  },

  saveApiKey: async (apiKey: string) => {
    const trimmed = apiKey.trim();
    if (!trimmed) {
      set({ statusMessage: 'APIキーを入力してください' });
      return;
    }

    try {
      await window.litelizard.saveApiKey(trimmed);
      set({ apiKeyConfigured: true, statusMessage: 'APIキーを保存しました' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      set({ statusMessage: `APIキー保存に失敗しました: ${message}` });
    }
  },

  clearApiKey: async () => {
    try {
      await window.litelizard.clearApiKey();
      set({ apiKeyConfigured: false, statusMessage: 'APIキーを削除しました' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      set({ statusMessage: `APIキー削除に失敗しました: ${message}` });
    }
  },
}));
