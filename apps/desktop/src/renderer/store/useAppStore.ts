import { create } from 'zustand';
import type { AnalysisRunInput, FileNode, LiteLizardDocument } from '@litelizard/shared';
import {
  collectStaleParagraphs,
  reorderParagraphsInDocument,
  replaceParagraphsInDocument,
  updateParagraphInDocument,
} from './documentOps.js';

export type EditorMode = 'writing' | 'structure' | 'reader';

interface AppState {
  rootPath: string | null;
  tree: FileNode[];
  currentFilePath: string | null;
  document: LiteLizardDocument | null;
  revision: number;
  dirty: boolean;
  apiKeyConfigured: boolean;
  editorMode: EditorMode;
  analysisLayerOpen: boolean;
  statusMessage: string;
  openFolder: () => Promise<void>;
  createDocument: (title: string, parentPath?: string) => Promise<void>;
  createEntry: (parentPath: string, type: 'file' | 'folder', name: string) => Promise<void>;
  renameEntry: (targetPath: string, nextName: string) => Promise<void>;
  deleteEntry: (targetPath: string) => Promise<void>;
  loadDocument: (filePath: string) => Promise<void>;
  updateParagraph: (paragraphId: string, text: string) => void;
  reorderParagraphs: (orderedIds: string[]) => void;
  replaceParagraphs: (paragraphTexts: string[]) => void;
  saveNow: () => Promise<void>;
  runAnalysis: () => Promise<void>;
  setEditorMode: (mode: EditorMode) => void;
  cycleEditorMode: () => void;
  setAnalysisLayerOpen: (open: boolean) => void;
  toggleAnalysisLayer: () => void;
  bootstrapApiKeyStatus: () => Promise<void>;
  saveApiKey: (apiKey: string) => Promise<void>;
  clearApiKey: () => Promise<void>;
}

function isSameOrNestedPath(value: string, base: string) {
  return value === base || value.startsWith(`${base}/`) || value.startsWith(`${base}\\`);
}

function remapPathForRename(current: string, source: string, target: string) {
  if (current === source) {
    return target;
  }
  if (current.startsWith(`${source}/`)) {
    return `${target}${current.slice(source.length)}`;
  }
  if (current.startsWith(`${source}\\`)) {
    return `${target}${current.slice(source.length)}`;
  }
  return current;
}

function titleFromPath(filePath: string) {
  const normalized = filePath.replace(/\\/g, '/');
  const fileName = normalized.split('/').pop() ?? filePath;
  return fileName.replace(/\.md$/i, '');
}

export const useAppStore = create<AppState>((set, get) => ({
  rootPath: null,
  tree: [],
  currentFilePath: null,
  document: null,
  revision: 0,
  dirty: false,
  apiKeyConfigured: false,
  editorMode: 'writing',
  analysisLayerOpen: false,
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

  createDocument: async (title: string, parentPath?: string) => {
    const root = parentPath ?? get().rootPath;
    if (!root) {
      set({ statusMessage: '先にフォルダを開いてください' });
      return;
    }

    try {
      const created = await window.litelizard.createDocument(root, title);
      const rootPath = get().rootPath;
      if (rootPath) {
        const tree = await window.litelizard.listTree(rootPath);
        set({ tree });
      }
      set({
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

  createEntry: async (parentPath: string, type: 'file' | 'folder', name: string) => {
    try {
      const created = await window.litelizard.createEntry(parentPath, type, name);
      const rootPath = get().rootPath;
      if (rootPath) {
        const tree = await window.litelizard.listTree(rootPath);
        set({ tree });
      }

      if (created.type === 'file') {
        const document = await window.litelizard.loadDocument(created.path);
        set({
          currentFilePath: created.path,
          document,
          revision: 0,
          dirty: false,
          statusMessage: '新規ファイルを作成しました',
        });
        return;
      }

      set({ statusMessage: '新規フォルダを作成しました' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      set({ statusMessage: `作成に失敗しました: ${message}` });
    }
  },

  renameEntry: async (targetPath: string, nextName: string) => {
    try {
      const result = await window.litelizard.renameEntry(targetPath, nextName);

      const rootPath = get().rootPath;
      if (rootPath) {
        const tree = await window.litelizard.listTree(rootPath);
        set({ tree });
      }

      const currentFilePath = get().currentFilePath;
      if (currentFilePath) {
        const remapped = remapPathForRename(currentFilePath, targetPath, result.path);
        if (remapped !== currentFilePath) {
          const document = get().document;
          set({
            currentFilePath: remapped,
            document:
              document && remapped !== currentFilePath
                ? {
                    ...document,
                    title: remapped === result.path ? titleFromPath(remapped) : document.title,
                    updatedAt: document.updatedAt,
                    source: { format: 'markdown-md', originPath: remapped },
                  }
                : document,
          });
        }
      }

      set({ statusMessage: '名前を変更しました' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      set({ statusMessage: `名前変更に失敗しました: ${message}` });
    }
  },

  deleteEntry: async (targetPath: string) => {
    try {
      await window.litelizard.deleteEntry(targetPath);

      const rootPath = get().rootPath;
      if (rootPath) {
        const tree = await window.litelizard.listTree(rootPath);
        set({ tree });
      }

      const currentFilePath = get().currentFilePath;
      if (currentFilePath && isSameOrNestedPath(currentFilePath, targetPath)) {
        set({
          currentFilePath: null,
          document: null,
          revision: 0,
          dirty: false,
        });
      }

      set({ statusMessage: '削除しました' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      set({ statusMessage: `削除に失敗しました: ${message}` });
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

  setEditorMode: (mode: EditorMode) => {
    set({
      editorMode: mode,
      analysisLayerOpen: mode === 'writing' ? false : get().analysisLayerOpen,
    });
  },

  cycleEditorMode: () => {
    const mode = get().editorMode;
    if (mode === 'writing') {
      set({ editorMode: 'structure', analysisLayerOpen: true });
      return;
    }
    if (mode === 'structure') {
      set({ editorMode: 'reader' });
      return;
    }
    set({ editorMode: 'writing', analysisLayerOpen: false });
  },

  setAnalysisLayerOpen: (open: boolean) => {
    const mode = get().editorMode;
    if (mode === 'writing') {
      set({ analysisLayerOpen: false });
      return;
    }
    set({ analysisLayerOpen: open });
  },

  toggleAnalysisLayer: () => {
    const { editorMode, analysisLayerOpen } = get();
    if (editorMode === 'writing') {
      set({ editorMode: 'structure', analysisLayerOpen: true });
      return;
    }
    set({ analysisLayerOpen: !analysisLayerOpen });
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
