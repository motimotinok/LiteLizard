import { create } from 'zustand';
import {
  DEFAULT_ANALYSIS_SETTINGS,
  type AnalysisResult,
  type AnalysisRunInput,
  type AnalysisSettings,
  type AnalysisSettingsInput,
  type FileNode,
  type LiteLizardDocument,
  type ParagraphAnalysisPattern,
  type ReadingAgent,
  type ReadingAgentInput,
  type RecentProjectEntry,
} from '@litelizard/shared';
import type { DocumentStructureInput } from '../types/documentStructure.js';
import {
  appendPatternToHistories,
  type AnalysisHistoriesByParagraphId,
  projectAnalysisHistoriesToDocument,
  type SelectedPatternIndexByParagraphId,
  toAnalysisHistories,
} from './analysisHistory.js';
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
export type AnalysisMode = 'paragraph' | 'chapter' | 'document';
export type StartupState = 'loading' | 'needs-project' | 'ready';
export type WorkspacePanel = 'editor' | 'settings' | 'agents' | 'search';

export interface PendingParagraphNavigation {
  paragraphId: string;
  nonce: number;
}

export interface AnalysisRunSummary {
  targetCount: number;
  successCount: number;
  failureCount: number;
}

export interface UndoSnapshot {
  lexicalStateJson?: string;
  documentSnapshot: LiteLizardDocument;
}

function getSelectedAnalysisProviderState(settings: AnalysisSettings) {
  if (settings.defaultProvider === 'openai') {
    return {
      id: 'openai' as const,
      label: 'OpenAI',
      runnable: settings.providers.openai.apiKeyConfigured,
      reason: settings.providers.openai.apiKeyConfigured
        ? null
        : 'OpenAI API キーが未設定です。設定画面で保存してください。',
    };
  }

  if (settings.defaultProvider === 'anthropic') {
    return {
      id: 'anthropic' as const,
      label: 'Anthropic',
      runnable: settings.providers.anthropic.apiKeyConfigured,
      reason: settings.providers.anthropic.apiKeyConfigured
        ? null
        : 'Anthropic API キーが未設定です。設定画面で保存してください。',
    };
  }

  return {
    id: 'local-llm' as const,
    label: 'Local LLM',
    runnable: settings.localLlm.configured,
    reason: settings.localLlm.configured
      ? null
      : 'ローカル LLM のエンドポイントとモデルを設定してください。',
  };
}

function cloneAnalysisSettings(): AnalysisSettings {
  return structuredClone(DEFAULT_ANALYSIS_SETTINGS);
}

interface AppState {
  startupState: StartupState;
  rootPath: string | null;
  recentProjects: RecentProjectEntry[];
  tree: FileNode[];
  currentFilePath: string | null;
  document: LiteLizardDocument | null;
  revision: number;
  dirty: boolean;
  currentAnalysisGeneration: number | null;
  analysisHistoriesByParagraphId: AnalysisHistoriesByParagraphId;
  selectedPatternIndexByParagraphId: SelectedPatternIndexByParagraphId;
  generationSyncPending: boolean;
  analysisRunSummary: AnalysisRunSummary | null;
  analysisSettings: AnalysisSettings;
  agents: ReadingAgent[];
  activeAgentId: string | null;
  agentsLoaded: boolean;
  activeWorkspacePanel: WorkspacePanel;
  editorMode: EditorMode;
  viewScale: ViewScale;
  analysisMode: AnalysisMode;
  analysisLayerOpen: boolean;
  statusMessage: string;
  pendingParagraphNavigation: PendingParagraphNavigation | null;
  undoStack: UndoSnapshot[];
  redoStack: UndoSnapshot[];
  pushUndo: (snapshot: UndoSnapshot) => void;
  undoWithCurrentSnapshot: (current: UndoSnapshot) => UndoSnapshot | null;
  redoWithCurrentSnapshot: (current: UndoSnapshot) => UndoSnapshot | null;
  restoreSnapshot: (snapshot: UndoSnapshot) => void;
  clearUndoStacks: () => void;
  clearRedoStack: () => void;
  hydrateProject: (rootPath: string, source: 'restore' | 'dialog') => Promise<void>;
  restoreLastProject: () => Promise<void>;
  openFolder: () => Promise<void>;
  loadRecentProjects: () => Promise<void>;
  openRecentProject: (folderPath: string) => Promise<void>;
  removeRecentProject: (folderPath: string) => Promise<void>;
  createDocument: (title: string, parentPath?: string) => Promise<void>;
  createEntry: (parentPath: string, type: 'file' | 'folder', name: string) => Promise<void>;
  renameEntry: (targetPath: string, nextName: string) => Promise<void>;
  moveEntry: (sourcePath: string, destinationFolderPath: string) => Promise<void>;
  deleteEntry: (targetPath: string) => Promise<void>;
  importTextFile: (createParent: string) => Promise<void>;
  exportCurrentDocumentText: () => Promise<void>;
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
  selectAnalysisPatternIndex: (paragraphId: string, patternIndex: number) => void;
  setEditorMode: (mode: EditorMode) => void;
  setViewScale: (viewScale: ViewScale) => void;
  setAnalysisMode: (mode: AnalysisMode) => void;
  toggleViewScale: () => void;
  cycleEditorMode: () => void;
  openSettingsPanel: () => void;
  openEditorPanel: () => void;
  openAgentsPanel: () => void;
  openSearchPanel: () => void;
  requestNavigateToParagraph: (paragraphId: string) => void;
  consumePendingParagraphNavigation: () => void;
  setAnalysisLayerOpen: (open: boolean) => void;
  toggleAnalysisLayer: () => void;
  loadAgents: () => Promise<void>;
  setActiveAgent: (id: string) => Promise<void>;
  saveAgent: (input: ReadingAgentInput & { id?: string }) => Promise<ReadingAgent>;
  deleteAgent: (id: string) => Promise<void>;
  resetAgents: () => Promise<ReadingAgent[]>;
  dryRunAgent: (input: {
    agent: ReadingAgentInput & { id?: string };
    paragraphId: string;
    text: string;
    order?: number;
  }) => Promise<AnalysisResult>;
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

function toAnalysisParagraphInput(document: LiteLizardDocument) {
  return document.paragraphs.map((paragraph) => ({
    paragraphId: paragraph.id,
    order: paragraph.order,
    text: paragraph.light.text,
    chapterId: paragraph.chapterId,
  }));
}

function getAnalysisStructureSignature(document: LiteLizardDocument) {
  const chapterSignature = document.chapters
    .map((chapter) => `${chapter.id}:${chapter.order}`)
    .join('|');
  const paragraphSignature = document.paragraphs
    .map((paragraph) => `${paragraph.id}:${paragraph.order}:${paragraph.chapterId}`)
    .join('|');
  return `${document.documentId}::${chapterSignature}::${paragraphSignature}`;
}

function formatAnalysisRunSummary(prefix: string, summary: AnalysisRunSummary) {
  return `${prefix}（対象 ${summary.targetCount} / 成功 ${summary.successCount} / 失敗 ${summary.failureCount}）`;
}

function isGenerationManagedDocument(document: LiteLizardDocument | null, rootPath: string | null) {
  return Boolean(rootPath && document?.source?.format === 'lzl-v1');
}

function shouldRotateAnalysisGeneration(
  previousDocument: LiteLizardDocument,
  nextDocument: LiteLizardDocument,
): boolean {
  if (previousDocument.paragraphs.length !== nextDocument.paragraphs.length) {
    return true;
  }

  if (previousDocument.chapters.length !== nextDocument.chapters.length) {
    return true;
  }

  const chapterChanged = previousDocument.chapters.some((chapter, index) => {
    const nextChapter = nextDocument.chapters[index];
    return !nextChapter || chapter.id !== nextChapter.id || chapter.order !== nextChapter.order;
  });
  if (chapterChanged) {
    return true;
  }

  return previousDocument.paragraphs.some((paragraph, index) => {
    const nextParagraph = nextDocument.paragraphs[index];
    return (
      !nextParagraph ||
      paragraph.id !== nextParagraph.id ||
      paragraph.order !== nextParagraph.order ||
      paragraph.chapterId !== nextParagraph.chapterId
    );
  });
}

function createStoredPattern(
  result: {
    analyzedAt: string;
    emotion: string[];
    theme: string[];
    deepMeaning: string;
    confidence: number;
    model: string;
  },
  sourceText: string,
): ParagraphAnalysisPattern {
  return {
    analyzedAt: result.analyzedAt,
    result: {
      emotion: result.emotion,
      theme: result.theme,
      deepMeaning: result.deepMeaning,
      confidence: result.confidence,
      model: result.model,
      sourceText,
    },
  };
}

function applyProjectedDocument(
  document: LiteLizardDocument,
  analysisHistoriesByParagraphId: AnalysisHistoriesByParagraphId,
  selectedPatternIndexByParagraphId: SelectedPatternIndexByParagraphId,
): LiteLizardDocument {
  return projectAnalysisHistoriesToDocument(
    document,
    analysisHistoriesByParagraphId,
    selectedPatternIndexByParagraphId,
  );
}

export const useAppStore = create<AppState>((set, get) => {
  let generationSyncRequestSeq = 0;
  let latestGenerationSyncRequestId = 0;

  const resetAnalysisState = () => ({
    currentAnalysisGeneration: null,
    analysisHistoriesByParagraphId: {} as AnalysisHistoriesByParagraphId,
    selectedPatternIndexByParagraphId: {} as SelectedPatternIndexByParagraphId,
    generationSyncPending: false,
    analysisRunSummary: null,
  });

  const resetUndoState = () => ({
    undoStack: [] as UndoSnapshot[],
    redoStack: [] as UndoSnapshot[],
  });

  const nextGenerationSyncRequestId = () => {
    generationSyncRequestSeq += 1;
    latestGenerationSyncRequestId = generationSyncRequestSeq;
    return latestGenerationSyncRequestId;
  };

  const syncGenerationForDocument = async (
    document: LiteLizardDocument,
    requestId: number,
    options?: { blockMessage?: string },
  ) => {
    const rootPath = get().rootPath;
    if (!isGenerationManagedDocument(document, rootPath)) {
      return true;
    }

    const blockMessage = options?.blockMessage;
    const expectedSignature = getAnalysisStructureSignature(document);

    try {
      const generation = await window.litelizard.createAnalysisGeneration(rootPath!, document.documentId);
      const state = get();
      if (
        requestId !== latestGenerationSyncRequestId ||
        !state.document ||
        state.document.documentId !== document.documentId ||
        getAnalysisStructureSignature(state.document) !== expectedSignature
      ) {
        return true;
      }
      set({
        currentAnalysisGeneration: generation,
        generationSyncPending: false,
        statusMessage: blockMessage ? '解析世代を再同期しました。' : state.statusMessage,
      });
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      const state = get();
      if (
        requestId !== latestGenerationSyncRequestId ||
        !state.document ||
        state.document.documentId !== document.documentId ||
        getAnalysisStructureSignature(state.document) !== expectedSignature
      ) {
        return false;
      }
      set({
        generationSyncPending: true,
        statusMessage: blockMessage ?? `解析世代の作成に失敗しました: ${message}`,
      });
      return false;
    }
  };

  const markStructureChanged = (nextDocument: LiteLizardDocument, statusMessage: string) => {
    const managed = isGenerationManagedDocument(nextDocument, get().rootPath);
    if (managed) {
      nextGenerationSyncRequestId();
    }
    set({
      document: nextDocument,
      dirty: true,
      statusMessage,
      ...(managed
        ? {
            currentAnalysisGeneration: null,
            analysisHistoriesByParagraphId: {},
            selectedPatternIndexByParagraphId: {},
            generationSyncPending: true,
          }
        : {}),
    });
  };

  const ensureGenerationReady = async (document: LiteLizardDocument) => {
    if (!isGenerationManagedDocument(document, get().rootPath)) {
      return true;
    }
    if (!get().generationSyncPending) {
      return true;
    }
    if (get().dirty) {
      set({
        statusMessage: '構造変更の保存が完了していないため、解析を開始できません。保存完了後に再実行してください。',
      });
      return false;
    }
    return syncGenerationForDocument(document, latestGenerationSyncRequestId, {
      blockMessage: '解析世代の同期に失敗しているため、解析を開始できません。もう一度お試しください。',
    });
  };

  const appendPatternToStore = (
    paragraphId: string,
    pattern: ParagraphAnalysisPattern,
    requestId?: string,
  ) => {
    set((state) => {
      if (!state.document) {
        return {};
      }

      const nextHistories = appendPatternToHistories(
        state.analysisHistoriesByParagraphId,
        paragraphId,
        pattern,
      );
      const nextSelectedIndices = {
        ...state.selectedPatternIndexByParagraphId,
        [paragraphId]: nextHistories[paragraphId].length - 1,
      };
      let nextDocument = applyProjectedDocument(state.document, nextHistories, nextSelectedIndices);

      if (requestId) {
        nextDocument = {
          ...nextDocument,
          paragraphs: nextDocument.paragraphs.map((paragraph) =>
            paragraph.id === paragraphId
              ? {
                  ...paragraph,
                  lizard: {
                    ...paragraph.lizard,
                    requestId,
                  },
                }
              : paragraph,
          ),
        };
      }

      return {
        document: nextDocument,
        analysisHistoriesByParagraphId: nextHistories,
        selectedPatternIndexByParagraphId: nextSelectedIndices,
        currentAnalysisGeneration:
          state.currentAnalysisGeneration ?? (isGenerationManagedDocument(state.document, state.rootPath) ? 1 : null),
      };
    });
  };

  return ({
    startupState: 'loading',
    rootPath: null,
    recentProjects: [],
    tree: [],
    currentFilePath: null,
    document: null,
    revision: 0,
    dirty: false,
    ...resetAnalysisState(),
    ...resetUndoState(),
    analysisSettings: cloneAnalysisSettings(),
    agents: [],
    activeAgentId: null,
    agentsLoaded: false,
    activeWorkspacePanel: 'editor',
    editorMode: 'writing',
    viewScale: 'micro',
    analysisMode: 'paragraph',
    analysisLayerOpen: false,
    statusMessage: '準備完了',
    pendingParagraphNavigation: null,

  pushUndo: (snapshot) => {
    set((state) => {
      const next = [...state.undoStack, snapshot];
      return {
        undoStack: next.length > 50 ? next.slice(next.length - 50) : next,
        redoStack: [],
      };
    });
  },

  undoWithCurrentSnapshot: (current) => {
    const { undoStack } = get();
    if (undoStack.length === 0) return null;
    const target = undoStack[undoStack.length - 1];
    set((state) => ({
      undoStack: state.undoStack.slice(0, -1),
      redoStack: [...state.redoStack, current],
    }));
    return target;
  },

  redoWithCurrentSnapshot: (current) => {
    const { redoStack } = get();
    if (redoStack.length === 0) return null;
    const target = redoStack[redoStack.length - 1];
    set((state) => ({
      redoStack: state.redoStack.slice(0, -1),
      undoStack: [...state.undoStack, current],
    }));
    return target;
  },

  restoreSnapshot: (snapshot) => {
    const managed = isGenerationManagedDocument(snapshot.documentSnapshot, get().rootPath);
    if (managed) {
      nextGenerationSyncRequestId();
    }
    set({
      document: snapshot.documentSnapshot,
      dirty: true,
      statusMessage: '編集中',
      ...(managed
        ? {
            currentAnalysisGeneration: null,
            analysisHistoriesByParagraphId: {},
            selectedPatternIndexByParagraphId: {},
            generationSyncPending: true,
          }
        : {}),
    });
  },

  clearUndoStacks: () => {
    set({ undoStack: [], redoStack: [] });
  },

  clearRedoStack: () => {
    set({ redoStack: [] });
  },

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
        ...resetAnalysisState(),
        ...resetUndoState(),
        statusMessage:
          source === 'restore'
            ? `前回のフォルダを復元しました: ${rootPath}`
            : `フォルダを開きました: ${rootPath}`,
      });
      void get().loadRecentProjects();
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
        ...resetAnalysisState(),
        ...resetUndoState(),
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
        await get().loadRecentProjects();
        return;
      }

      await get().hydrateProject(root, 'restore');
      if (get().startupState === 'needs-project') {
        await get().loadRecentProjects();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('[Renderer restoreLastProject] failed', error);
      set({
        startupState: 'needs-project',
        statusMessage: `前回のフォルダ確認に失敗しました: ${message}`,
      });
      await get().loadRecentProjects();
    }
  },

  loadRecentProjects: async () => {
    if (!window.litelizard) {
      return;
    }
    try {
      const recentProjects = await window.litelizard.getRecentProjects();
      set({ recentProjects });
    } catch (error) {
      console.error('[Renderer loadRecentProjects] failed', error);
    }
  },

  openRecentProject: async (folderPath) => {
    if (!window.litelizard) {
      return;
    }
    set({ startupState: 'loading', statusMessage: `フォルダを開いています: ${folderPath}` });
    await get().hydrateProject(folderPath, 'restore');
    if (get().rootPath !== folderPath) {
      try {
        await window.litelizard.removeRecentProject(folderPath);
      } catch (error) {
        console.error('[Renderer openRecentProject] removeRecentProject failed', error);
      }
      await get().loadRecentProjects();
      set({
        startupState: 'needs-project',
        statusMessage: `フォルダを開けなかったため、最近リストから除外しました: ${folderPath}`,
      });
    }
  },

  removeRecentProject: async (folderPath) => {
    if (!window.litelizard) {
      return;
    }
    try {
      await window.litelizard.removeRecentProject(folderPath);
    } catch (error) {
      console.error('[Renderer removeRecentProject] failed', error);
    }
    await get().loadRecentProjects();
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
        ...resetAnalysisState(),
        ...resetUndoState(),
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
          ...resetAnalysisState(),
          ...resetUndoState(),
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
                    source: document.source
                      ? { ...document.source, format: document.source.format, originPath: remapped }
                      : { format: 'litelizard-json', originPath: remapped },
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

  moveEntry: async (sourcePath: string, destinationFolderPath: string) => {
    try {
      const result = await window.litelizard.moveEntry(sourcePath, destinationFolderPath);

      const rootPath = get().rootPath;
      if (rootPath) {
        const tree = await window.litelizard.listTree(rootPath);
        set({ tree });
      }

      const currentFilePath = get().currentFilePath;
      if (currentFilePath) {
        const remapped = remapPathForRename(currentFilePath, sourcePath, result.path);
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
                    source: document.source
                      ? { ...document.source, format: document.source.format, originPath: remapped }
                      : { format: 'litelizard-json', originPath: remapped },
                  }
                : document,
          });
        }
      }

      set({ statusMessage: 'ファイルを移動しました' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      set({ statusMessage: `移動に失敗しました: ${message}` });
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
          ...resetAnalysisState(),
        });
      }

      set({ statusMessage: '削除しました' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      set({ statusMessage: `削除に失敗しました: ${message}` });
    }
  },

  importTextFile: async (createParent: string) => {
    try {
      const result = await window.litelizard.importTextFile(createParent);
      if (!result) return;

      const rootPath = get().rootPath;
      if (rootPath) {
        const tree = await window.litelizard.listTree(rootPath);
        set({ tree });
      }

      const document = await window.litelizard.loadDocument(result.filePath);
      set({
        currentFilePath: result.filePath,
        document,
        revision: 0,
        dirty: false,
        ...resetAnalysisState(),
        ...resetUndoState(),
        statusMessage: 'テキストをインポートしました',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (message.includes('IMPORT_FILE_ALREADY_EXISTS')) {
        set({ statusMessage: '同名の .lzl ファイルが既に存在します' });
        return;
      }
      set({ statusMessage: `インポートに失敗しました: ${message}` });
    }
  },

  exportCurrentDocumentText: async () => {
    const { currentFilePath, document } = get();
    if (!document) {
      set({ statusMessage: '書き出すドキュメントがありません' });
      return;
    }

    try {
      const result = await window.litelizard.exportDocumentText(currentFilePath, document);
      if (!result) {
        set({ statusMessage: 'テキスト書き出しをキャンセルしました' });
        return;
      }
      set({ statusMessage: `テキストを書き出しました: ${result.filePath}` });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      set({ statusMessage: `テキスト書き出しに失敗しました: ${message}` });
    }
  },

  loadDocument: async (filePath: string) => {
    try {
      const document = await window.litelizard.loadDocument(filePath);
      const rootPath = get().rootPath;
      const analysisFile = isGenerationManagedDocument(document, rootPath)
        ? await window.litelizard.loadAnalysis(rootPath!, document.documentId, filePath).catch(() => null)
        : null;
      const analysisHistoriesByParagraphId = toAnalysisHistories(analysisFile);
      const selectedPatternIndexByParagraphId: SelectedPatternIndexByParagraphId = {};
      const resolvedDoc = applyProjectedDocument(
        document,
        analysisHistoriesByParagraphId,
        selectedPatternIndexByParagraphId,
      );

      set({
        currentFilePath: filePath,
        document: resolvedDoc,
        revision: 0,
        dirty: false,
        currentAnalysisGeneration: analysisFile?.generation ?? null,
        analysisHistoriesByParagraphId,
        selectedPatternIndexByParagraphId,
        generationSyncPending: false,
        ...resetUndoState(),
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

    markStructureChanged(reorderParagraphsInDocument(document, orderedIds), '段落順を変更しました');
  },

  reorderChapters: (orderedIds: string[]) => {
    const document = get().document;
    if (!document) {
      return;
    }

    markStructureChanged(reorderChaptersInDocument(document, orderedIds), '章順を変更しました');
  },

  deleteChapter: (chapterId: string) => {
    const document = get().document;
    if (!document) {
      return;
    }

    markStructureChanged(deleteChapterFromDocument(document, chapterId), '章を削除しました');
  },

  replaceParagraphs: (paragraphTexts: string[]) => {
    const document = get().document;
    if (!document) {
      return;
    }

    const nextDocument = replaceParagraphsInDocument(document, paragraphTexts);
    if (shouldRotateAnalysisGeneration(document, nextDocument)) {
      markStructureChanged(nextDocument, '編集中');
      return;
    }

    set({
      document: nextDocument,
      dirty: true,
      statusMessage: '編集中',
    });
  },

  syncDocumentStructure: (input) => {
    const document = get().document;
    if (!document) {
      return;
    }

    const nextDocument = replaceDocumentStructureInDocument(document, input);
    if (shouldRotateAnalysisGeneration(document, nextDocument)) {
      markStructureChanged(nextDocument, '編集中');
      return;
    }

    set({
      document: nextDocument,
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
      const stateAfterSave = get();
      if (
        stateAfterSave.document &&
        stateAfterSave.document.documentId === document.documentId &&
        stateAfterSave.generationSyncPending &&
        !stateAfterSave.dirty
      ) {
        void syncGenerationForDocument(
          stateAfterSave.document,
          latestGenerationSyncRequestId,
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      set({ statusMessage: `保存に失敗しました: ${message}` });
    }
  },

  runAnalysis: async () => {
    const { document, analysisSettings, activeAgentId } = get();
    if (!document) {
      return;
    }
    if (!activeAgentId) {
      set({ statusMessage: '分析エージェントを選択してください' });
      return;
    }

    const selectedProvider = getSelectedAnalysisProviderState(analysisSettings);
    if (!selectedProvider.runnable) {
      set({ statusMessage: selectedProvider.reason ?? `${selectedProvider.label} を設定してください。` });
      return;
    }

    if (!(await ensureGenerationReady(document))) {
      return;
    }

    const staleParagraphs = collectStaleParagraphs(document);
    if (staleParagraphs.length === 0) {
      const summary = { targetCount: 0, successCount: 0, failureCount: 0 };
      set({
        analysisRunSummary: summary,
        statusMessage: formatAnalysisRunSummary('再解析が必要な段落はありません', summary),
      });
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
    set({ document: pendingDoc, analysisRunSummary: null, statusMessage: '全体解析を実行中...' });

    const payload: AnalysisRunInput = {
      documentId: document.documentId,
      agentId: activeAgentId,
      personaMode: document.personaMode,
      promptVersion: 'v1.0.0',
      paragraphs: staleParagraphs.map((paragraph) => ({
        paragraphId: paragraph.id,
        order: paragraph.order,
        text: paragraph.light.text,
      })),
      documentParagraphs: toAnalysisParagraphInput(document),
    };

    const rootPath = get().rootPath;
    const staleTextMap = new Map(staleParagraphs.map((p) => [p.id, p.light.text]));
    const progressedParagraphIds = new Set<string>();
    const analysisTargetSignature = getAnalysisStructureSignature(document);

    const unsubscribe = window.litelizard.onAnalysisProgress(({ paragraphId, result }) => {
      const state = get();
      if (
        !state.document ||
        state.document.documentId !== document.documentId ||
        state.generationSyncPending ||
        getAnalysisStructureSignature(state.document) !== analysisTargetSignature
      ) {
        return;
      }

      progressedParagraphIds.add(paragraphId);

      if (rootPath && document.source?.format === 'lzl-v1') {
        const pattern = createStoredPattern(result, staleTextMap.get(paragraphId) ?? '');
        window.litelizard
          .saveAnalysisResult(rootPath, document.documentId, paragraphId, pattern)
          .catch(() => {});
        appendPatternToStore(paragraphId, pattern);
        return;
      }

      appendPatternToStore(paragraphId, createStoredPattern(result, staleTextMap.get(paragraphId) ?? ''));
    });

    try {
      const result = await window.litelizard.runAnalysis(payload);
      result.results.forEach((analyzed) => {
        if (!progressedParagraphIds.has(analyzed.paragraphId)) {
          appendPatternToStore(
            analyzed.paragraphId,
            createStoredPattern(analyzed, staleTextMap.get(analyzed.paragraphId) ?? ''),
          );
        }
      });

      const succeededParagraphIds = new Set([
        ...Array.from(progressedParagraphIds),
        ...result.results.map((analyzed) => analyzed.paragraphId),
      ]);
      const summary = {
        targetCount: staleParagraphs.length,
        successCount: staleParagraphs.filter((paragraph) => succeededParagraphIds.has(paragraph.id)).length,
        failureCount: staleParagraphs.filter((paragraph) => !succeededParagraphIds.has(paragraph.id)).length,
      };

      set((state) => {
        if (!state.document) return {};
        return {
          document: {
            ...state.document,
            paragraphs: state.document.paragraphs.map((paragraph) =>
              succeededParagraphIds.has(paragraph.id)
                ? {
                    ...paragraph,
                    lizard: {
                      ...paragraph.lizard,
                      requestId: result.requestId,
                    },
                  }
                : staleTextMap.has(paragraph.id)
                  ? {
                      ...paragraph,
                      lizard: {
                        status: 'failed',
                        error: {
                          code: 'ANALYSIS_PARTIAL_FAILURE',
                          message: '解析結果が返りませんでした。',
                        },
                      },
                    }
                : paragraph,
            ),
            updatedAt: new Date().toISOString(),
          },
          dirty: true,
          analysisRunSummary: summary,
          statusMessage: formatAnalysisRunSummary('全体解析が完了しました', summary),
        };
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Analysis failed';
      const successCount = staleParagraphs.filter((paragraph) =>
        progressedParagraphIds.has(paragraph.id),
      ).length;
      const summary = {
        targetCount: staleParagraphs.length,
        successCount,
        failureCount: staleParagraphs.length - successCount,
      };
      set((state) => {
        if (!state.document) return {};
        return {
          document: {
            ...state.document,
            paragraphs: state.document.paragraphs.map((p) =>
              p.lizard.status === 'pending'
                ? { ...p, lizard: { status: 'failed', error: { code: 'ANALYSIS_ABORTED', message } } }
                : p
            ),
          },
          // progress で complete になった段落があれば保存が必要
          dirty: true,
          analysisRunSummary: summary,
          statusMessage: formatAnalysisRunSummary(`解析に失敗しました: ${message}`, summary),
        };
      });
    } finally {
      unsubscribe();
    }
  },

  runAnalysisFor: async (paragraphId: string) => {
    const { document, analysisSettings, activeAgentId } = get();
    if (!document) return;
    if (!activeAgentId) {
      set({ statusMessage: '分析エージェントを選択してください' });
      return;
    }

    const selectedProvider = getSelectedAnalysisProviderState(analysisSettings);
    if (!selectedProvider.runnable) {
      set({ statusMessage: selectedProvider.reason ?? `${selectedProvider.label} を設定してください。` });
      return;
    }

    if (!(await ensureGenerationReady(document))) {
      return;
    }

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
      agentId: activeAgentId,
      personaMode: document.personaMode,
      promptVersion: 'v1.0.0',
      paragraphs: [{ paragraphId: paragraph.id, order: paragraph.order, text: paragraph.light.text }],
      documentParagraphs: toAnalysisParagraphInput(document),
    };

    const rootPath = get().rootPath;
    const progressedParagraphIds = new Set<string>();
    const analysisTargetSignature = getAnalysisStructureSignature(document);
    const unsubscribe = window.litelizard.onAnalysisProgress(({ paragraphId: progressedParagraphId, result }) => {
      if (progressedParagraphId !== paragraphId) {
        return;
      }
      const state = get();
      if (
        !state.document ||
        state.document.documentId !== document.documentId ||
        state.generationSyncPending ||
        getAnalysisStructureSignature(state.document) !== analysisTargetSignature
      ) {
        return;
      }

      progressedParagraphIds.add(progressedParagraphId);
      const pattern = createStoredPattern(result, paragraph.light.text);
      if (rootPath && document.source?.format === 'lzl-v1') {
        window.litelizard
          .saveAnalysisResult(rootPath, document.documentId, progressedParagraphId, pattern)
          .catch(() => {});
      }
      appendPatternToStore(progressedParagraphId, pattern);
    });

    try {
      const result = await window.litelizard.runAnalysis(payload);
      const analyzed = result.results.find((r) => r.paragraphId === paragraphId);

      if (analyzed && !progressedParagraphIds.has(paragraphId)) {
        const pattern = createStoredPattern(analyzed, paragraph.light.text);
        if (rootPath && document.source?.format === 'lzl-v1') {
          await Promise.allSettled([
            window.litelizard.saveAnalysisResult(rootPath, document.documentId, analyzed.paragraphId, pattern),
          ]);
        }
        appendPatternToStore(analyzed.paragraphId, pattern);
      }

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
                      ...p.lizard,
                      requestId: result.requestId,
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
    } finally {
      unsubscribe();
    }
  },

  selectAnalysisPatternIndex: (paragraphId, patternIndex) => {
    set((state) => {
      if (!state.document) {
        return {};
      }

      const nextSelectedPatternIndexByParagraphId = {
        ...state.selectedPatternIndexByParagraphId,
        [paragraphId]: patternIndex,
      };

      return {
        selectedPatternIndexByParagraphId: nextSelectedPatternIndexByParagraphId,
        document: applyProjectedDocument(
          state.document,
          state.analysisHistoriesByParagraphId,
          nextSelectedPatternIndexByParagraphId,
        ),
      };
    });
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

  setAnalysisMode: (mode: AnalysisMode) => {
    set({ analysisMode: mode });
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
  openAgentsPanel: () => {
    set({ activeWorkspacePanel: 'agents', statusMessage: '分析エージェントを開きました' });
  },

  openEditorPanel: () => {
    set({ activeWorkspacePanel: 'editor', statusMessage: 'ドキュメント表示に戻りました' });
  },

  openSearchPanel: () => {
    set({ activeWorkspacePanel: 'search', statusMessage: '検索を開きました' });
  },

  requestNavigateToParagraph: (paragraphId: string) => {
    set({
      activeWorkspacePanel: 'editor',
      pendingParagraphNavigation: { paragraphId, nonce: Date.now() },
      statusMessage: '段落へ移動しました',
    });
  },

  consumePendingParagraphNavigation: () => {
    set({ pendingParagraphNavigation: null });
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

  loadAgents: async () => {
    try {
      const [agents, savedActiveAgentId] = await Promise.all([
        window.litelizard.listReadingAgents(),
        window.litelizard.getActiveReadingAgentId(),
      ]);
      const activeAgentId =
        savedActiveAgentId && agents.some((agent) => agent.id === savedActiveAgentId)
          ? savedActiveAgentId
          : agents[0]?.id ?? null;

      if (activeAgentId && activeAgentId !== savedActiveAgentId) {
        await window.litelizard.setActiveReadingAgentId(activeAgentId);
      }

      set({
        agents,
        activeAgentId,
        agentsLoaded: true,
        statusMessage: agents.length > 0 ? get().statusMessage : '分析エージェントがありません',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      set({ agentsLoaded: true, statusMessage: `分析エージェントの取得に失敗しました: ${message}` });
    }
  },

  setActiveAgent: async (id) => {
    const agent = get().agents.find((entry) => entry.id === id);
    if (!agent) {
      set({ statusMessage: '分析エージェントが見つかりません' });
      return;
    }

    await window.litelizard.setActiveReadingAgentId(id);
    set({ activeAgentId: id, statusMessage: `${agent.name} を選択しました` });
  },

  saveAgent: async (input) => {
    const previousActiveAgentId = get().activeAgentId;
    const saved = await window.litelizard.saveReadingAgent(input);
    const shouldActivate = previousActiveAgentId === null;
    set((state) => {
      const existingIndex = state.agents.findIndex((agent) => agent.id === saved.id);
      const agents =
        existingIndex >= 0
          ? state.agents.map((agent) => (agent.id === saved.id ? saved : agent))
          : [...state.agents, saved];
      return {
        agents,
        activeAgentId: shouldActivate ? saved.id : state.activeAgentId,
        statusMessage: `${saved.name} を保存しました`,
      };
    });
    if (shouldActivate) {
      await window.litelizard.setActiveReadingAgentId(saved.id);
    }
    return saved;
  },

  deleteAgent: async (id) => {
    const { agents, activeAgentId } = get();
    if (agents.length <= 1) {
      set({ statusMessage: '最後の分析エージェントは削除できません' });
      throw new Error('最後の分析エージェントは削除できません');
    }

    await window.litelizard.deleteReadingAgent(id);
    const nextAgents = agents.filter((agent) => agent.id !== id);
    const nextActiveAgentId =
      activeAgentId === id ? nextAgents[0]?.id ?? null : activeAgentId;

    if (nextActiveAgentId) {
      await window.litelizard.setActiveReadingAgentId(nextActiveAgentId);
    }

    set({
      agents: nextAgents,
      activeAgentId: nextActiveAgentId,
      statusMessage: '分析エージェントを削除しました',
    });
  },

  resetAgents: async () => {
    const agents = await window.litelizard.resetReadingAgents();
    const activeAgentId = agents[0]?.id ?? null;
    if (activeAgentId) {
      await window.litelizard.setActiveReadingAgentId(activeAgentId);
    }
    set({ agents, activeAgentId, statusMessage: '分析エージェントを初期状態に戻しました' });
    return agents;
  },

  dryRunAgent: async ({ agent, paragraphId, text, order }) => {
    const { document, analysisSettings } = get();
    const selectedProvider = getSelectedAnalysisProviderState(analysisSettings);
    if (!selectedProvider.runnable) {
      throw new Error(selectedProvider.reason ?? `${selectedProvider.label} を設定してください。`);
    }
    if (!document) {
      throw new Error('ドキュメントを開いてください');
    }
    return window.litelizard.dryRunReadingAgent({
      agent,
      paragraph: { paragraphId, order, text },
      documentParagraphs: toAnalysisParagraphInput(document),
      promptVersion: 'v1.0.0',
    });
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
        contextPolicy: input.contextPolicy
          ? { ...input.contextPolicy }
          : { ...current.contextPolicy },
        editorTweaks: input.editorTweaks
          ? { ...input.editorTweaks }
          : { ...current.editorTweaks },
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
  });
});
