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
    getRecentProjects: vi.fn().mockResolvedValue([]),
    removeRecentProject: vi.fn().mockResolvedValue({ ok: true }),
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

  it('analysisMode は段落を初期値にして章と全体へ切り替えられる', () => {
    expect(useAppStore.getState().analysisMode).toBe('paragraph');

    useAppStore.getState().setAnalysisMode('chapter');
    expect(useAppStore.getState().analysisMode).toBe('chapter');

    useAppStore.getState().setAnalysisMode('document');
    expect(useAppStore.getState().analysisMode).toBe('document');
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

  it('restoreLastProject は needs-project になったときに recentProjects も読み込む', async () => {
    const recentProjects = [
      { path: '/projects/foo', lastOpenedAt: '2026-05-06T10:00:00.000Z', exists: true },
    ];
    const getRecentProjects = vi.fn().mockResolvedValue(recentProjects);
    window.litelizard = createBridge({
      getLastOpenedFolder: vi.fn().mockResolvedValue(null),
      getRecentProjects,
    });

    await useAppStore.getState().restoreLastProject();

    expect(getRecentProjects).toHaveBeenCalled();
    expect(useAppStore.getState().recentProjects).toEqual(recentProjects);
  });

  it('openRecentProject は失敗時に対象を recent から削除し再読み込みする', async () => {
    const removeRecent = vi.fn().mockResolvedValue({ ok: true });
    const refreshed = [
      { path: '/projects/keep', lastOpenedAt: '2026-05-06T09:00:00.000Z', exists: true },
    ];
    const getRecentProjects = vi.fn().mockResolvedValue(refreshed);
    window.litelizard = createBridge({
      listTree: vi.fn().mockRejectedValue(new Error('ENOENT')),
      removeRecentProject: removeRecent,
      getRecentProjects,
    });

    await useAppStore.getState().openRecentProject('/projects/missing');

    expect(removeRecent).toHaveBeenCalledWith('/projects/missing');
    expect(useAppStore.getState().recentProjects).toEqual(refreshed);
    expect(useAppStore.getState().startupState).toBe('needs-project');
    expect(useAppStore.getState().statusMessage).toContain('最近リストから除外');
  });

  it('removeRecentProject は IPC 呼び出し後にリストを再読み込みする', async () => {
    const removeRecent = vi.fn().mockResolvedValue({ ok: true });
    const refreshed = [
      { path: '/projects/other', lastOpenedAt: '2026-05-06T08:00:00.000Z', exists: true },
    ];
    const getRecentProjects = vi.fn().mockResolvedValue(refreshed);
    window.litelizard = createBridge({
      removeRecentProject: removeRecent,
      getRecentProjects,
    });

    await useAppStore.getState().removeRecentProject('/projects/drop');

    expect(removeRecent).toHaveBeenCalledWith('/projects/drop');
    expect(useAppStore.getState().recentProjects).toEqual(refreshed);
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
    expect(state.analysisRunSummary).toEqual({ targetCount: 2, successCount: 2, failureCount: 0 });
    expect(state.statusMessage).toBe('全体解析が完了しました（対象 2 / 成功 2 / 失敗 0）');
  });

  it('runAnalysis は一部失敗時の件数を保持し成功済み結果を残す', async () => {
    const document = createLzlDocument();
    const runAnalysis = vi.fn().mockResolvedValue({
      requestId: 'req_partial',
      documentId: document.documentId,
      agentId: 'reader-quiet',
      personaMode: document.personaMode,
      promptVersion: 'v1.0.0',
      results: [
        {
          paragraphId: 'p1',
          emotion: ['安心'],
          theme: ['構成'],
          deepMeaning: 'only p1',
          confidence: 0.88,
          model: 'gpt-4o-mini',
          analyzedAt: '2026-04-12T00:00:00.000Z',
          promptVersion: 'v1.0.0',
        },
      ],
    } satisfies AnalysisRunResult);

    window.litelizard = createBridge({ runAnalysis });
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
    expect(state.analysisRunSummary).toEqual({ targetCount: 2, successCount: 1, failureCount: 1 });
    expect(state.statusMessage).toBe('全体解析が完了しました（対象 2 / 成功 1 / 失敗 1）');
    expect(state.document?.paragraphs[0].lizard.deepMeaning).toBe('only p1');
    expect(state.document?.paragraphs[1].lizard.status).toBe('failed');
  });

  it('runAnalysis は対象0件でも件数表示用の summary を更新する', async () => {
    const document = createLzlDocument({
      paragraphs: createLzlDocument().paragraphs.map((paragraph) => ({
        ...paragraph,
        lizard: {
          status: 'complete',
          deepMeaning: 'done',
          emotion: [],
          theme: [],
          confidence: 0.8,
          analyzedAt: '2026-04-12T00:00:00.000Z',
        },
      })),
    });
    const runAnalysis = vi.fn();
    window.litelizard = createBridge({ runAnalysis });
    useAppStore.setState({
      document,
      activeAgentId: 'reader-quiet',
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

    expect(runAnalysis).not.toHaveBeenCalled();
    expect(useAppStore.getState().analysisRunSummary).toEqual({
      targetCount: 0,
      successCount: 0,
      failureCount: 0,
    });
    expect(useAppStore.getState().statusMessage).toBe('再解析が必要な段落はありません（対象 0 / 成功 0 / 失敗 0）');
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

describe('useAppStore R-15 DnD reorder undo/redo', () => {
  beforeEach(() => {
    (globalThis as typeof globalThis & { window: Window }).window = {} as Window;
    useAppStore.setState(baseState, true);
  });

  function createMultiChapterDocument(): LiteLizardDocument {
    return {
      version: 2,
      documentId: 'doc_lzl_dnd',
      title: 'draft',
      personaMode: 'general-reader',
      createdAt: '2026-04-11T00:00:00.000Z',
      updatedAt: '2026-04-11T00:00:00.000Z',
      source: { format: 'lzl-v1', originPath: '/projects/novel/draft.lzl' },
      chapters: [
        { id: 'c1', order: 1, title: '章1' },
        { id: 'c2', order: 2, title: '章2' },
      ],
      paragraphs: [
        {
          id: 'p1',
          chapterId: 'c1',
          order: 1,
          light: { text: 'a1', charCount: 2 },
          lizard: { status: 'stale' },
        },
        {
          id: 'p2',
          chapterId: 'c1',
          order: 2,
          light: { text: 'a2', charCount: 2 },
          lizard: { status: 'stale' },
        },
        {
          id: 'p3',
          chapterId: 'c2',
          order: 3,
          light: { text: 'b1', charCount: 2 },
          lizard: { status: 'stale' },
        },
      ],
    };
  }

  it('段落 DnD 並び替え前のスナップショットから undo で並び順を戻せる', () => {
    const document = createLzlDocument();
    useAppStore.setState({ document });

    const before = useAppStore.getState().document!;
    useAppStore.getState().pushUndo({ documentSnapshot: before });
    useAppStore.getState().reorderParagraphs(['p2', 'p1']);

    expect(useAppStore.getState().document!.paragraphs.map((p) => p.id)).toEqual(['p2', 'p1']);

    const afterReorder = useAppStore.getState().document!;
    const target = useAppStore.getState().undoWithCurrentSnapshot({ documentSnapshot: afterReorder });
    expect(target).not.toBeNull();
    useAppStore.getState().restoreSnapshot(target!);

    const restored = useAppStore.getState().document!;
    expect(restored.paragraphs.map((p) => p.id)).toEqual(['p1', 'p2']);
    expect(restored.paragraphs.find((p) => p.id === 'p1')!.order).toBe(1);
    expect(restored.paragraphs.find((p) => p.id === 'p2')!.order).toBe(2);
  });

  it('章 DnD 並び替え前のスナップショットから undo で章順と段落の chapterId が戻る', () => {
    const document = createMultiChapterDocument();
    useAppStore.setState({ document });

    const before = useAppStore.getState().document!;
    useAppStore.getState().pushUndo({ documentSnapshot: before });
    useAppStore.getState().reorderChapters(['c2', 'c1']);

    const reordered = useAppStore.getState().document!;
    expect(reordered.chapters.map((c) => c.id)).toEqual(['c2', 'c1']);

    const target = useAppStore.getState().undoWithCurrentSnapshot({ documentSnapshot: reordered });
    expect(target).not.toBeNull();
    useAppStore.getState().restoreSnapshot(target!);

    const restored = useAppStore.getState().document!;
    expect(restored.chapters.map((c) => c.id)).toEqual(['c1', 'c2']);
    expect(restored.paragraphs.find((p) => p.id === 'p1')!.chapterId).toBe('c1');
    expect(restored.paragraphs.find((p) => p.id === 'p2')!.chapterId).toBe('c1');
    expect(restored.paragraphs.find((p) => p.id === 'p3')!.chapterId).toBe('c2');
  });

  it('段落 DnD reorder 後の undo / redo を往復できる', () => {
    const document = createLzlDocument();
    useAppStore.setState({ document });

    const before = useAppStore.getState().document!;
    useAppStore.getState().pushUndo({ documentSnapshot: before });
    useAppStore.getState().reorderParagraphs(['p2', 'p1']);

    const afterReorder = useAppStore.getState().document!;
    const undoTarget = useAppStore
      .getState()
      .undoWithCurrentSnapshot({ documentSnapshot: afterReorder });
    useAppStore.getState().restoreSnapshot(undoTarget!);
    expect(useAppStore.getState().document!.paragraphs.map((p) => p.id)).toEqual(['p1', 'p2']);

    const afterUndo = useAppStore.getState().document!;
    const redoTarget = useAppStore
      .getState()
      .redoWithCurrentSnapshot({ documentSnapshot: afterUndo });
    expect(redoTarget).not.toBeNull();
    useAppStore.getState().restoreSnapshot(redoTarget!);
    expect(useAppStore.getState().document!.paragraphs.map((p) => p.id)).toEqual(['p2', 'p1']);
  });

  it('lexicalStateJson を持たないスナップショットも undo / redo で利用できる', () => {
    const document = createMultiChapterDocument();
    useAppStore.setState({ document });

    const before = useAppStore.getState().document!;
    // chapter DnD は editor 不在なので lexicalStateJson は省略する
    useAppStore.getState().pushUndo({ documentSnapshot: before });
    useAppStore.getState().reorderChapters(['c2', 'c1']);

    const afterReorder = useAppStore.getState().document!;
    const undoTarget = useAppStore
      .getState()
      .undoWithCurrentSnapshot({ documentSnapshot: afterReorder });
    expect(undoTarget?.lexicalStateJson).toBeUndefined();
    useAppStore.getState().restoreSnapshot(undoTarget!);
    expect(useAppStore.getState().document!.chapters.map((c) => c.id)).toEqual(['c1', 'c2']);

    const afterUndo = useAppStore.getState().document!;
    const redoTarget = useAppStore
      .getState()
      .redoWithCurrentSnapshot({ documentSnapshot: afterUndo });
    expect(redoTarget?.lexicalStateJson).toBeUndefined();
    useAppStore.getState().restoreSnapshot(redoTarget!);
    expect(useAppStore.getState().document!.chapters.map((c) => c.id)).toEqual(['c2', 'c1']);
  });
});
