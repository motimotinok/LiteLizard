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
    moveEntry: vi.fn(),
    deleteEntry: vi.fn(),
    loadDocument: vi.fn(),
    createDocument: vi.fn(),
    saveDocument: vi.fn(),
    exportDocumentText: vi.fn(),
    runAnalysis: vi.fn(),
    loadAnalysis: vi.fn().mockResolvedValue(null),
    saveAnalysisResult: vi.fn().mockResolvedValue(undefined),
    createAnalysisGeneration: vi.fn().mockResolvedValue(1),
    loadAnalysisSettings: vi.fn().mockResolvedValue({
      defaultProvider: 'openai',
      providers: {
        openai: { apiKeyConfigured: true, defaultModel: 'gpt-4o-mini' },
        anthropic: { apiKeyConfigured: false, defaultModel: 'claude-haiku-4-5-20251001' },
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
        contextPolicy: { mode: 'whole-document' },
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
    getAppVersion: vi.fn().mockResolvedValue('0.0.0-test'),
    checkForUpdates: vi.fn().mockResolvedValue({
      currentVersion: '0.0.0-test',
      latestVersion: null,
      releaseUrl: 'https://example.test/release',
      updateAvailable: false,
      checkedAt: '2026-05-23T00:00:00.000Z',
    }),
    openReleasesPage: vi.fn().mockResolvedValue({ ok: true }),
    downloadLatestRelease: vi.fn().mockResolvedValue({ ok: true }),
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

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });
  return { promise, resolve, reject };
}

function silenceConsoleError() {
  // 修正済み: 期待失敗経路の検証済みログでテストstderrを汚さないため、対象テスト内で明示的に抑制する。
  return vi.spyOn(console, 'error').mockImplementation(() => undefined);
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

  it('saveAnalysisSettings は editor tweaks を renderer state に反映する', async () => {
    const saveAnalysisSettings = vi.fn().mockResolvedValue({ ok: true });
    window.litelizard = createBridge({ saveAnalysisSettings });

    await useAppStore.getState().saveAnalysisSettings({
      defaultProvider: 'openai',
      providers: {
        openai: { defaultModel: 'gpt-4o-mini' },
        anthropic: { defaultModel: 'claude-haiku-4-5-20251001' },
      },
      localLlm: {
        endpoint: 'http://127.0.0.1:11434',
        defaultModel: 'llama3.1:8b',
      },
      editorTweaks: {
        typeface: 'sans',
        bodyFontSize: 20,
        lineHeight: 2.1,
        paperWarmth: 20,
        analysisPanelMode: 'overlay',
      },
    });

    expect(saveAnalysisSettings).toHaveBeenCalledTimes(1);
    expect(useAppStore.getState().analysisSettings.editorTweaks).toEqual({
      typeface: 'sans',
      bodyFontSize: 20,
      lineHeight: 2.1,
      paperWarmth: 20,
      analysisPanelMode: 'overlay',
    });
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
    const consoleErrorSpy = silenceConsoleError();
    const setLastOpenedFolder = vi.fn().mockResolvedValue({ ok: true });
    window.litelizard = createBridge({
      getLastOpenedFolder: vi.fn().mockResolvedValue('/projects/missing'),
      setLastOpenedFolder,
      listTree: vi.fn().mockRejectedValue(new Error('ENOENT')),
    });

    try {
      await useAppStore.getState().restoreLastProject();

      const state = useAppStore.getState();
      expect(state.startupState).toBe('needs-project');
      expect(state.rootPath).toBeNull();
      expect(state.statusMessage).toContain('復元できませんでした');
      expect(setLastOpenedFolder).not.toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith('[Renderer hydrateProject] failed', expect.any(Error));
    } finally {
      consoleErrorSpy.mockRestore();
    }
  });

  it('restoreLastProject は復元失敗時に対象パスを Recent / lastOpenedFolder から除外する', async () => {
    const consoleErrorSpy = silenceConsoleError();
    const removeRecent = vi.fn().mockResolvedValue({ ok: true });
    const refreshed = [
      { path: '/projects/other', lastOpenedAt: '2026-05-06T09:00:00.000Z', exists: true },
    ];
    const getRecentProjects = vi.fn().mockResolvedValue(refreshed);
    window.litelizard = createBridge({
      getLastOpenedFolder: vi.fn().mockResolvedValue('/projects/missing'),
      listTree: vi.fn().mockRejectedValue(new Error('ENOENT')),
      removeRecentProject: removeRecent,
      getRecentProjects,
    });

    try {
      await useAppStore.getState().restoreLastProject();

      expect(removeRecent).toHaveBeenCalledWith('/projects/missing');
      expect(getRecentProjects).toHaveBeenCalled();
      expect(useAppStore.getState().recentProjects).toEqual(refreshed);
      expect(useAppStore.getState().startupState).toBe('needs-project');
      expect(consoleErrorSpy).toHaveBeenCalledWith('[Renderer hydrateProject] failed', expect.any(Error));
    } finally {
      consoleErrorSpy.mockRestore();
    }
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
    const consoleErrorSpy = silenceConsoleError();
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

    try {
      await useAppStore.getState().openRecentProject('/projects/missing');

      expect(removeRecent).toHaveBeenCalledWith('/projects/missing');
      expect(useAppStore.getState().recentProjects).toEqual(refreshed);
      expect(useAppStore.getState().startupState).toBe('needs-project');
      expect(useAppStore.getState().statusMessage).toContain('最近リストから除外');
      expect(consoleErrorSpy).toHaveBeenCalledWith('[Renderer hydrateProject] failed', expect.any(Error));
    } finally {
      consoleErrorSpy.mockRestore();
    }
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

  it('openFolder は遅れて完了した前回フォルダ復元に ready 状態を上書きされない', async () => {
    const lastOpened = createDeferred<string | null>();
    window.litelizard = createBridge({
      getLastOpenedFolder: vi.fn().mockReturnValue(lastOpened.promise),
      openFolder: vi.fn().mockResolvedValue('/projects/novel'),
      listTree: vi.fn().mockResolvedValue([{ path: '/projects/novel/draft.lzl', name: 'draft.lzl', type: 'file' }]),
    });

    const restore = useAppStore.getState().restoreLastProject();
    await useAppStore.getState().openFolder();
    lastOpened.resolve(null);
    await restore;

    const state = useAppStore.getState();
    expect(state.startupState).toBe('ready');
    expect(state.rootPath).toBe('/projects/novel');
    expect(state.tree).toHaveLength(1);
  });

  it('openFolder は不適切なフォルダ選択の理由を日本語で表示する', async () => {
    const consoleErrorSpy = silenceConsoleError();
    window.litelizard = createBridge({
      openFolder: vi.fn().mockRejectedValue(
        new Error(
          'OPEN_FOLDER_FAILED: PROJECT_LOCATION_UNSAFE: /System は LiteLizard の作業フォルダとして安全ではありません。macOS のシステム領域やアプリ実行に必要な領域は選べません。',
        ),
      ),
    });

    try {
      await useAppStore.getState().openFolder();

      const state = useAppStore.getState();
      expect(state.startupState).toBe('needs-project');
      expect(state.statusMessage).toContain('LiteLizard の作業フォルダとして安全ではありません');
      expect(state.statusMessage).toContain('macOS のシステム領域やアプリ実行に必要な領域は選べません');
      expect(state.statusMessage).not.toContain('ダイアログの起動に失敗');
      expect(consoleErrorSpy).toHaveBeenCalledWith('[Renderer openFolder] failed', expect.any(Error));
    } finally {
      consoleErrorSpy.mockRestore();
    }
  });

  it('moveEntry は開いているファイルの保存先パスとツリーを更新する', async () => {
    const movedPath = '/projects/novel/archive/draft.lzl';
    const moveEntry = vi.fn().mockResolvedValue({ ok: true, path: movedPath });
    const refreshedTree = [
      {
        path: '/projects/novel/archive',
        name: 'archive',
        type: 'directory' as const,
        children: [{ path: movedPath, name: 'draft.lzl', type: 'file' as const }],
      },
    ];
    window.litelizard = createBridge({
      moveEntry,
      listTree: vi.fn().mockResolvedValue(refreshedTree),
    });

    useAppStore.setState({
      rootPath: '/projects/novel',
      tree: [],
      currentFilePath: '/projects/novel/draft.lzl',
      document: createLzlDocument(),
      revision: 3,
    });

    await useAppStore.getState().moveEntry('/projects/novel/draft.lzl', '/projects/novel/archive');

    const state = useAppStore.getState();
    expect(moveEntry).toHaveBeenCalledWith('/projects/novel/draft.lzl', '/projects/novel/archive');
    expect(state.tree).toEqual(refreshedTree);
    expect(state.currentFilePath).toBe(movedPath);
    expect(state.document?.title).toBe('draft');
    expect(state.document?.source?.originPath).toBe(movedPath);
    expect(state.revision).toBe(0);
    expect(state.statusMessage).toBe('ファイルを移動しました');
  });

  it('exportCurrentDocumentText は現在の文書を IPC に渡し成功メッセージを更新する', async () => {
    const document = createLzlDocument();
    const exportDocumentText = vi.fn().mockResolvedValue({ ok: true, filePath: '/exports/draft.txt' });
    window.litelizard = createBridge({ exportDocumentText });

    useAppStore.setState({
      currentFilePath: '/projects/novel/draft.lzl',
      document,
      dirty: true,
      statusMessage: '本文を編集中',
    });

    await useAppStore.getState().exportCurrentDocumentText();

    expect(exportDocumentText).toHaveBeenCalledWith('/projects/novel/draft.lzl', document);
    expect(useAppStore.getState().dirty).toBe(true);
    expect(useAppStore.getState().statusMessage).toBe('テキストを書き出しました: /exports/draft.txt');
  });

  it('exportCurrentDocumentText は保存キャンセル時に文書状態を変えない', async () => {
    const document = createLzlDocument();
    const exportDocumentText = vi.fn().mockResolvedValue(null);
    window.litelizard = createBridge({ exportDocumentText });

    useAppStore.setState({
      currentFilePath: '/projects/novel/draft.lzl',
      document,
      revision: 7,
      dirty: true,
      statusMessage: '本文を編集中',
    });

    await useAppStore.getState().exportCurrentDocumentText();

    const state = useAppStore.getState();
    expect(exportDocumentText).toHaveBeenCalledWith('/projects/novel/draft.lzl', document);
    expect(state.document).toBe(document);
    expect(state.revision).toBe(7);
    expect(state.dirty).toBe(true);
    expect(state.statusMessage).toBe('テキスト書き出しをキャンセルしました');
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
          contextPolicy: { mode: 'whole-document' },
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
          response: 'progress result',
          tags: { theme: ['構成'] },
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
            response: 'progress result',
            tags: { theme: ['構成'] },
            model: 'gpt-4o-mini',
            analyzedAt: '2026-04-12T00:00:00.000Z',
            promptVersion: 'v1.0.0',
          },
          {
            paragraphId: 'p2',
            response: 'final only',
            tags: { theme: ['描写'] },
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
          anthropic: { apiKeyConfigured: false, defaultModel: 'claude-haiku-4-5-20251001' },
        },
        localLlm: { endpoint: 'http://127.0.0.1:11434', defaultModel: 'llama3.1:8b', configured: false },
      },
    });

    await useAppStore.getState().runAnalysis();

    const state = useAppStore.getState();
    expect(saveAnalysisResult).toHaveBeenCalledTimes(2);
    expect(saveAnalysisResult).toHaveBeenCalledWith(
      '/projects/novel',
      document.documentId,
      'p2',
      expect.objectContaining({
        result: expect.objectContaining({ response: 'final only' }),
      }),
    );
    const savedPattern = saveAnalysisResult.mock.calls.find((call) => call[2] === 'p2')?.[3];
    expect(savedPattern?.result).not.toHaveProperty('sourceText');
    expect(savedPattern?.result.targetTextFingerprint).toMatch(/^llz-fnv1a:/);
    expect(savedPattern?.provenance).toMatchObject({
      agentId: 'reader-quiet',
      agentName: '静かな読者',
      agentPromptVersion: 'v1.0.0',
      referencedParagraphCount: 1,
      hasAdditionalInstruction: false,
      targetScope: 'paragraph',
      model: 'gpt-4o-mini',
      resultContractVersion: 'response-tags-v1',
    });
    expect(state.analysisHistoriesByParagraphId.p1).toHaveLength(1);
    expect(state.analysisHistoriesByParagraphId.p2).toHaveLength(1);
    expect(state.document?.paragraphs[0].lizard.response).toBe('progress result');
    expect(state.document?.paragraphs[0].lizard.requestId).toBe('req_1');
    expect(state.document?.paragraphs[1].lizard.response).toBe('final only');
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
          response: 'only p1',
          tags: { theme: ['構成'] },
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
          anthropic: { apiKeyConfigured: false, defaultModel: 'claude-haiku-4-5-20251001' },
        },
        localLlm: { endpoint: 'http://127.0.0.1:11434', defaultModel: 'llama3.1:8b', configured: false },
      },
    });

    await useAppStore.getState().runAnalysis();

    const state = useAppStore.getState();
    expect(state.analysisRunSummary).toEqual({ targetCount: 2, successCount: 1, failureCount: 1 });
    expect(state.statusMessage).toBe('全体解析が完了しました（対象 2 / 成功 1 / 失敗 1）');
    expect(state.document?.paragraphs[0].lizard.response).toBe('only p1');
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
          anthropic: { apiKeyConfigured: false, defaultModel: 'claude-haiku-4-5-20251001' },
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
          anthropic: { apiKeyConfigured: false, defaultModel: 'claude-haiku-4-5-20251001' },
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
          anthropic: { apiKeyConfigured: false, defaultModel: 'claude-haiku-4-5-20251001' },
        },
        localLlm: { endpoint: 'http://127.0.0.1:11434', defaultModel: 'llama3.1:8b', configured: false },
      },
    });

    await useAppStore.getState().runAnalysis();

    expect(saveAnalysisResult).not.toHaveBeenCalled();
    expect(useAppStore.getState().analysisHistoriesByParagraphId).toEqual({});
  });

  it('解析中に同じ構造と documentId を持つ別ファイルへ切り替えた場合は完了結果を反映しない', async () => {
    const document = createLzlDocument();
    const deferred = createDeferred<AnalysisRunResult>();
    const runAnalysis = vi.fn(() => deferred.promise);
    window.litelizard = createBridge({ runAnalysis });
    useAppStore.setState({
      rootPath: '/projects/novel',
      currentFilePath: '/projects/novel/draft.lzl',
      document,
      analysisSettings: {
        defaultProvider: 'openai',
        providers: {
          openai: { apiKeyConfigured: true, defaultModel: 'gpt-4o-mini' },
          anthropic: { apiKeyConfigured: false, defaultModel: 'claude-haiku-4-5-20251001' },
        },
        localLlm: { endpoint: 'http://127.0.0.1:11434', defaultModel: 'llama3.1:8b', configured: false },
      },
    });

    const analysisPromise = useAppStore.getState().runAnalysis();
    useAppStore.setState({
      currentFilePath: '/projects/novel/copied.lzl',
      document: createLzlDocument({
        title: 'copied',
        source: { format: 'lzl-v1', originPath: '/projects/novel/copied.lzl' },
      }),
    });
    deferred.resolve({
      requestId: 'req_stale',
      documentId: document.documentId,
      agentId: 'reader-quiet',
      personaMode: document.personaMode,
      promptVersion: 'v1.0.0',
      results: [
        {
          paragraphId: 'p1',
          emotion: ['混入'],
          theme: ['別文書'],
          deepMeaning: 'stale final result',
          confidence: 0.9,
          model: 'gpt-4o-mini',
          analyzedAt: '2026-06-12T00:00:00.000Z',
          promptVersion: 'v1.0.0',
        },
      ],
    });

    await analysisPromise;

    expect(useAppStore.getState().currentFilePath).toBe('/projects/novel/copied.lzl');
    expect(useAppStore.getState().analysisHistoriesByParagraphId).toEqual({});
    expect(useAppStore.getState().document?.paragraphs[0].lizard.deepMeaning).toBeUndefined();
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

  it('openSearchPanel は activeWorkspacePanel を search にする', () => {
    expect(useAppStore.getState().activeWorkspacePanel).toBe('editor');
    useAppStore.getState().openSearchPanel();
    expect(useAppStore.getState().activeWorkspacePanel).toBe('search');
    expect(useAppStore.getState().statusMessage).toBe('検索を開きました');
  });

  it('requestNavigateToParagraph は editor へ戻して pending navigation を立てる', () => {
    useAppStore.setState({ activeWorkspacePanel: 'search', pendingParagraphNavigation: null });
    useAppStore.getState().requestNavigateToParagraph('p42');
    const state = useAppStore.getState();
    expect(state.activeWorkspacePanel).toBe('editor');
    expect(state.pendingParagraphNavigation?.paragraphId).toBe('p42');
    expect(typeof state.pendingParagraphNavigation?.nonce).toBe('number');
  });

  it('consumePendingParagraphNavigation は pending navigation を消す', () => {
    useAppStore.setState({ pendingParagraphNavigation: { paragraphId: 'p1', nonce: 1 } });
    useAppStore.getState().consumePendingParagraphNavigation();
    expect(useAppStore.getState().pendingParagraphNavigation).toBeNull();
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

describe('useAppStore 分析実行前の見積もり確認', () => {
  beforeEach(() => {
    (globalThis as typeof globalThis & { window: Window }).window = {} as Window;
    useAppStore.setState(baseState, true);
  });

  function setupReadyState(documentOverride?: Partial<LiteLizardDocument>) {
    const document = createLzlDocument(documentOverride);
    useAppStore.setState({
      rootPath: '/projects/novel',
      document,
      activeAgentId: 'reader-quiet',
      agents: [
        {
          id: 'reader-quiet',
          name: '静かな読者',
          role: '余韻を読む',
          systemPrompt: '余韻を中心に読んでください。',
          model: null,
          contextPolicy: { mode: 'whole-document' },
          createdAt: '2026-05-02T00:00:00.000Z',
          updatedAt: '2026-05-02T00:00:00.000Z',
          builtIn: true,
        },
      ],
      agentsLoaded: true,
      analysisSettings: {
        defaultProvider: 'openai',
        providers: {
          openai: { apiKeyConfigured: true, defaultModel: 'gpt-4o-mini' },
          anthropic: { apiKeyConfigured: false, defaultModel: 'claude-haiku-4-5-20251001' },
        },
        localLlm: { endpoint: 'http://127.0.0.1:11434', defaultModel: 'llama3.1:8b', configured: false },
        editorTweaks: {
          typeface: 'serif',
          bodyFontSize: 17,
          lineHeight: 1.95,
          paperWarmth: 50,
          analysisPanelMode: 'side',
        },
      },
    });
    return document;
  }

  it('requestAnalysisRun は対象段落数とコンテキスト見積もりを pendingAnalysisRun に格納する', () => {
    const runAnalysis = vi.fn();
    const createAnalysisGeneration = vi.fn();
    window.litelizard = createBridge({ runAnalysis, createAnalysisGeneration });
    setupReadyState();

    useAppStore.getState().requestAnalysisRun();

    const pending = useAppStore.getState().pendingAnalysisRun;
    expect(pending).not.toBeNull();
    expect(pending?.targetParagraphIds).toEqual(['p1', 'p2']);
    expect(pending?.estimate.targetCount).toBe(2);
    expect(pending?.estimate.targetTextChars).toBeGreaterThan(0);
    expect(pending?.estimate.totalInputChars).toBeGreaterThan(pending?.estimate.targetTextChars ?? 0);
    expect(pending?.estimate.estimatedOutputChars).toBeGreaterThan(0);
    expect(pending).toMatchObject({
      agentName: '静かな読者',
      targetScopeLabel: '段落',
      contextPolicyLabel: '文書全体参照',
      referencedParagraphCount: 2,
      hasAdditionalInstruction: false,
    });
    expect(runAnalysis).not.toHaveBeenCalled();
    expect(createAnalysisGeneration).not.toHaveBeenCalled();
  });

  it('requestAnalysisRun は追加指示の有無を確認画面へ反映し、confirm でリクエストへ渡す', async () => {
    const document = setupReadyState();
    const runAnalysis = vi.fn().mockResolvedValue({
      requestId: 'req_instruction',
      documentId: document.documentId,
      agentId: 'reader-quiet',
      personaMode: document.personaMode,
      promptVersion: 'v1.0.0',
      results: [
        {
          paragraphId: 'p1',
          response: 'with instruction p1',
          tags: {},
          model: 'gpt-4o-mini',
          analyzedAt: '2026-05-12T00:00:00.000Z',
          promptVersion: 'v1.0.0',
        },
        {
          paragraphId: 'p2',
          response: 'with instruction p2',
          tags: {},
          model: 'gpt-4o-mini',
          analyzedAt: '2026-05-12T00:00:00.000Z',
          promptVersion: 'v1.0.0',
        },
      ],
    } satisfies AnalysisRunResult);
    const saveAnalysisResult = vi.fn().mockResolvedValue(undefined);
    window.litelizard = createBridge({ runAnalysis, saveAnalysisResult });
    useAppStore.getState().setAnalysisAdditionalInstruction('  初見読者が引っかかる場所だけ見る  ');

    useAppStore.getState().requestAnalysisRun();
    expect(useAppStore.getState().pendingAnalysisRun?.hasAdditionalInstruction).toBe(true);

    await useAppStore.getState().confirmAnalysisRun();

    expect(runAnalysis).toHaveBeenCalledWith(
      expect.objectContaining({
        additionalInstruction: '初見読者が引っかかる場所だけ見る',
      }),
    );
    const savedPattern = saveAnalysisResult.mock.calls[0]?.[3];
    expect(savedPattern?.provenance?.hasAdditionalInstruction).toBe(true);
    expect(JSON.stringify(savedPattern)).not.toContain('初見読者が引っかかる場所だけ見る');
  });

  it('requestAnalysisRun は確認省略設定なら同じ snapshot guard を経由して即実行する', async () => {
    const document = setupReadyState();
    const runAnalysis = vi.fn().mockResolvedValue({
      requestId: 'req_skip_confirm',
      documentId: document.documentId,
      agentId: 'reader-quiet',
      personaMode: document.personaMode,
      promptVersion: 'v1.0.0',
      results: document.paragraphs.map((paragraph) => ({
        paragraphId: paragraph.id,
        response: `confirmed ${paragraph.id}`,
        tags: {},
        model: 'gpt-4o-mini',
        analyzedAt: '2026-05-12T00:00:00.000Z',
        promptVersion: 'v1.0.0',
      })),
    } satisfies AnalysisRunResult);
    window.litelizard = createBridge({ runAnalysis });
    useAppStore.setState((state) => ({
      analysisSettings: {
        ...state.analysisSettings,
        analysisRunConfirmationEnabled: false,
      },
    }));

    useAppStore.getState().requestAnalysisRun();
    await vi.waitFor(() => expect(runAnalysis).toHaveBeenCalledTimes(1));

    expect(useAppStore.getState().pendingAnalysisRun).toBeNull();
    expect(useAppStore.getState().analysisRunSummary).toEqual({
      targetCount: 2,
      successCount: 2,
      failureCount: 0,
    });
  });

  it('requestAnalysisRun は lastN 設定で contextTextChars を縮める', () => {
    const runAnalysis = vi.fn();
    window.litelizard = createBridge({ runAnalysis });
    setupReadyState({
      paragraphs: [
        {
          id: 'p1',
          chapterId: 'c1',
          order: 1,
          light: { text: '一段落目はやや長めの文章でコンテキストとして利用される。' },
          lizard: { status: 'complete', deepMeaning: 'done', emotion: [], theme: [], confidence: 0.8, analyzedAt: '2026-04-12T00:00:00.000Z' },
        },
        {
          id: 'p2',
          chapterId: 'c1',
          order: 2,
          light: { text: '二段落目はさらに長いコンテキスト本文として候補に入る。' },
          lizard: { status: 'complete', deepMeaning: 'done', emotion: [], theme: [], confidence: 0.8, analyzedAt: '2026-04-12T00:00:00.000Z' },
        },
        {
          id: 'p3',
          chapterId: 'c1',
          order: 3,
          light: { text: '対象の段落本文。' },
          lizard: { status: 'stale' },
        },
      ],
    });

    useAppStore.setState((state) => ({
      agents: state.agents.map((agent) =>
        agent.id === 'reader-quiet'
          ? { ...agent, contextPolicy: { mode: 'preceding', range: 'all' } }
          : agent
      ),
    }));
    useAppStore.getState().requestAnalysisRun();
    const noneEstimate = useAppStore.getState().pendingAnalysisRun?.estimate;
    expect(noneEstimate).toBeDefined();

    useAppStore.setState((state) => ({
      agents: state.agents.map((agent) =>
        agent.id === 'reader-quiet'
          ? { ...agent, contextPolicy: { mode: 'preceding', range: 'lastN', lastN: 1 } }
          : agent
      ),
      pendingAnalysisRun: null,
    }));
    useAppStore.getState().requestAnalysisRun();
    const lastNEstimate = useAppStore.getState().pendingAnalysisRun?.estimate;
    expect(lastNEstimate).toBeDefined();

    expect(lastNEstimate!.contextTextChars).toBeLessThan(noneEstimate!.contextTextChars);
    expect(lastNEstimate!.totalInputChars).toBeLessThan(noneEstimate!.totalInputChars);
  });

  it('requestAnalysisRun は対象0件でも pendingAnalysisRun を立てずに summary を返す', () => {
    const runAnalysis = vi.fn();
    window.litelizard = createBridge({ runAnalysis });
    setupReadyState({
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

    useAppStore.getState().requestAnalysisRun();

    expect(useAppStore.getState().pendingAnalysisRun).toBeNull();
    expect(useAppStore.getState().analysisRunSummary).toEqual({
      targetCount: 0,
      successCount: 0,
      failureCount: 0,
    });
    expect(runAnalysis).not.toHaveBeenCalled();
  });

  it('requestAnalysisRun は provider 未設定なら pendingAnalysisRun を立てない', () => {
    const runAnalysis = vi.fn();
    window.litelizard = createBridge({ runAnalysis });
    setupReadyState();
    useAppStore.setState((state) => ({
      analysisSettings: {
        ...state.analysisSettings,
        providers: {
          ...state.analysisSettings.providers,
          openai: { ...state.analysisSettings.providers.openai, apiKeyConfigured: false },
        },
      },
    }));

    useAppStore.getState().requestAnalysisRun();

    expect(useAppStore.getState().pendingAnalysisRun).toBeNull();
    expect(runAnalysis).not.toHaveBeenCalled();
  });

  it('cancelAnalysisRun は pendingAnalysisRun を null に戻し provider / generation を呼ばない', () => {
    const runAnalysis = vi.fn();
    const createAnalysisGeneration = vi.fn();
    window.litelizard = createBridge({ runAnalysis, createAnalysisGeneration });
    setupReadyState();

    useAppStore.getState().requestAnalysisRun();
    expect(useAppStore.getState().pendingAnalysisRun).not.toBeNull();

    useAppStore.getState().cancelAnalysisRun();

    expect(useAppStore.getState().pendingAnalysisRun).toBeNull();
    expect(runAnalysis).not.toHaveBeenCalled();
    expect(createAnalysisGeneration).not.toHaveBeenCalled();
    expect(useAppStore.getState().analysisHistoriesByParagraphId).toEqual({});
    expect(useAppStore.getState().statusMessage).toBe('解析実行をキャンセルしました');
  });

  it('confirmAnalysisRun は pendingAnalysisRun を消費して runAnalysis を実行する', async () => {
    const document = setupReadyState();
    const runAnalysis = vi.fn().mockResolvedValue({
      requestId: 'req_confirm',
      documentId: document.documentId,
      agentId: 'reader-quiet',
      personaMode: document.personaMode,
      promptVersion: 'v1.0.0',
      results: [
        {
          paragraphId: 'p1',
          emotion: ['静寂'],
          theme: ['導入'],
          deepMeaning: 'confirmed p1',
          confidence: 0.8,
          model: 'gpt-4o-mini',
          analyzedAt: '2026-05-12T00:00:00.000Z',
          promptVersion: 'v1.0.0',
        },
        {
          paragraphId: 'p2',
          emotion: ['余韻'],
          theme: ['展開'],
          deepMeaning: 'confirmed p2',
          confidence: 0.7,
          model: 'gpt-4o-mini',
          analyzedAt: '2026-05-12T00:00:00.000Z',
          promptVersion: 'v1.0.0',
        },
      ],
    } satisfies AnalysisRunResult);
    window.litelizard = createBridge({ runAnalysis });

    useAppStore.getState().requestAnalysisRun();
    expect(useAppStore.getState().pendingAnalysisRun).not.toBeNull();

    await useAppStore.getState().confirmAnalysisRun();

    expect(useAppStore.getState().pendingAnalysisRun).toBeNull();
    expect(runAnalysis).toHaveBeenCalledTimes(1);
    expect(useAppStore.getState().analysisRunSummary).toEqual({
      targetCount: 2,
      successCount: 2,
      failureCount: 0,
    });
  });

  it('confirmAnalysisRun は確認後に文書構造が変わった場合は実行しない', async () => {
    const document = setupReadyState();
    const runAnalysis = vi.fn().mockResolvedValue({
      requestId: 'req_confirm_target_only',
      documentId: document.documentId,
      agentId: 'reader-quiet',
      personaMode: document.personaMode,
      promptVersion: 'v1.0.0',
      results: [
        {
          paragraphId: 'p1',
          emotion: ['静寂'],
          theme: ['導入'],
          deepMeaning: 'confirmed p1',
          confidence: 0.8,
          model: 'gpt-4o-mini',
          analyzedAt: '2026-05-12T00:00:00.000Z',
          promptVersion: 'v1.0.0',
        },
        {
          paragraphId: 'p2',
          emotion: ['余韻'],
          theme: ['展開'],
          deepMeaning: 'confirmed p2',
          confidence: 0.7,
          model: 'gpt-4o-mini',
          analyzedAt: '2026-05-12T00:00:00.000Z',
          promptVersion: 'v1.0.0',
        },
      ],
    } satisfies AnalysisRunResult);
    window.litelizard = createBridge({ runAnalysis });

    useAppStore.getState().requestAnalysisRun();
    expect(useAppStore.getState().pendingAnalysisRun?.targetParagraphIds).toEqual(['p1', 'p2']);

    useAppStore.setState((state) => ({
      document: {
        ...state.document!,
        paragraphs: [
          ...state.document!.paragraphs,
          {
            id: 'p3',
            chapterId: 'c1',
            order: 3,
            light: { text: '確認後に増えた段落', charCount: 9 },
            lizard: { status: 'stale' },
          },
        ],
      },
    }));

    await useAppStore.getState().confirmAnalysisRun();

    expect(runAnalysis).not.toHaveBeenCalled();
    expect(useAppStore.getState().pendingAnalysisRun).toBeNull();
    expect(useAppStore.getState().document?.paragraphs.find((paragraph) => paragraph.id === 'p3')?.lizard.status).toBe(
      'stale',
    );
    expect(useAppStore.getState().analysisRunSummary).toBeNull();
    expect(useAppStore.getState().statusMessage).toBe(
      '確認後に文書または本文が変更されたため、解析を開始しませんでした。もう一度確認してください。',
    );
  });

  it('confirmAnalysisRun は確認後に別文書へ切り替わった場合は実行しない', async () => {
    setupReadyState();
    const runAnalysis = vi.fn();
    window.litelizard = createBridge({ runAnalysis });

    useAppStore.getState().requestAnalysisRun();
    expect(useAppStore.getState().pendingAnalysisRun).not.toBeNull();

    useAppStore.setState({
      currentFilePath: '/projects/novel/other.lzl',
      document: createLzlDocument({
        documentId: 'doc_lzl_other',
        title: 'other',
        source: { format: 'lzl-v1', originPath: '/projects/novel/other.lzl' },
      }),
    });

    await useAppStore.getState().confirmAnalysisRun();

    expect(runAnalysis).not.toHaveBeenCalled();
    expect(useAppStore.getState().pendingAnalysisRun).toBeNull();
    expect(useAppStore.getState().statusMessage).toBe(
      '確認後に文書または本文が変更されたため、解析を開始しませんでした。もう一度確認してください。',
    );
  });

  it('confirmAnalysisRun は確認後に本文が変わった場合は実行しない', async () => {
    setupReadyState();
    const runAnalysis = vi.fn();
    window.litelizard = createBridge({ runAnalysis });

    useAppStore.getState().requestAnalysisRun();
    expect(useAppStore.getState().pendingAnalysisRun).not.toBeNull();

    useAppStore.getState().updateParagraph('p1', '確認後に本文を変更した');

    await useAppStore.getState().confirmAnalysisRun();

    expect(runAnalysis).not.toHaveBeenCalled();
    expect(useAppStore.getState().pendingAnalysisRun).toBeNull();
    expect(useAppStore.getState().statusMessage).toBe(
      '確認後に文書または本文が変更されたため、解析を開始しませんでした。もう一度確認してください。',
    );
  });

  it('pendingAnalysisRun が null のとき confirmAnalysisRun は何もしない', async () => {
    const runAnalysis = vi.fn();
    window.litelizard = createBridge({ runAnalysis });
    setupReadyState();

    await useAppStore.getState().confirmAnalysisRun();

    expect(runAnalysis).not.toHaveBeenCalled();
  });
});

describe('useAppStore #89 軽量更新通知の歯車バッジ導線', () => {
  beforeEach(() => {
    (globalThis as typeof globalThis & { window: Window }).window = {} as Window;
    useAppStore.setState(baseState, true);
    window.litelizard = createBridge();
  });

  it('updateAvailable=true の状態で openSettingsPanel を呼ぶと pendingSettingsScreenIntent が "update" になる', () => {
    useAppStore.setState({
      updateCheck: {
        currentVersion: '0.1.0',
        latestVersion: '0.2.0',
        releaseUrl: 'https://example.test/release',
        updateAvailable: true,
        checkedAt: '2026-05-23T00:00:00.000Z',
      },
    });

    useAppStore.getState().openSettingsPanel();

    expect(useAppStore.getState().activeWorkspacePanel).toBe('settings');
    expect(useAppStore.getState().pendingSettingsScreenIntent).toBe('update');
  });

  it('updateAvailable=false の状態で openSettingsPanel を呼ぶと pendingSettingsScreenIntent は null のまま', () => {
    useAppStore.setState({
      updateCheck: {
        currentVersion: '0.1.0',
        latestVersion: '0.1.0',
        releaseUrl: 'https://example.test/release',
        updateAvailable: false,
        checkedAt: '2026-05-23T00:00:00.000Z',
      },
    });

    useAppStore.getState().openSettingsPanel();

    expect(useAppStore.getState().activeWorkspacePanel).toBe('settings');
    expect(useAppStore.getState().pendingSettingsScreenIntent).toBe(null);
  });

  it('明示的に intent="update" を渡すと updateAvailable に関係なく pendingSettingsScreenIntent が "update" になる', () => {
    useAppStore.getState().openSettingsPanel({ intent: 'update' });
    expect(useAppStore.getState().pendingSettingsScreenIntent).toBe('update');
  });

  it('consumeSettingsScreenIntent は intent を返した後 null に戻す', () => {
    useAppStore.setState({ pendingSettingsScreenIntent: 'update' });
    const first = useAppStore.getState().consumeSettingsScreenIntent();
    const second = useAppStore.getState().consumeSettingsScreenIntent();
    expect(first).toBe('update');
    expect(second).toBe(null);
    expect(useAppStore.getState().pendingSettingsScreenIntent).toBe(null);
  });

  it('downloadLatestRelease は bridge.downloadLatestRelease を呼ぶ', async () => {
    const downloadLatestRelease = vi.fn().mockResolvedValue({ ok: true });
    window.litelizard = createBridge({ downloadLatestRelease });

    await useAppStore.getState().downloadLatestRelease();

    expect(downloadLatestRelease).toHaveBeenCalledTimes(1);
  });
});
