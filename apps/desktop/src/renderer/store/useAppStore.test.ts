import type {
  AnalysisProgressEvent,
  AnalysisRunResult,
  GenerationalAnalysisFile,
  LiteLizardDocument,
} from '@litelizard/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAppStore } from './useAppStore.ts';

const baseState = useAppStore.getState();

function createBridge(overrides: Partial<Window['litelizard']> = {}): Window['litelizard'] {
  return {
    openFolder: vi.fn(),
    getLastOpenedFolder: vi.fn(),
    setLastOpenedFolder: vi.fn().mockResolvedValue({ ok: true }),
    onRequestOpenFolder: vi.fn(() => () => {}),
    listTree: vi.fn(),
    createEntry: vi.fn(),
    renameEntry: vi.fn(),
    deleteEntry: vi.fn(),
    loadDocument: vi.fn(),
    createDocument: vi.fn(),
    saveDocument: vi.fn(),
    runAnalysis: vi.fn(),
    loadAnalysis: vi.fn().mockResolvedValue(null),
    saveAnalysisResult: vi.fn().mockResolvedValue(undefined),
    createAnalysisGeneration: vi.fn().mockResolvedValue(1),
    loadAnalysisSettings: vi.fn().mockResolvedValue({
      defaultProvider: 'openai',
      providers: {
        openai: { apiKeyConfigured: true, defaultModel: 'gpt-4o-mini' },
        anthropic: { apiKeyConfigured: false, defaultModel: 'claude-3-5-sonnet-latest' },
      },
      localLlm: { endpoint: 'http://127.0.0.1:11434', defaultModel: 'llama3.1:8b', configured: false },
    }),
    saveProviderApiKey: vi.fn(),
    clearProviderApiKey: vi.fn(),
    saveAnalysisSettings: vi.fn(),
    testLocalLlmConnection: vi.fn(),
    onAnalysisProgress: vi.fn(() => () => {}),
    importTextFile: vi.fn(),
    getActiveReadingAgentId: vi.fn().mockResolvedValue('reader-quiet'),
    setActiveReadingAgentId: vi.fn().mockResolvedValue({ ok: true }),
    listReadingAgents: vi.fn().mockResolvedValue([
      {
        id: 'reader-quiet',
        name: '静かな読者',
        role: '余韻を読む',
        systemPrompt: '余韻を中心に読んでください。',
        model: null,
        temperature: 0.7,
        createdAt: '2026-05-02T00:00:00.000Z',
        updatedAt: '2026-05-02T00:00:00.000Z',
        builtIn: true,
      },
    ]),
    getReadingAgent: vi.fn(),
    saveReadingAgent: vi.fn(),
    deleteReadingAgent: vi.fn(),
    resetReadingAgents: vi.fn(),
    dryRunReadingAgent: vi.fn(),
    ...overrides,
  };
}

function createLzlDocument(overrides: Partial<LiteLizardDocument> = {}): LiteLizardDocument {
  return {
    version: 2,
    documentId: 'doc_lzl_1',
    title: 'draft',
    personaMode: 'general-reader',
    createdAt: '2026-04-11T00:00:00.000Z',
    updatedAt: '2026-04-11T00:00:00.000Z',
    source: { format: 'lzl-v1', originPath: '/projects/novel/draft.lzl' },
    chapters: [{ id: 'c1', order: 1, title: '章1' }],
    paragraphs: [
      {
        id: 'p1',
        chapterId: 'c1',
        order: 1,
        light: { text: '一段落目', charCount: 4 },
        lizard: { status: 'stale' },
      },
      {
        id: 'p2',
        chapterId: 'c1',
        order: 2,
        light: { text: '二段落目', charCount: 4 },
        lizard: { status: 'stale' },
      },
    ],
    ...overrides,
  };
}

describe('useAppStore project startup flow', () => {
  beforeEach(() => {
    (globalThis as typeof globalThis & { window: Window }).window = {} as Window;
    useAppStore.setState(baseState, true);
  });

  it('restoreLastProject は保存済みフォルダが無ければ needs-project にする', async () => {
    window.litelizard = createBridge({
      getLastOpenedFolder: vi.fn().mockResolvedValue(null),
    });

    await useAppStore.getState().restoreLastProject();

    const state = useAppStore.getState();
    expect(state.startupState).toBe('needs-project');
    expect(state.rootPath).toBeNull();
  });

  it('restoreLastProject は保存済みフォルダを復元して ready にする', async () => {
    const setLastOpenedFolder = vi.fn().mockResolvedValue({ ok: true });
    window.litelizard = createBridge({
      getLastOpenedFolder: vi.fn().mockResolvedValue('/projects/novel'),
      setLastOpenedFolder,
      listTree: vi.fn().mockResolvedValue([{ path: '/projects/novel/draft.md', name: 'draft.md', type: 'file' }]),
    });

    await useAppStore.getState().restoreLastProject();

    const state = useAppStore.getState();
    expect(state.startupState).toBe('ready');
    expect(state.rootPath).toBe('/projects/novel');
    expect(state.tree).toHaveLength(1);
    expect(state.currentFilePath).toBeNull();
    expect(setLastOpenedFolder).toHaveBeenCalledWith('/projects/novel');
  });

  it('restoreLastProject は復元失敗時に needs-project へフォールバックする', async () => {
    const setLastOpenedFolder = vi.fn().mockResolvedValue({ ok: true });
    window.litelizard = createBridge({
      getLastOpenedFolder: vi.fn().mockResolvedValue('/projects/missing'),
      setLastOpenedFolder,
      listTree: vi.fn().mockRejectedValue(new Error('ENOENT')),
    });

    await useAppStore.getState().restoreLastProject();

    const state = useAppStore.getState();
    expect(state.startupState).toBe('needs-project');
    expect(state.rootPath).toBeNull();
    expect(state.statusMessage).toContain('復元できませんでした');
    expect(setLastOpenedFolder).not.toHaveBeenCalled();
  });

  it('openFolder はフォルダ切り替え時に編集中ドキュメント状態をリセットする', async () => {
    const setLastOpenedFolder = vi.fn().mockResolvedValue({ ok: true });
    window.litelizard = createBridge({
      openFolder: vi.fn().mockResolvedValue('/projects/next'),
      setLastOpenedFolder,
      listTree: vi.fn().mockResolvedValue([{ path: '/projects/next/new.md', name: 'new.md', type: 'file' }]),
    });

    useAppStore.setState({
      startupState: 'ready',
      rootPath: '/projects/current',
      tree: [],
      currentFilePath: '/projects/current/draft.md',
      document: {
        version: 2,
        documentId: 'doc_1',
        title: 'draft',
        personaMode: 'general-reader',
        createdAt: '2026-04-11T00:00:00.000Z',
        updatedAt: '2026-04-11T00:00:00.000Z',
        source: { format: 'markdown-md', originPath: '/projects/current/draft.md' },
        chapters: [{ id: 'c1', order: 1, title: '章1' }],
        paragraphs: [],
      },
      revision: 3,
      dirty: true,
    });

    await useAppStore.getState().openFolder();

    const state = useAppStore.getState();
    expect(state.startupState).toBe('ready');
    expect(state.rootPath).toBe('/projects/next');
    expect(state.currentFilePath).toBeNull();
    expect(state.document).toBeNull();
    expect(state.revision).toBe(0);
    expect(state.dirty).toBe(false);
    expect(setLastOpenedFolder).toHaveBeenCalledWith('/projects/next');
  });
});

describe('useAppStore L-06 analysis state', () => {
  beforeEach(() => {
    (globalThis as typeof globalThis & { window: Window }).window = {} as Window;
    useAppStore.setState(baseState, true);
    useAppStore.setState({
      agents: [
        {
          id: 'reader-quiet',
          name: '静かな読者',
          role: '余韻を読む',
          systemPrompt: '余韻を中心に読んでください。',
          model: null,
          temperature: 0.7,
          createdAt: '2026-05-02T00:00:00.000Z',
          updatedAt: '2026-05-02T00:00:00.000Z',
          builtIn: true,
        },
      ],
      activeAgentId: 'reader-quiet',
      agentsLoaded: true,
    });
  });

  it('loadDocument は最新の互換 pattern を初期表示に使い、不一致履歴は stale のままにする', async () => {
    const document = createLzlDocument();
    const analysisFile: GenerationalAnalysisFile = {
      version: 1,
      documentId: document.documentId,
      generation: 3,
      createdAt: '2026-04-11T00:00:00.000Z',
      updatedAt: '2026-04-11T00:00:00.000Z',
      paragraphs: {
        p1: {
          patterns: [
            {
              analyzedAt: '2026-04-11T00:00:00.000Z',
              result: { deepMeaning: 'old', emotion: ['安心'], theme: ['構成'], confidence: 0.6, model: 'm1', sourceText: '一段落目' },
            },
            {
              analyzedAt: '2026-04-12T00:00:00.000Z',
              result: { deepMeaning: 'latest', emotion: ['期待'], theme: ['描写'], confidence: 0.9, model: 'm2', sourceText: '一段落目' },
            },
          ],
        },
        p2: {
          patterns: [
            {
              analyzedAt: '2026-04-12T00:00:00.000Z',
              result: { deepMeaning: 'mismatch', emotion: ['緊張'], theme: ['視点'], confidence: 0.7, model: 'm2', sourceText: '古い本文' },
            },
          ],
        },
      },
    };

    window.litelizard = createBridge({
      loadDocument: vi.fn().mockResolvedValue(document),
      loadAnalysis: vi.fn().mockResolvedValue(analysisFile),
    });

    useAppStore.setState({ rootPath: '/projects/novel' });
    await useAppStore.getState().loadDocument('/projects/novel/draft.lzl');

    const state = useAppStore.getState();
    expect(state.currentAnalysisGeneration).toBe(3);
    expect(state.analysisHistoriesByParagraphId.p1).toHaveLength(2);
    expect(state.document?.paragraphs[0].lizard.deepMeaning).toBe('latest');
    expect(state.document?.paragraphs[1].lizard.status).toBe('stale');
  });

  it('runAnalysis は progress 受信で履歴を追加し requestId を反映する', async () => {
    const document = createLzlDocument();
    let progressListener: ((event: AnalysisProgressEvent) => void) | null = null;
    const saveAnalysisResult = vi.fn().mockResolvedValue(undefined);
    const runAnalysis = vi.fn().mockImplementation(async (): Promise<AnalysisRunResult> => {
      progressListener?.({
        paragraphId: 'p1',
        result: {
          paragraphId: 'p1',
          emotion: ['安心'],
          theme: ['構成'],
          deepMeaning: 'progress result',
          confidence: 0.88,
          model: 'gpt-4o-mini',
          analyzedAt: '2026-04-12T00:00:00.000Z',
          promptVersion: 'v1.0.0',
        },
      });

      return {
        requestId: 'req_1',
        documentId: document.documentId,
        agentId: 'reader-quiet',
        personaMode: document.personaMode,
        promptVersion: 'v1.0.0',
        results: [
          {
            paragraphId: 'p1',
            emotion: ['安心'],
            theme: ['構成'],
            deepMeaning: 'progress result',
            confidence: 0.88,
            model: 'gpt-4o-mini',
            analyzedAt: '2026-04-12T00:00:00.000Z',
            promptVersion: 'v1.0.0',
          },
          {
            paragraphId: 'p2',
            emotion: ['期待'],
            theme: ['描写'],
            deepMeaning: 'final only',
            confidence: 0.75,
            model: 'gpt-4o-mini',
            analyzedAt: '2026-04-12T00:01:00.000Z',
            promptVersion: 'v1.0.0',
          },
        ],
      };
    });

    window.litelizard = createBridge({
      runAnalysis,
      saveAnalysisResult,
      onAnalysisProgress: vi.fn((listener) => {
        progressListener = listener;
        return () => {
          progressListener = null;
        };
      }),
    });

    useAppStore.setState({
      rootPath: '/projects/novel',
      document,
      analysisSettings: {
        defaultProvider: 'openai',
        providers: {
          openai: { apiKeyConfigured: true, defaultModel: 'gpt-4o-mini' },
          anthropic: { apiKeyConfigured: false, defaultModel: 'claude-3-5-sonnet-latest' },
        },
        localLlm: { endpoint: 'http://127.0.0.1:11434', defaultModel: 'llama3.1:8b', configured: false },
      },
    });

    await useAppStore.getState().runAnalysis();

    const state = useAppStore.getState();
    expect(saveAnalysisResult).toHaveBeenCalledTimes(1);
    expect(state.analysisHistoriesByParagraphId.p1).toHaveLength(1);
    expect(state.analysisHistoriesByParagraphId.p2).toHaveLength(1);
    expect(state.document?.paragraphs[0].lizard.deepMeaning).toBe('progress result');
    expect(state.document?.paragraphs[0].lizard.requestId).toBe('req_1');
    expect(state.document?.paragraphs[1].lizard.deepMeaning).toBe('final only');
  });

  it('構造変更時は世代を作成して履歴状態を空に戻す', async () => {
    const document = createLzlDocument();
    const createAnalysisGeneration = vi.fn().mockResolvedValue(7);
    window.litelizard = createBridge({
      createAnalysisGeneration,
      saveDocument: vi.fn().mockResolvedValue({ ok: true, revision: 4 }),
    });

    useAppStore.setState({
      rootPath: '/projects/novel',
      currentFilePath: '/projects/novel/draft.lzl',
      document,
      currentAnalysisGeneration: 2,
      analysisHistoriesByParagraphId: {
        p1: [
          {
            analyzedAt: '2026-04-11T00:00:00.000Z',
            result: { deepMeaning: 'old', sourceText: '一段落目' },
          },
        ],
      },
      selectedPatternIndexByParagraphId: { p1: 0 },
    });

    useAppStore.getState().reorderParagraphs(['p2', 'p1']);
    expect(createAnalysisGeneration).not.toHaveBeenCalled();

    await useAppStore.getState().saveNow();

    const state = useAppStore.getState();
    expect(createAnalysisGeneration).toHaveBeenCalledWith('/projects/novel', document.documentId);
    expect(state.currentAnalysisGeneration).toBe(7);
    expect(state.analysisHistoriesByParagraphId).toEqual({});
    expect(state.selectedPatternIndexByParagraphId).toEqual({});
    expect(state.generationSyncPending).toBe(false);
  });

  it('generationSyncPending かつ未保存変更がある間は解析を開始しない', async () => {
    const document = createLzlDocument();
    const runAnalysis = vi.fn();
    const createAnalysisGeneration = vi.fn().mockRejectedValue(new Error('disk full'));
    window.litelizard = createBridge({
      createAnalysisGeneration,
      runAnalysis,
    });

    useAppStore.setState({
      rootPath: '/projects/novel',
      document,
      dirty: true,
      generationSyncPending: true,
      analysisSettings: {
        defaultProvider: 'openai',
        providers: {
          openai: { apiKeyConfigured: true, defaultModel: 'gpt-4o-mini' },
          anthropic: { apiKeyConfigured: false, defaultModel: 'claude-3-5-sonnet-latest' },
        },
        localLlm: { endpoint: 'http://127.0.0.1:11434', defaultModel: 'llama3.1:8b', configured: false },
      },
    });

    await useAppStore.getState().runAnalysis();

    expect(createAnalysisGeneration).not.toHaveBeenCalled();
    expect(runAnalysis).not.toHaveBeenCalled();
    expect(useAppStore.getState().statusMessage).toContain('構造変更の保存が完了していない');
  });

  it('構造変更後の progress は現在の generation に反映しない', async () => {
    const document = createLzlDocument();
    let progressListener: ((event: AnalysisProgressEvent) => void) | null = null;
    const saveAnalysisResult = vi.fn().mockResolvedValue(undefined);
    const runAnalysis = vi.fn().mockImplementation(async (): Promise<AnalysisRunResult> => {
      useAppStore.getState().reorderParagraphs(['p2', 'p1']);
      progressListener?.({
        paragraphId: 'p1',
        result: {
          paragraphId: 'p1',
          emotion: ['安心'],
          theme: ['構成'],
          deepMeaning: 'stale progress',
          confidence: 0.88,
          model: 'gpt-4o-mini',
          analyzedAt: '2026-04-12T00:00:00.000Z',
          promptVersion: 'v1.0.0',
        },
      });
      return {
        requestId: 'req_2',
        documentId: document.documentId,
        agentId: 'reader-quiet',
        personaMode: document.personaMode,
        promptVersion: 'v1.0.0',
        results: [],
      };
    });

    window.litelizard = createBridge({
      runAnalysis,
      saveAnalysisResult,
      onAnalysisProgress: vi.fn((listener) => {
        progressListener = listener;
        return () => {
          progressListener = null;
        };
      }),
    });

    useAppStore.setState({
      rootPath: '/projects/novel',
      document,
      analysisSettings: {
        defaultProvider: 'openai',
        providers: {
          openai: { apiKeyConfigured: true, defaultModel: 'gpt-4o-mini' },
          anthropic: { apiKeyConfigured: false, defaultModel: 'claude-3-5-sonnet-latest' },
        },
        localLlm: { endpoint: 'http://127.0.0.1:11434', defaultModel: 'llama3.1:8b', configured: false },
      },
    });

    await useAppStore.getState().runAnalysis();

    expect(saveAnalysisResult).not.toHaveBeenCalled();
    expect(useAppStore.getState().analysisHistoriesByParagraphId).toEqual({});
  });
});
