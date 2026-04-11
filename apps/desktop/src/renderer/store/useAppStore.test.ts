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
    getApiKeyStatus: vi.fn(),
    saveApiKey: vi.fn(),
    clearApiKey: vi.fn(),
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
