import { beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { DEFAULT_ANALYSIS_SETTINGS, IPC_CHANNELS, type AnalysisResult } from '@litelizard/shared';

const electronMock = vi.hoisted(() => ({
  handle: vi.fn(),
  showOpenDialog: vi.fn(),
  getPath: vi.fn(() => '/tmp/litelizard-user-data'),
}));

const fileServiceMock = vi.hoisted(() => ({
  listTree: vi.fn(),
  createDocument: vi.fn(),
  load: vi.fn(),
  save: vi.fn(),
  toAnalysisPath: vi.fn((filePath: string) => `${filePath}.analysis.json`),
  readSidecarAnalysis: vi.fn(),
}));

const apiKeyVaultMock = vi.hoisted(() => ({
  loadAll: vi.fn(),
  save: vi.fn(),
  clear: vi.fn(),
}));

const analysisSettingsStoreMock = vi.hoisted(() => ({
  load: vi.fn(),
  save: vi.fn(),
}));

const analysisProviderMock = vi.hoisted(() => ({
  resolveAnalysisProvider: vi.fn(),
}));

const apiBridgeMock = vi.hoisted(() => ({
  runAnalysis: vi.fn(),
}));

const analysisStoreMock = vi.hoisted(() => ({
  appendParagraphPattern: vi.fn(),
  createGeneration: vi.fn(async () => ({ generation: 1 })),
  deleteAnalysisFiles: vi.fn(),
  loadLatestAnalysis: vi.fn(),
  migrateFromV1: vi.fn(),
}));

vi.mock('electron', () => ({
  app: {
    getPath: electronMock.getPath,
  },
  dialog: {
    showOpenDialog: electronMock.showOpenDialog,
  },
  ipcMain: {
    handle: electronMock.handle,
  },
}));

vi.mock('./fileService.js', () => ({
  createFileService: () => fileServiceMock,
}));

vi.mock('./sessionVault.js', () => ({
  createApiKeyVault: () => apiKeyVaultMock,
}));

vi.mock('./analysisSettingsStore.js', async () => {
  const actual = await vi.importActual<typeof import('./analysisSettingsStore.js')>('./analysisSettingsStore.js');
  return {
    ...actual,
    createAnalysisSettingsStore: () => analysisSettingsStoreMock,
  };
});

vi.mock('./analysisProvider.js', () => analysisProviderMock);

vi.mock('./apiBridge.js', () => apiBridgeMock);

vi.mock('./analysisStore.js', () => analysisStoreMock);

vi.mock('./projectManager.js', () => ({
  ensureProject: vi.fn(),
}));

vi.mock('./appStore.js', () => ({
  getLastOpenedFolder: vi.fn(),
  setLastOpenedFolder: vi.fn(),
}));

import { registerIpcHandlers } from './ipc.js';

function getRegisteredHandlers() {
  return new Map<string, (...args: never[]) => unknown>(electronMock.handle.mock.calls);
}

function getRequiredHandler(channel: string) {
  const handler = getRegisteredHandlers().get(channel);
  if (!handler) {
    throw new Error(`${channel} handler was not registered`);
  }
  return handler;
}

async function withTempProject(run: (paths: { projectRoot: string; outsidePath: string }) => Promise<void>) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'litelizard-ipc-'));
  const projectRoot = path.join(dir, 'project');
  const outsidePath = path.join(dir, 'outside.lzl');

  await fs.mkdir(path.join(projectRoot, '.litelizard'), { recursive: true });
  await fs.writeFile(path.join(projectRoot, '.litelizard', 'config.json'), '{"version":1}', 'utf8');
  await fs.writeFile(outsidePath, 'documentId: d_outside00', 'utf8');

  try {
    await run({ projectRoot, outsidePath });
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

describe('registerIpcHandlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiKeyVaultMock.loadAll.mockResolvedValue({ openai: 'sk-openai' });
    analysisSettingsStoreMock.load.mockResolvedValue(DEFAULT_ANALYSIS_SETTINGS);
    analysisProviderMock.resolveAnalysisProvider.mockReturnValue({
      id: 'openai',
      label: 'OpenAI',
      model: 'gpt-4.1-mini',
      provider: { analyzeParagraph: vi.fn() },
    });
  });

  it('registers all invoke-based IPC channels on ipcMain.handle', () => {
    registerIpcHandlers();

    const registeredChannels = electronMock.handle.mock.calls.map(([channel]) => channel);
    const expectedInvokeChannels = Object.values(IPC_CHANNELS).filter(
      (channel) => channel !== IPC_CHANNELS.requestOpenFolder && channel !== IPC_CHANNELS.analysisProgress,
    );

    expect(registeredChannels).toEqual(expect.arrayContaining(expectedInvokeChannels));
    expect(registeredChannels).toHaveLength(expectedInvokeChannels.length);
  });

  it('sends analysis progress from the runAnalysis handler through the shared progress channel', async () => {
    const progressResult: AnalysisResult = {
      paragraphId: 'p_123',
      emotion: [],
      theme: [],
      deepMeaning: '読者には静かな決意として届く',
      confidence: 0.8,
      model: 'gpt-4.1-mini',
      analyzedAt: '2026-04-25T00:00:00.000Z',
      promptVersion: 'v1.0.0',
    };
    apiBridgeMock.runAnalysis.mockImplementation(async (_input, _provider, onProgress) => {
      onProgress(progressResult);
      return { requestId: 'req_123', results: [progressResult] };
    });

    registerIpcHandlers();
    const handlers = getRegisteredHandlers();
    const runAnalysisHandler = handlers.get(IPC_CHANNELS.runAnalysis);
    const send = vi.fn();

    if (!runAnalysisHandler) {
      throw new Error('runAnalysis handler was not registered');
    }

    const result = await runAnalysisHandler(
      { sender: { send } },
      {
        documentId: 'd_123',
        personaMode: 'general-reader',
        promptVersion: 'v1.0.0',
        paragraphs: [{ paragraphId: 'p_123', order: 1, text: '本文' }],
        documentParagraphs: [{ paragraphId: 'p_123', order: 1, text: '本文' }],
      },
    );

    expect(analysisProviderMock.resolveAnalysisProvider).toHaveBeenCalled();
    expect(apiBridgeMock.runAnalysis).toHaveBeenCalled();
    expect(send).toHaveBeenCalledWith(IPC_CHANNELS.analysisProgress, {
      paragraphId: 'p_123',
      result: progressResult,
    });
    expect(result).toEqual({ requestId: 'req_123', results: [progressResult] });
  });

  it('allows filesystem IPC calls for paths inside a project root', async () => {
    await withTempProject(async ({ projectRoot }) => {
      fileServiceMock.listTree.mockResolvedValue([]);
      fileServiceMock.load.mockResolvedValue({ documentId: 'd_abcdefghij' });
      fileServiceMock.save.mockResolvedValue({ ok: true, revision: 2 });

      registerIpcHandlers();

      const listTreeHandler = getRequiredHandler(IPC_CHANNELS.listTree);
      const loadDocumentHandler = getRequiredHandler(IPC_CHANNELS.loadDocument);
      const saveDocumentHandler = getRequiredHandler(IPC_CHANNELS.saveDocument);
      const documentPath = path.join(projectRoot, 'draft.lzl');

      await expect(listTreeHandler(undefined as never, projectRoot as never)).resolves.toEqual([]);
      await expect(loadDocumentHandler(undefined as never, documentPath as never)).resolves.toEqual({
        documentId: 'd_abcdefghij',
      });
      await expect(
        saveDocumentHandler(undefined as never, documentPath as never, { documentId: 'd_abcdefghij' } as never, 1 as never),
      ).resolves.toEqual({ ok: true, revision: 2 });

      expect(fileServiceMock.listTree).toHaveBeenCalledWith(projectRoot);
      expect(fileServiceMock.load).toHaveBeenCalledWith(documentPath);
      expect(fileServiceMock.save).toHaveBeenCalledWith(documentPath, { documentId: 'd_abcdefghij' }, 1);
    });
  });

  it('rejects delete, rename, load, and save calls outside a project before filesystem work runs', async () => {
    await withTempProject(async ({ outsidePath }) => {
      const renameSpy = vi.spyOn(fs, 'rename');
      const rmSpy = vi.spyOn(fs, 'rm');

      try {
        registerIpcHandlers();

        await expect(getRequiredHandler(IPC_CHANNELS.deleteEntry)(undefined as never, outsidePath as never))
          .rejects.toThrow('DELETE_ENTRY_FAILED: Project root was not found');
        await expect(getRequiredHandler(IPC_CHANNELS.renameEntry)(undefined as never, outsidePath as never, 'next' as never))
          .rejects.toThrow('RENAME_ENTRY_FAILED: Project root was not found');
        await expect(getRequiredHandler(IPC_CHANNELS.loadDocument)(undefined as never, outsidePath as never))
          .rejects.toThrow('Project root was not found');
        await expect(
          getRequiredHandler(IPC_CHANNELS.saveDocument)(
            undefined as never,
            outsidePath as never,
            { documentId: 'd_abcdefghij' } as never,
            1 as never,
          ),
        ).rejects.toThrow('Project root was not found');

        expect(rmSpy).not.toHaveBeenCalledWith(outsidePath, expect.anything());
        expect(renameSpy).not.toHaveBeenCalled();
        expect(fileServiceMock.load).not.toHaveBeenCalled();
        expect(fileServiceMock.save).not.toHaveBeenCalled();
      } finally {
        renameSpy.mockRestore();
        rmSpy.mockRestore();
      }
    });
  });

  it('rejects create and import calls when the parent path is not inside a project', async () => {
    await withTempProject(async ({ outsidePath }) => {
      registerIpcHandlers();

      await expect(getRequiredHandler(IPC_CHANNELS.createEntry)(undefined as never, outsidePath as never, 'file' as never, 'draft' as never))
        .rejects.toThrow('CREATE_ENTRY_FAILED: Project root was not found');
      await expect(getRequiredHandler(IPC_CHANNELS.createDocument)(undefined as never, outsidePath as never, 'draft' as never))
        .rejects.toThrow('Project root was not found');
      await expect(getRequiredHandler(IPC_CHANNELS.importTextFile)(undefined as never, outsidePath as never))
        .rejects.toThrow('IMPORT_TEXT_FAILED: Project root was not found');

      expect(fileServiceMock.createDocument).not.toHaveBeenCalled();
      expect(electronMock.showOpenDialog).not.toHaveBeenCalled();
    });
  });

  it('rejects project-local symlinks that resolve outside the project', async () => {
    await withTempProject(async ({ projectRoot, outsidePath }) => {
      const symlinkPath = path.join(projectRoot, 'linked-outside.lzl');
      await fs.symlink(outsidePath, symlinkPath);

      registerIpcHandlers();

      await expect(getRequiredHandler(IPC_CHANNELS.loadDocument)(undefined as never, symlinkPath as never))
        .rejects.toThrow('Path resolves outside the project root');

      expect(fileServiceMock.load).not.toHaveBeenCalled();
    });
  });

  it('rejects analysis IPC calls with an invalid project root or generated filename ids', async () => {
    await withTempProject(async ({ projectRoot, outsidePath }) => {
      registerIpcHandlers();

      await expect(getRequiredHandler(IPC_CHANNELS.loadAnalysis)(undefined as never, outsidePath as never, 'd_abcdefghij' as never))
        .rejects.toThrow('LOAD_ANALYSIS_FAILED: Project root is invalid');
      await expect(getRequiredHandler(IPC_CHANNELS.loadAnalysis)(undefined as never, projectRoot as never, '../escape' as never))
        .rejects.toThrow('LOAD_ANALYSIS_FAILED: Invalid documentId');
      await expect(
        getRequiredHandler(IPC_CHANNELS.saveAnalysisResult)(
          undefined as never,
          projectRoot as never,
          'd_abcdefghij' as never,
          '../escape' as never,
          {} as never,
        ),
      ).rejects.toThrow('SAVE_ANALYSIS_FAILED: Invalid paragraphId');
      await expect(getRequiredHandler(IPC_CHANNELS.createAnalysisGeneration)(undefined as never, projectRoot as never, '../escape' as never))
        .rejects.toThrow('CREATE_GENERATION_FAILED: Invalid documentId');

      expect(analysisStoreMock.loadLatestAnalysis).not.toHaveBeenCalled();
      expect(analysisStoreMock.appendParagraphPattern).not.toHaveBeenCalled();
      expect(analysisStoreMock.createGeneration).not.toHaveBeenCalled();
    });
  });
});
