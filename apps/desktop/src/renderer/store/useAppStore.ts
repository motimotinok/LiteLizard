import { create } from 'zustand';
import {
  DEFAULT_ANALYSIS_SETTINGS,
  type AnalysisRunInput,
  type AnalysisSettings,
  type AnalysisSettingsInput,
  type FileNode,
  type LiteLizardDocument,
} from '@litelizard/shared';
import type { DocumentStructureInput } from '../types/documentStructure.js';
import {
  collectStaleParagraphs,
  deleteChapterFromDocument,
  reorderChaptersInDocument,
  reorderParagraphsInDocument,
  replaceDocumentStructureInDocument,
  replaceParagraphsInDocument,
  updateParagraphInDocument,
} from './documentOps.js';

export type EditorMode = 'writing' | 'structure' | 'reader';
export type ViewScale = 'micro' | 'macro';
export type StartupState = 'loading' | 'needs-project' | 'ready';
export type WorkspacePanel = 'editor' | 'settings';

function cloneAnalysisSettings(): AnalysisSettings {
  return structuredClone(DEFAULT_ANALYSIS_SETTINGS);
}

function toAnalysisSettingsInput(settings: AnalysisSettings): AnalysisSettingsInput {
  return {
    defaultProvider: settings.defaultProvider,
    providers: {
      openai: {
        defaultModel: settings.providers.openai.defaultModel,
      },
      anthropic: {
        defaultModel: settings.providers.anthropic.defaultModel,
      },
    },
    localLlm: {
      endpoint: settings.localLlm.endpoint,
      defaultModel: settings.localLlm.defaultModel,
    },
  };
}

interface AppState {
  startupState: StartupState;
  rootPath: string | null;
  tree: FileNode[];
  currentFilePath: string | null;
  document: LiteLizardDocument | null;
  revision: number;
  dirty: boolean;
  analysisSettings: AnalysisSettings;
  activeWorkspacePanel: WorkspacePanel;
  editorMode: EditorMode;
  viewScale: ViewScale;
  analysisLayerOpen: boolean;
  statusMessage: string;
  hydrateProject: (rootPath: string, source: 'restore' | 'dialog') => Promise<void>;
  restoreLastProject: () => Promise<void>;
  openFolder: () => Promise<void>;
  createDocument: (title: string, parentPath?: string) => Promise<void>;
  createEntry: (parentPath: string, type: 'file' | 'folder', name: string) => Promise<void>;
  renameEntry: (targetPath: string, nextName: string) => Promise<void>;
  deleteEntry: (targetPath: string) => Promise<void>;
  loadDocument: (filePath: string) => Promise<void>;
  updateParagraph: (paragraphId: string, text: string) => void;
  reorderParagraphs: (orderedIds: string[]) => void;
  reorderChapters: (orderedIds: string[]) => void;
  deleteChapter: (chapterId: string) => void;
  replaceParagraphs: (paragraphTexts: string[]) => void;
  syncDocumentStructure: (input: DocumentStructureInput) => void;
  saveNow: () => Promise<void>;
  runAnalysis: () => Promise<void>;
  runAnalysisFor: (paragraphId: string) => Promise<void>;
  setEditorMode: (mode: EditorMode) => void;
  setViewScale: (viewScale: ViewScale) => void;
  toggleViewScale: () => void;
  cycleEditorMode: () => void;
  openSettingsPanel: () => void;
  openEditorPanel: () => void;
  setAnalysisLayerOpen: (open: boolean) => void;
  toggleAnalysisLayer: () => void;
  bootstrapAnalysisSettings: () => Promise<void>;
  saveProviderApiKey: (providerId: 'openai' | 'anthropic', apiKey: string) => Promise<void>;
  clearProviderApiKey: (providerId: 'openai' | 'anthropic') => Promise<void>;
  saveAnalysisSettings: (input: AnalysisSettingsInput) => Promise<void>;
  testLocalLlmConnection: (input: { endpoint: string; model: string }) => Promise<{ ok: boolean; message: string }>;
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
  return fileName.replace(/\.(md|lzl)$/i, '');
}

export const useAppStore = create<AppState>((set, get) => ({
  startupState: 'loading',
  rootPath: null,
  tree: [],
  currentFilePath: null,
  document: null,
  revision: 0,
  dirty: false,
  analysisSettings: cloneAnalysisSettings(),
  activeWorkspacePanel: 'editor',
  editorMode: 'writing',
  viewScale: 'micro',
  analysisLayerOpen: false,
  statusMessage: '準備完了',

  hydrateProject: async (rootPath, source) => {
    try {
      const tree = await window.litelizard.listTree(rootPath);
      await window.litelizard.setLastOpenedFolder(rootPath);
      set({
        startupState: 'ready',
        rootPath,
        tree,
        currentFilePath: null,
        document: null,
        revision: 0,
        dirty: false,
        statusMessage:
          source === 'restore'
            ? `前回のフォルダを復元しました: ${rootPath}`
            : `フォルダを開きました: ${rootPath}`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      const previousState = get();
      console.error('[Renderer hydrateProject] failed', error);
      if (source === 'dialog' && previousState.rootPath) {
        set({
          startupState: 'ready',
          statusMessage: `フォルダは選択されましたが一覧取得に失敗しました: ${message}`,
        });
        return;
      }
      set({
        startupState: 'needs-project',
        rootPath: null,
        tree: [],
        currentFilePath: null,
        document: null,
        revision: 0,
        dirty: false,
        statusMessage:
          source === 'restore'
            ? `前回のフォルダを復元できませんでした: ${message}`
            : `フォルダは選択されましたが一覧取得に失敗しました: ${message}`,
      });
    }
  },

  restoreLastProject: async () => {
    if (!window.litelizard) {
      set({
        startupState: 'needs-project',
        statusMessage: 'アプリ内部ブリッジの初期化に失敗しました（preload未接続）',
      });
      return;
    }

    set({ startupState: 'loading', statusMessage: '前回のフォルダを確認しています...' });

    try {
      const root = await window.litelizard.getLastOpenedFolder();
      if (!root) {
        set({ startupState: 'needs-project', statusMessage: 'フォルダを選択して始めてください' });
        return;
      }

      await get().hydrateProject(root, 'restore');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('[Renderer restoreLastProject] failed', error);
      set({
        startupState: 'needs-project',
        statusMessage: `前回のフォルダ確認に失敗しました: ${message}`,
      });
    }
  },

  openFolder: async () => {
    if (!window.litelizard) {
      set({
        startupState: 'needs-project',
        statusMessage: 'アプリ内部ブリッジの初期化に失敗しました（preload未接続）',
      });
      return;
    }

    if (!get().rootPath) {
      set({ startupState: 'loading', statusMessage: 'フォルダ選択ダイアログを開いています...' });
    }

    let root: string | null = null;
    try {
      root = await window.litelizard.openFolder();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('[Renderer openFolder] failed', error);
      set({
        startupState: get().rootPath ? 'ready' : 'needs-project',
        statusMessage: `フォルダ選択ダイアログの起動に失敗しました: ${message}`,
      });
      return;
    }

    if (!root) {
      set({
        startupState: get().rootPath ? 'ready' : 'needs-project',
        statusMessage: 'フォルダ選択をキャンセルしました',
      });
      return;
    }

    await get().hydrateProject(root, 'dialog');
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
            revision: 0,
            document:
              document && remapped !== currentFilePath
                ? {
                    ...document,
                    title: remapped === result.path ? titleFromPath(remapped) : document.title,
                    updatedAt: document.updatedAt,
                    source: { ...document.source, originPath: remapped },
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

  reorderChapters: (orderedIds: string[]) => {
    const document = get().document;
    if (!document) {
      return;
    }

    set({
      document: reorderChaptersInDocument(document, orderedIds),
      dirty: true,
      statusMessage: '章順を変更しました',
    });
  },

  deleteChapter: (chapterId: string) => {
    const document = get().document;
    if (!document) {
      return;
    }

    set({
      document: deleteChapterFromDocument(document, chapterId),
      dirty: true,
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

  syncDocumentStructure: (input) => {
    const document = get().document;
    if (!document) {
      return;
    }

    set({
      document: replaceDocumentStructureInDocument(document, input),
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
    const { document, analysisSettings } = get();
    if (!document) {
      return;
    }

    if (!analysisSettings.providers.openai.apiKeyConfigured) {
      set({ statusMessage: 'OpenAI API キーを設定すると解析を実行できます。' });
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

  runAnalysisFor: async (paragraphId: string) => {
    const { document, analysisSettings } = get();
    if (!document || !analysisSettings.providers.openai.apiKeyConfigured) return;

    const paragraph = document.paragraphs.find((p) => p.id === paragraphId);
    if (!paragraph) return;

    set({
      document: {
        ...document,
        paragraphs: document.paragraphs.map((p) =>
          p.id === paragraphId ? { ...p, lizard: { ...p.lizard, status: 'pending' } } : p
        ),
      },
      statusMessage: '段落を解析中...',
    });

    const payload: AnalysisRunInput = {
      documentId: document.documentId,
      personaMode: document.personaMode,
      promptVersion: 'v1.0.0',
      paragraphs: [{ paragraphId: paragraph.id, order: paragraph.order, text: paragraph.light.text }],
    };

    try {
      const result = await window.litelizard.runAnalysis(payload);
      const analyzed = result.results.find((r) => r.paragraphId === paragraphId);

      set((state) => {
        if (!state.document || !analyzed) return {};
        return {
          document: {
            ...state.document,
            paragraphs: state.document.paragraphs.map((p) =>
              p.id === paragraphId
                ? {
                    ...p,
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
                  }
                : p
            ),
            updatedAt: new Date().toISOString(),
          },
          dirty: true,
          statusMessage: '段落の解析が完了しました',
        };
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Analysis failed';
      set((state) => {
        if (!state.document) return {};
        return {
          document: {
            ...state.document,
            paragraphs: state.document.paragraphs.map((p) =>
              p.id === paragraphId
                ? { ...p, lizard: { status: 'failed', error: { code: 'ANALYSIS_ABORTED', message } } }
                : p
            ),
          },
          statusMessage: `解析に失敗しました: ${message}`,
        };
      });
    }
  },

  setEditorMode: (mode: EditorMode) => {
    set({
      editorMode: mode,
      analysisLayerOpen: mode === 'writing' ? false : get().analysisLayerOpen,
    });
  },

  setViewScale: (viewScale: ViewScale) => {
    set({ viewScale });
  },

  toggleViewScale: () => {
    const viewScale = get().viewScale;
    set({ viewScale: viewScale === 'micro' ? 'macro' : 'micro' });
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

  openSettingsPanel: () => {
    set({ activeWorkspacePanel: 'settings', statusMessage: '設定を開きました' });
  },

  openEditorPanel: () => {
    set({ activeWorkspacePanel: 'editor', statusMessage: 'ドキュメント表示に戻りました' });
  },

  setAnalysisLayerOpen: (open: boolean) => {
    if (get().activeWorkspacePanel !== 'editor') {
      set({ analysisLayerOpen: false });
      return;
    }
    const mode = get().editorMode;
    if (mode === 'writing') {
      set({ analysisLayerOpen: false });
      return;
    }
    set({ analysisLayerOpen: open });
  },

  toggleAnalysisLayer: () => {
    if (get().activeWorkspacePanel !== 'editor') {
      return;
    }
    const { editorMode, analysisLayerOpen } = get();
    if (editorMode === 'writing') {
      set({ editorMode: 'structure', analysisLayerOpen: true });
      return;
    }
    set({ analysisLayerOpen: !analysisLayerOpen });
  },

  bootstrapAnalysisSettings: async () => {
    try {
      const analysisSettings = await window.litelizard.loadAnalysisSettings();
      set({ analysisSettings });
    } catch {
      set({ statusMessage: '分析設定の取得に失敗しました' });
    }
  },

  saveProviderApiKey: async (providerId, apiKey) => {
    const trimmed = apiKey.trim();
    if (!trimmed) {
      set({ statusMessage: 'APIキーを入力してください' });
      return;
    }

    try {
      await window.litelizard.saveProviderApiKey(providerId, trimmed);
      set((state) => ({
        analysisSettings: {
          ...state.analysisSettings,
          providers: {
            ...state.analysisSettings.providers,
            [providerId]: {
              ...state.analysisSettings.providers[providerId],
              apiKeyConfigured: true,
            },
          },
        },
        statusMessage: `${providerId === 'openai' ? 'OpenAI' : 'Anthropic'} APIキーを保存しました`,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      set({ statusMessage: `APIキー保存に失敗しました: ${message}` });
    }
  },

  clearProviderApiKey: async (providerId) => {
    try {
      await window.litelizard.clearProviderApiKey(providerId);
      set((state) => ({
        analysisSettings: {
          ...state.analysisSettings,
          providers: {
            ...state.analysisSettings.providers,
            [providerId]: {
              ...state.analysisSettings.providers[providerId],
              apiKeyConfigured: false,
            },
          },
        },
        statusMessage: `${providerId === 'openai' ? 'OpenAI' : 'Anthropic'} APIキーを削除しました`,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      set({ statusMessage: `APIキー削除に失敗しました: ${message}` });
    }
  },

  saveAnalysisSettings: async (input) => {
    try {
      await window.litelizard.saveAnalysisSettings(input);
      const current = get().analysisSettings;
      const analysisSettings: AnalysisSettings = {
        ...current,
        defaultProvider: input.defaultProvider,
        providers: {
          openai: {
            ...current.providers.openai,
            defaultModel: input.providers.openai.defaultModel,
          },
          anthropic: {
            ...current.providers.anthropic,
            defaultModel: input.providers.anthropic.defaultModel,
          },
        },
        localLlm: {
          endpoint: input.localLlm.endpoint,
          defaultModel: input.localLlm.defaultModel,
          configured: Boolean(input.localLlm.endpoint.trim() && input.localLlm.defaultModel.trim()),
        },
      };
      set({ analysisSettings, statusMessage: '分析設定を保存しました' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      set({ statusMessage: `分析設定の保存に失敗しました: ${message}` });
    }
  },

  testLocalLlmConnection: async (input) => {
    try {
      const result = await window.litelizard.testLocalLlmConnection(input);
      if (!result.ok) {
        set({ statusMessage: result.message });
        return { ok: false, message: result.message };
      }

      const message = result.model
        ? `ローカル LLM に接続できました: ${result.model}`
        : 'ローカル LLM に接続できました';
      set({ statusMessage: message });
      return { ok: true, message };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      const nextMessage = `接続テストに失敗しました: ${message}`;
      set({ statusMessage: nextMessage });
      return { ok: false, message: nextMessage };
    }
  },
}));
