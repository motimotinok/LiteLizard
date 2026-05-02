import { beforeEach, describe, expect, it, vi } from 'vitest';
import { IPC_CHANNELS, type AnalysisProgressEvent } from '@litelizard/shared';

const electronMock = vi.hoisted(() => ({
  invoke: vi.fn(),
  on: vi.fn(),
  removeListener: vi.fn(),
}));

vi.mock('electron', () => ({
  ipcRenderer: electronMock,
}));

import { createIpcBridge } from './ipcBridge.js';

describe('createIpcBridge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('BridgeApi methods call ipcRenderer.invoke with the shared IPC channels', async () => {
    electronMock.invoke.mockResolvedValue({ ok: true });
    const api = createIpcBridge();

    await api.openFolder();
    await api.getLastOpenedFolder();
    await api.setLastOpenedFolder('/project');
    await api.listTree('/project');
    await api.createEntry('/project', 'file', 'draft');
    await api.renameEntry('/project/old.lzl', 'new');
    await api.deleteEntry('/project/draft.lzl');
    await api.loadDocument('/project/draft.lzl');
    await api.createDocument('/project', 'draft');
    await api.saveDocument('/project/draft.lzl', {} as never, 3);
    await api.runAnalysis({} as never);
    await api.loadAnalysis('/project', 'd_123', '/project/draft.lzl');
    await api.saveAnalysisResult('/project', 'd_123', 'p_123', {} as never);
    await api.createAnalysisGeneration('/project', 'd_123');
    await api.loadAnalysisSettings();
    await api.saveProviderApiKey('openai', 'sk-test');
    await api.clearProviderApiKey('openai');
    await api.saveAnalysisSettings({} as never);
    await api.testLocalLlmConnection({ endpoint: 'http://127.0.0.1:11434', model: 'llama3.2' });
    await api.importTextFile('/project');
    await api.listReadingAgents();
    await api.getReadingAgent('reader-quiet');
    await api.saveReadingAgent({
      id: 'reader-quiet',
      name: '静かな読者',
      role: '情緒や余韻を中心に短く',
      systemPrompt: 'あなたは静かな読者として段落を読みます。',
    });
    await api.deleteReadingAgent('reader-quiet');
    await api.resetReadingAgents();

    expect(electronMock.invoke).toHaveBeenCalledWith(IPC_CHANNELS.openFolder);
    expect(electronMock.invoke).toHaveBeenCalledWith(IPC_CHANNELS.getLastOpenedFolder);
    expect(electronMock.invoke).toHaveBeenCalledWith(IPC_CHANNELS.setLastOpenedFolder, '/project');
    expect(electronMock.invoke).toHaveBeenCalledWith(IPC_CHANNELS.listTree, '/project');
    expect(electronMock.invoke).toHaveBeenCalledWith(IPC_CHANNELS.createEntry, '/project', 'file', 'draft');
    expect(electronMock.invoke).toHaveBeenCalledWith(IPC_CHANNELS.renameEntry, '/project/old.lzl', 'new');
    expect(electronMock.invoke).toHaveBeenCalledWith(IPC_CHANNELS.deleteEntry, '/project/draft.lzl');
    expect(electronMock.invoke).toHaveBeenCalledWith(IPC_CHANNELS.loadDocument, '/project/draft.lzl');
    expect(electronMock.invoke).toHaveBeenCalledWith(IPC_CHANNELS.createDocument, '/project', 'draft');
    expect(electronMock.invoke).toHaveBeenCalledWith(IPC_CHANNELS.saveDocument, '/project/draft.lzl', {}, 3);
    expect(electronMock.invoke).toHaveBeenCalledWith(IPC_CHANNELS.runAnalysis, {});
    expect(electronMock.invoke).toHaveBeenCalledWith(IPC_CHANNELS.loadAnalysis, '/project', 'd_123', '/project/draft.lzl');
    expect(electronMock.invoke).toHaveBeenCalledWith(IPC_CHANNELS.saveAnalysisResult, '/project', 'd_123', 'p_123', {});
    expect(electronMock.invoke).toHaveBeenCalledWith(IPC_CHANNELS.createAnalysisGeneration, '/project', 'd_123');
    expect(electronMock.invoke).toHaveBeenCalledWith(IPC_CHANNELS.loadAnalysisSettings);
    expect(electronMock.invoke).toHaveBeenCalledWith(IPC_CHANNELS.saveProviderApiKey, 'openai', 'sk-test');
    expect(electronMock.invoke).toHaveBeenCalledWith(IPC_CHANNELS.clearProviderApiKey, 'openai');
    expect(electronMock.invoke).toHaveBeenCalledWith(IPC_CHANNELS.saveAnalysisSettings, {});
    expect(electronMock.invoke).toHaveBeenCalledWith(
      IPC_CHANNELS.testLocalLlmConnection,
      { endpoint: 'http://127.0.0.1:11434', model: 'llama3.2' },
    );
    expect(electronMock.invoke).toHaveBeenCalledWith(IPC_CHANNELS.importTextFile, '/project');
    expect(electronMock.invoke).toHaveBeenCalledWith(IPC_CHANNELS.listReadingAgents);
    expect(electronMock.invoke).toHaveBeenCalledWith(IPC_CHANNELS.getReadingAgent, 'reader-quiet');
    expect(electronMock.invoke).toHaveBeenCalledWith(
      IPC_CHANNELS.saveReadingAgent,
      {
        id: 'reader-quiet',
        name: '静かな読者',
        role: '情緒や余韻を中心に短く',
        systemPrompt: 'あなたは静かな読者として段落を読みます。',
      },
    );
    expect(electronMock.invoke).toHaveBeenCalledWith(IPC_CHANNELS.deleteReadingAgent, 'reader-quiet');
    expect(electronMock.invoke).toHaveBeenCalledWith(IPC_CHANNELS.resetReadingAgents);
  });

  it('onRequestOpenFolder registers and removes the menu event listener', () => {
    const api = createIpcBridge();
    const listener = vi.fn();

    const unsubscribe = api.onRequestOpenFolder(listener);
    const wrapped = electronMock.on.mock.calls[0]?.[1] as () => void;
    wrapped();
    unsubscribe();

    expect(electronMock.on).toHaveBeenCalledWith(IPC_CHANNELS.requestOpenFolder, expect.any(Function));
    expect(listener).toHaveBeenCalledTimes(1);
    expect(electronMock.removeListener).toHaveBeenCalledWith(IPC_CHANNELS.requestOpenFolder, wrapped);
  });

  it('onAnalysisProgress unwraps the IPC event payload and removes the listener', () => {
    const api = createIpcBridge();
    const listener = vi.fn();
    const event: AnalysisProgressEvent = {
      paragraphId: 'p_123',
      result: {
        paragraphId: 'p_123',
        emotion: [],
        theme: [],
        deepMeaning: '読者には静かな決意として届く',
        confidence: 0.8,
        model: 'gpt-4.1-mini',
        analyzedAt: '2026-04-25T00:00:00.000Z',
        promptVersion: 'v1.0.0',
      },
    };

    const unsubscribe = api.onAnalysisProgress(listener);
    const wrapped = electronMock.on.mock.calls[0]?.[1] as (_: unknown, event: AnalysisProgressEvent) => void;
    wrapped({}, event);
    unsubscribe();

    expect(electronMock.on).toHaveBeenCalledWith(IPC_CHANNELS.analysisProgress, expect.any(Function));
    expect(listener).toHaveBeenCalledWith(event);
    expect(electronMock.removeListener).toHaveBeenCalledWith(IPC_CHANNELS.analysisProgress, wrapped);
  });
});
