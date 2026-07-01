import { beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { DEFAULT_ANALYSIS_SETTINGS, IPC_CHANNELS, type AnalysisResult } from '@litelizard/shared';

const electronMock = vi.hoisted(() => ({
  handle: vi.fn(),
  showOpenDialog: vi.fn(),
  showSaveDialog: vi.fn(),
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

const readingAgentStoreMock = vi.hoisted(() => ({
  list: vi.fn(),
  get: vi.fn(),
  save: vi.fn(),
  delete: vi.fn(),
  resetToDefaults: vi.fn(),
}));

const analysisProviderMock = vi.hoisted(() => ({
  resolveAnalysisProvider: vi.fn(),
}));

const apiBridgeMock = vi.hoisted(() => ({
  runAnalysis: vi.fn(),
  dryRunReadingAgent: vi.fn(),
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
    showSaveDialog: electronMock.showSaveDialog,
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

vi.mock('./agentStore.js', () => ({
  createReadingAgentStore: () => readingAgentStoreMock,
}));

vi.mock('./analysisProvider.js', () => analysisProviderMock);

vi.mock('./apiBridge.js', () => apiBridgeMock);

vi.mock('./analysisStore.js', () => analysisStoreMock);

vi.mock('./projectManager.js', () => ({
  ensureProject: vi.fn(),
  assertProjectLocationSafe: vi.fn(),
  assertProjectWritable: vi.fn(),
}));

vi.mock('./appStore.js', () => ({
  getActiveReadingAgentId: vi.fn(async () => 'reader-quiet'),
  getLastOpenedFolder: vi.fn(),
  setActiveReadingAgentId: vi.fn(),
  setLastOpenedFolder: vi.fn(),
}));

import { registerIpcHandlers } from './ipc.js';
import { assertProjectLocationSafe, ensureProject } from './projectManager.js';

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

function silenceConsoleError() {
  // 修正済み: 期待拒否経路の検証済みログでテストstderrを汚さないため、対象テスト内で明示的に抑制する。
  return vi.spyOn(console, 'error').mockImplementation(() => undefined);
}

describe('registerIpcHandlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiKeyVaultMock.loadAll.mockResolvedValue({ openai: 'sk-openai' });
    analysisSettingsStoreMock.load.mockResolvedValue(DEFAULT_ANALYSIS_SETTINGS);
    readingAgentStoreMock.list.mockResolvedValue([]);
    readingAgentStoreMock.get.mockResolvedValue(null);
    readingAgentStoreMock.save.mockImplementation(async (input) => ({
      id: input.id ?? 'reader-created',
      name: input.name,
      role: input.role,
      systemPrompt: input.systemPrompt,
      model: input.model ?? null,
      contextPolicy: input.contextPolicy,
      createdAt: '2026-05-02T00:00:00.000Z',
      updatedAt: '2026-05-02T00:00:00.000Z',
      builtIn: false,
    }));
    readingAgentStoreMock.delete.mockResolvedValue(undefined);
    readingAgentStoreMock.resetToDefaults.mockResolvedValue([]);
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

  it('openFolder は新規フォルダ作成を許可する folder picker を開く', async () => {
    electronMock.showOpenDialog.mockResolvedValue({
      canceled: true,
      filePaths: [],
    });
    registerIpcHandlers();

    await getRequiredHandler(IPC_CHANNELS.openFolder)();

    expect(electronMock.showOpenDialog).toHaveBeenCalledWith(
      expect.objectContaining({
        properties: expect.arrayContaining(['openDirectory', 'createDirectory']),
      }),
    );
    expect(ensureProject).not.toHaveBeenCalled();
  });

  it('wires reading agent IPC handlers to the main store', async () => {
    const savedInput = {
      id: 'reader-quiet',
      name: '静かな読者',
      role: '静かに読む',
      systemPrompt: '静かに読んでください。',
      model: null,
      contextPolicy: { mode: 'whole-document' },
    };
    readingAgentStoreMock.list.mockResolvedValue([{ id: 'reader-quiet' }]);
    readingAgentStoreMock.get.mockResolvedValue({ id: 'reader-quiet' });
    readingAgentStoreMock.resetToDefaults.mockResolvedValue([{ id: 'reader-quiet' }]);

    registerIpcHandlers();

    await expect(getRequiredHandler(IPC_CHANNELS.listReadingAgents)(undefined as never)).resolves.toEqual([{ id: 'reader-quiet' }]);
    await expect(getRequiredHandler(IPC_CHANNELS.getReadingAgent)(undefined as never, 'reader-quiet' as never)).resolves.toEqual({
      id: 'reader-quiet',
    });
    await expect(getRequiredHandler(IPC_CHANNELS.saveReadingAgent)(undefined as never, savedInput as never)).resolves.toMatchObject({
      id: 'reader-quiet',
      name: '静かな読者',
    });
    await expect(getRequiredHandler(IPC_CHANNELS.deleteReadingAgent)(undefined as never, 'reader-quiet' as never)).resolves.toEqual({
      ok: true,
    });
    await expect(getRequiredHandler(IPC_CHANNELS.resetReadingAgents)(undefined as never)).resolves.toEqual([{ id: 'reader-quiet' }]);
    await expect(getRequiredHandler(IPC_CHANNELS.getActiveReadingAgentId)(undefined as never)).resolves.toBe('reader-quiet');
    await expect(getRequiredHandler(IPC_CHANNELS.setActiveReadingAgentId)(undefined as never, 'reader-quiet' as never)).resolves.toEqual({
      ok: true,
    });

    expect(readingAgentStoreMock.list).toHaveBeenCalled();
    expect(readingAgentStoreMock.get).toHaveBeenCalledWith('reader-quiet');
    expect(readingAgentStoreMock.save).toHaveBeenCalledWith(savedInput);
    expect(readingAgentStoreMock.delete).toHaveBeenCalledWith('reader-quiet');
    expect(readingAgentStoreMock.resetToDefaults).toHaveBeenCalled();
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
    const agent = {
      id: 'reader-quiet',
      name: '静かな読者',
      role: '静かに読む',
      systemPrompt: '静かに読んでください。',
      model: null,
      contextPolicy: { mode: 'target-only' },
      createdAt: '2026-05-02T00:00:00.000Z',
      updatedAt: '2026-05-02T00:00:00.000Z',
      builtIn: true,
    };
    readingAgentStoreMock.get.mockResolvedValue(agent);
    apiBridgeMock.runAnalysis.mockImplementation(async (_input, _provider, _agent, onProgress) => {
      onProgress(progressResult);
      return { requestId: 'req_123', agentId: 'reader-quiet', results: [progressResult] };
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
        agentId: 'reader-quiet',
        personaMode: 'general-reader',
        promptVersion: 'v1.0.0',
        paragraphs: [{ paragraphId: 'p_123', order: 1, text: '本文' }],
        documentParagraphs: [{ paragraphId: 'p_123', order: 1, text: '本文' }],
      },
    );

    expect(analysisProviderMock.resolveAnalysisProvider).toHaveBeenCalled();
    expect(apiBridgeMock.runAnalysis).toHaveBeenCalledWith(
      expect.objectContaining({ agentId: 'reader-quiet' }),
      expect.anything(),
      agent,
      expect.any(Function),
      agent.contextPolicy,
    );
    expect(send).toHaveBeenCalledWith(IPC_CHANNELS.analysisProgress, {
      paragraphId: 'p_123',
      result: progressResult,
    });
    expect(result).toEqual({ requestId: 'req_123', agentId: 'reader-quiet', results: [progressResult] });
  });

  it('runs reading agent dry-run through the provider without progress events', async () => {
    const result: AnalysisResult = {
      paragraphId: 'p_123',
      emotion: ['静けさ'],
      theme: ['余韻'],
      deepMeaning: '静かな余韻です。',
      confidence: 0.8,
      model: 'gpt-4.1-mini',
      analyzedAt: '2026-05-05T00:00:00.000Z',
      promptVersion: 'v1.0.0',
    };
    apiBridgeMock.dryRunReadingAgent.mockResolvedValue(result);

    registerIpcHandlers();

    const input = {
      agent: {
        name: '静かな読者',
        role: '静かに読む',
        systemPrompt: '静かに読んでください。',
        model: null,
        contextPolicy: { mode: 'target-only' },
      },
      paragraph: { paragraphId: 'p_123', order: 1, text: '本文' },
      documentParagraphs: [{ paragraphId: 'p_123', order: 1, text: '本文' }],
      promptVersion: 'v1.0.0',
    };

    await expect(getRequiredHandler(IPC_CHANNELS.dryRunReadingAgent)(undefined as never, input as never)).resolves.toEqual(result);
    expect(apiBridgeMock.dryRunReadingAgent).toHaveBeenCalledWith(
      input,
      expect.anything(),
    );
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
      const exportDocumentTextHandler = getRequiredHandler(IPC_CHANNELS.exportDocumentText);
      const documentPath = path.join(projectRoot, 'draft.lzl');
      const exportPath = path.join(path.dirname(projectRoot), 'draft.txt');

      await expect(listTreeHandler(undefined as never, projectRoot as never)).resolves.toEqual([]);
      await expect(loadDocumentHandler(undefined as never, documentPath as never)).resolves.toEqual({
        documentId: 'd_abcdefghij',
      });
      await expect(
        saveDocumentHandler(undefined as never, documentPath as never, { documentId: 'd_abcdefghij' } as never, 1 as never),
      ).resolves.toEqual({ ok: true, revision: 2 });

      electronMock.showSaveDialog.mockResolvedValueOnce({ canceled: false, filePath: exportPath });
      await expect(
        exportDocumentTextHandler(
          undefined as never,
          documentPath as never,
          {
            version: 2,
            documentId: 'd_abcdefghij',
            title: 'draft',
            personaMode: 'general-reader',
            createdAt: '2026-05-12T00:00:00.000Z',
            updatedAt: '2026-05-12T00:00:00.000Z',
            chapters: [{ id: 'c_abcdefghij', order: 1, title: '章1' }],
            paragraphs: [
              {
                id: 'p_abcdefghij',
                chapterId: 'c_abcdefghij',
                order: 1,
                light: { text: '本文', charCount: 2 },
                lizard: { status: 'complete', deepMeaning: '内部分析' },
              },
            ],
          } as never,
        ),
      ).resolves.toEqual({ ok: true, filePath: exportPath });
      await expect(fs.readFile(exportPath, 'utf8')).resolves.toBe('draft\n\n章1\n\n本文\n');

      expect(fileServiceMock.listTree).toHaveBeenCalledWith(projectRoot);
      expect(fileServiceMock.load).toHaveBeenCalledWith(documentPath);
      expect(fileServiceMock.save).toHaveBeenCalledWith(documentPath, { documentId: 'd_abcdefghij' }, 1);
    });
  });

  it('listTree は既存プロジェクト root でも安全でない場所を拒否する', async () => {
    const consoleErrorSpy = silenceConsoleError();
    try {
      await withTempProject(async ({ projectRoot }) => {
        vi.mocked(assertProjectLocationSafe).mockRejectedValueOnce(
          new Error(
            'PROJECT_LOCATION_UNSAFE: /Applications/LiteLizard は LiteLizard の作業フォルダとして安全ではありません。',
          ),
        );

        registerIpcHandlers();

        await expect(getRequiredHandler(IPC_CHANNELS.listTree)(undefined as never, projectRoot as never))
          .rejects.toThrow(/LIST_TREE_FAILED: PROJECT_LOCATION_UNSAFE/);
        expect(fileServiceMock.listTree).not.toHaveBeenCalled();
        expect(consoleErrorSpy).toHaveBeenCalledWith('[IPC fs:listTree] failed', expect.any(Error));
      });
    } finally {
      consoleErrorSpy.mockRestore();
    }
  });

  it('listTree は通常の既存プロジェクト root ではファイル一覧へ進む', async () => {
    await withTempProject(async ({ projectRoot }) => {
      fileServiceMock.listTree.mockResolvedValue([{ path: path.join(projectRoot, 'draft.lzl'), name: 'draft.lzl', type: 'file' }]);

      registerIpcHandlers();

      await expect(getRequiredHandler(IPC_CHANNELS.listTree)(undefined as never, projectRoot as never)).resolves.toEqual([
        { path: path.join(projectRoot, 'draft.lzl'), name: 'draft.lzl', type: 'file' },
      ]);
      expect(assertProjectLocationSafe).toHaveBeenCalledWith(projectRoot);
      expect(fileServiceMock.listTree).toHaveBeenCalledWith(projectRoot);
    });
  });

  it('does not write export text when the save dialog is canceled', async () => {
    await withTempProject(async ({ projectRoot }) => {
      const documentPath = path.join(projectRoot, 'draft.lzl');
      electronMock.showSaveDialog.mockResolvedValueOnce({ canceled: true, filePath: undefined });

      registerIpcHandlers();

      await expect(
        getRequiredHandler(IPC_CHANNELS.exportDocumentText)(
          undefined as never,
          documentPath as never,
          {
            version: 2,
            documentId: 'd_abcdefghij',
            title: 'draft',
            personaMode: 'general-reader',
            createdAt: '2026-05-12T00:00:00.000Z',
            updatedAt: '2026-05-12T00:00:00.000Z',
            chapters: [],
            paragraphs: [],
          } as never,
        ),
      ).resolves.toBeNull();
    });
  });

  it('exports text without a source file path for unsaved documents', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'litelizard-export-'));
    const exportPath = path.join(dir, 'unsaved.txt');
    electronMock.showSaveDialog.mockResolvedValueOnce({ canceled: false, filePath: exportPath });

    try {
      registerIpcHandlers();

      await expect(
        getRequiredHandler(IPC_CHANNELS.exportDocumentText)(
          undefined as never,
          null as never,
          {
            version: 2,
            documentId: 'd_abcdefghij',
            title: 'unsaved',
            personaMode: 'general-reader',
            createdAt: '2026-05-12T00:00:00.000Z',
            updatedAt: '2026-05-12T00:00:00.000Z',
            chapters: [],
            paragraphs: [],
          } as never,
        ),
      ).resolves.toEqual({ ok: true, filePath: exportPath });
      await expect(fs.readFile(exportPath, 'utf8')).resolves.toBe('unsaved\n');
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });

  it('moves a .lzl file into another project folder with its analysis sidecar', async () => {
    await withTempProject(async ({ projectRoot }) => {
      const sourcePath = path.join(projectRoot, 'draft.lzl');
      const targetFolder = path.join(projectRoot, 'archive');
      const nextPath = path.join(targetFolder, 'draft.lzl');
      const sourceAnalysisPath = `${sourcePath}.analysis.json`;
      const nextAnalysisPath = `${nextPath}.analysis.json`;

      await fs.mkdir(targetFolder);
      await fs.writeFile(sourcePath, 'documentId: d_abcdefghij', 'utf8');
      await fs.writeFile(sourceAnalysisPath, '{"documentId":"d_abcdefghij"}', 'utf8');

      registerIpcHandlers();

      await expect(
        getRequiredHandler(IPC_CHANNELS.moveEntry)(undefined as never, sourcePath as never, targetFolder as never),
      ).resolves.toEqual({ ok: true, path: nextPath });

      await expect(fs.readFile(nextPath, 'utf8')).resolves.toContain('documentId');
      await expect(fs.readFile(nextAnalysisPath, 'utf8')).resolves.toContain('d_abcdefghij');
      await expect(fs.access(sourcePath)).rejects.toThrow();
      await expect(fs.access(sourceAnalysisPath)).rejects.toThrow();
    });
  });

  it('rejects move when the destination file already exists', async () => {
    const consoleErrorSpy = silenceConsoleError();
    try {
      await withTempProject(async ({ projectRoot }) => {
        const sourcePath = path.join(projectRoot, 'draft.lzl');
        const targetFolder = path.join(projectRoot, 'archive');
        const nextPath = path.join(targetFolder, 'draft.lzl');

        await fs.mkdir(targetFolder);
        await fs.writeFile(sourcePath, 'documentId: d_abcdefghij', 'utf8');
        await fs.writeFile(nextPath, 'documentId: d_existing01', 'utf8');

        registerIpcHandlers();

        await expect(
          getRequiredHandler(IPC_CHANNELS.moveEntry)(undefined as never, sourcePath as never, targetFolder as never),
        ).rejects.toThrow('MOVE_ENTRY_FAILED: Target already exists');

        await expect(fs.readFile(sourcePath, 'utf8')).resolves.toContain('d_abcdefghij');
        await expect(fs.readFile(nextPath, 'utf8')).resolves.toContain('d_existing01');
        expect(consoleErrorSpy).toHaveBeenCalledWith('[IPC fs:move] failed', expect.any(Error));
      });
    } finally {
      consoleErrorSpy.mockRestore();
    }
  });

  it('deleting a folder removes analysis generations for documents below it', async () => {
    await withTempProject(async ({ projectRoot }) => {
      const targetFolder = path.join(projectRoot, 'archive');
      const nestedFolder = path.join(targetFolder, 'nested');
      const firstDocumentId = 'd_abcdefghij';
      const secondDocumentId = 'd_klmnopqrst';
      const legacyDocumentId = 'legacy-document-id';

      await fs.mkdir(nestedFolder, { recursive: true });
      await fs.writeFile(path.join(targetFolder, 'first.lzl'), `documentId: ${firstDocumentId}`, 'utf8');
      await fs.writeFile(path.join(nestedFolder, 'second.lzl'), `documentId: ${secondDocumentId}`, 'utf8');
      await fs.writeFile(path.join(nestedFolder, 'legacy.lzl'), `documentId: ${legacyDocumentId}`, 'utf8');

      registerIpcHandlers();

      await expect(
        getRequiredHandler(IPC_CHANNELS.deleteEntry)(undefined as never, targetFolder as never),
      ).resolves.toEqual({ ok: true });

      await expect(fs.access(targetFolder)).rejects.toThrow();
      expect(analysisStoreMock.deleteAnalysisFiles).toHaveBeenCalledTimes(2);
      expect(analysisStoreMock.deleteAnalysisFiles).toHaveBeenCalledWith(projectRoot, firstDocumentId);
      expect(analysisStoreMock.deleteAnalysisFiles).toHaveBeenCalledWith(projectRoot, secondDocumentId);
      expect(analysisStoreMock.deleteAnalysisFiles).not.toHaveBeenCalledWith(projectRoot, legacyDocumentId);
    });
  });

  it('rejects delete, rename, move, load, and save calls outside a project before filesystem work runs', async () => {
    const consoleErrorSpy = silenceConsoleError();
    await withTempProject(async ({ outsidePath }) => {
      const renameSpy = vi.spyOn(fs, 'rename');
      const rmSpy = vi.spyOn(fs, 'rm');

      try {
        registerIpcHandlers();

        await expect(getRequiredHandler(IPC_CHANNELS.deleteEntry)(undefined as never, outsidePath as never))
          .rejects.toThrow('DELETE_ENTRY_FAILED: Project root was not found');
        await expect(getRequiredHandler(IPC_CHANNELS.renameEntry)(undefined as never, outsidePath as never, 'next' as never))
          .rejects.toThrow('RENAME_ENTRY_FAILED: Project root was not found');
        await expect(getRequiredHandler(IPC_CHANNELS.moveEntry)(undefined as never, outsidePath as never, outsidePath as never))
          .rejects.toThrow('MOVE_ENTRY_FAILED: Project root was not found');
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
        expect(consoleErrorSpy).toHaveBeenCalledWith('[IPC fs:delete] failed', expect.any(Error));
        expect(consoleErrorSpy).toHaveBeenCalledWith('[IPC fs:rename] failed', expect.any(Error));
        expect(consoleErrorSpy).toHaveBeenCalledWith('[IPC fs:move] failed', expect.any(Error));
      } finally {
        renameSpy.mockRestore();
        rmSpy.mockRestore();
        consoleErrorSpy.mockRestore();
      }
    });
  });

  it('rejects create and import calls when the parent path is not inside a project', async () => {
    const consoleErrorSpy = silenceConsoleError();
    try {
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
        expect(consoleErrorSpy).toHaveBeenCalledWith('[IPC fs:create] failed', expect.any(Error));
        expect(consoleErrorSpy).toHaveBeenCalledWith('[IPC doc:importText] failed', expect.any(Error));
      });
    } finally {
      consoleErrorSpy.mockRestore();
    }
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
    const consoleErrorSpy = silenceConsoleError();
    try {
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
        expect(consoleErrorSpy).toHaveBeenCalledWith('[IPC analysis:load] failed', expect.any(Error));
        expect(consoleErrorSpy).toHaveBeenCalledWith('[IPC analysis:save] failed', expect.any(Error));
        expect(consoleErrorSpy).toHaveBeenCalledWith('[IPC analysis:newGeneration] failed', expect.any(Error));
      });
    } finally {
      consoleErrorSpy.mockRestore();
    }
  });
});
