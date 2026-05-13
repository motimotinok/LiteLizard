import { DEFAULT_ANALYSIS_SETTINGS, type ParagraphAnalysisPattern } from '@litelizard/shared';
import { describe, expect, it } from 'vitest';
import { createMockPreloadApi } from './preloadMockApi.js';
import { mockRootPath } from './preloadMockData.js';

type TreeNode = {
  path: string;
  name: string;
  type: 'file' | 'directory';
  children?: TreeNode[];
};

function flattenFilePaths(nodes: TreeNode[]): string[] {
  const files: string[] = [];
  for (const node of nodes) {
    if (node.type === 'file') {
      files.push(node.path);
      continue;
    }
    if (node.children) {
      files.push(...flattenFilePaths(node.children));
    }
  }
  return files;
}

describe('createMockPreloadApi', () => {
  it('keeps file creation flows on .lzl', async () => {
    const api = createMockPreloadApi();

    const createdEntry = await api.createEntry(mockRootPath, 'file', 'draft');
    expect(createdEntry.path).toBe(`${mockRootPath}/draft.lzl`);

    const renamedEntry = await api.renameEntry(createdEntry.path, 'renamed');
    expect(renamedEntry.path).toBe(`${mockRootPath}/renamed.lzl`);

    const moveTarget = `${mockRootPath}/drafts`;
    await api.createEntry(mockRootPath, 'folder', 'drafts');
    const movedEntry = await api.moveEntry(renamedEntry.path, moveTarget);
    expect(movedEntry.path).toBe(`${moveTarget}/renamed.lzl`);

    const createdDocument = await api.createDocument(mockRootPath, 'top-level');
    expect(createdDocument.filePath).toBe(`${mockRootPath}/top-level.lzl`);

    const tree = await api.listTree(mockRootPath);
    expect(flattenFilePaths(tree as TreeNode[])).toEqual(
      expect.arrayContaining([
        `${moveTarget}/renamed.lzl`,
        `${mockRootPath}/top-level.lzl`,
      ]),
    );
  });

  it('analysis settings を保存して再読込できる', async () => {
    const api = createMockPreloadApi();

    await api.saveProviderApiKey('openai', 'sk-test');
    await api.saveAnalysisSettings({
      defaultProvider: 'local-llm',
      providers: {
        openai: { defaultModel: 'gpt-4.1-mini' },
        anthropic: { defaultModel: 'claude-3-7-sonnet-latest' },
      },
      localLlm: {
        endpoint: 'http://127.0.0.1:11434',
        defaultModel: 'llama3.2',
      },
    });

    const settings = await api.loadAnalysisSettings();

    expect(settings.providers.openai.apiKeyConfigured).toBe(true);
    expect(settings.defaultProvider).toBe('local-llm');
    expect(settings.localLlm.configured).toBe(true);
  });

  it('旧 Anthropic 既定モデルは mock preload でも Claude Haiku 4.5 の API ID に移行する', async () => {
    const api = createMockPreloadApi();

    await api.saveAnalysisSettings({
      defaultProvider: 'anthropic',
      providers: {
        openai: { defaultModel: 'gpt-4.1-mini' },
        anthropic: { defaultModel: 'claude-haiku-4-5' },
      },
      localLlm: {
        endpoint: 'http://127.0.0.1:11434',
        defaultModel: 'llama3.2',
      },
    });

    const settings = await api.loadAnalysisSettings();

    expect(settings.providers.anthropic.defaultModel).toBe(
      DEFAULT_ANALYSIS_SETTINGS.providers.anthropic.defaultModel,
    );
  });

  it('editor tweaks を保存して再読込できる', async () => {
    const api = createMockPreloadApi();

    await api.saveAnalysisSettings({
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
        bodyFontSize: 19,
        lineHeight: 2.05,
        paperWarmth: 35,
        analysisPanelMode: 'overlay',
      },
    });

    const settings = await api.loadAnalysisSettings();

    expect(settings.editorTweaks).toEqual({
      typeface: 'sans',
      bodyFontSize: 19,
      lineHeight: 2.05,
      paperWarmth: 35,
      analysisPanelMode: 'overlay',
    });
  });

  it('Anthropic を既定 provider として保持できる', async () => {
    const api = createMockPreloadApi();

    await api.saveProviderApiKey('anthropic', 'sk-ant-test');
    await api.saveAnalysisSettings({
      defaultProvider: 'anthropic',
      providers: {
        openai: { defaultModel: 'gpt-4.1-mini' },
        anthropic: { defaultModel: 'claude-3-7-sonnet-latest' },
      },
      localLlm: {
        endpoint: 'http://127.0.0.1:11434',
        defaultModel: 'llama3.2',
      },
    });

    const settings = await api.loadAnalysisSettings();

    expect(settings.defaultProvider).toBe('anthropic');
    expect(settings.providers.anthropic.apiKeyConfigured).toBe(true);
  });

  it('runAnalysis は documentParagraphs 付き payload を受け取れる', async () => {
    const api = createMockPreloadApi();

    const result = await api.runAnalysis({
      documentId: 'doc-1',
      agentId: 'reader-quiet',
      personaMode: 'general-reader',
      promptVersion: 'v1.0.0',
      paragraphs: [{ paragraphId: 'p2', order: 2, text: 'second' }],
      documentParagraphs: [
        { paragraphId: 'p1', order: 1, text: 'first' },
        { paragraphId: 'p2', order: 2, text: 'second' },
      ],
    });

    expect(result.results).toHaveLength(1);
    expect(result.results[0]?.paragraphId).toBe('p2');
  });

  describe('解析ストア mock', () => {
    function makePattern(seq: number): ParagraphAnalysisPattern {
      return {
        analyzedAt: `2026-04-11T00:00:0${seq % 10}.000Z`,
        result: { emotion: [`seq-${seq}`] },
      };
    }

    it('loadAnalysis は保存前は null を返す', async () => {
      const api = createMockPreloadApi();

      expect(await api.loadAnalysis(mockRootPath, 'doc-empty')).toBeNull();
    });

    it('saveAnalysisResult で段落ごとの patterns が蓄積される', async () => {
      const api = createMockPreloadApi();

      await api.saveAnalysisResult(mockRootPath, 'doc-1', 'p1', makePattern(0));
      await api.saveAnalysisResult(mockRootPath, 'doc-1', 'p1', makePattern(1));
      await api.saveAnalysisResult(mockRootPath, 'doc-1', 'p2', makePattern(2));

      const file = await api.loadAnalysis(mockRootPath, 'doc-1');
      expect(file?.documentId).toBe('doc-1');
      expect(file?.generation).toBe(1);
      expect(file?.paragraphs.p1?.patterns.map((p) => p.result.emotion?.[0])).toEqual([
        'seq-0',
        'seq-1',
      ]);
      expect(file?.paragraphs.p2?.patterns).toHaveLength(1);
    });

    it('loadAnalysis は documentId ごとに独立した結果を返す', async () => {
      const api = createMockPreloadApi();

      await api.saveAnalysisResult(mockRootPath, 'doc-a', 'p1', makePattern(0));
      await api.saveAnalysisResult(mockRootPath, 'doc-b', 'p1', makePattern(1));

      const fileA = await api.loadAnalysis(mockRootPath, 'doc-a');
      const fileB = await api.loadAnalysis(mockRootPath, 'doc-b');
      expect(fileA?.paragraphs.p1?.patterns[0]?.result.emotion?.[0]).toBe('seq-0');
      expect(fileB?.paragraphs.p1?.patterns[0]?.result.emotion?.[0]).toBe('seq-1');
    });

    it('loadAnalysis の戻り値を変更してもストアに影響しない', async () => {
      const api = createMockPreloadApi();

      await api.saveAnalysisResult(mockRootPath, 'doc-1', 'p1', makePattern(0));
      const file = await api.loadAnalysis(mockRootPath, 'doc-1');
      file!.paragraphs.p1!.patterns.push(makePattern(99));

      const reloaded = await api.loadAnalysis(mockRootPath, 'doc-1');
      expect(reloaded?.paragraphs.p1?.patterns).toHaveLength(1);
    });

    it('createAnalysisGeneration は世代番号をインクリメントし新世代を空で作る', async () => {
      const api = createMockPreloadApi();

      await api.saveAnalysisResult(mockRootPath, 'doc-1', 'p1', makePattern(0));
      const first = await api.loadAnalysis(mockRootPath, 'doc-1');
      expect(first?.generation).toBe(1);

      const generation = await api.createAnalysisGeneration(mockRootPath, 'doc-1');
      expect(generation).toBe(2);

      const next = await api.loadAnalysis(mockRootPath, 'doc-1');
      expect(next?.generation).toBe(2);
      expect(next?.paragraphs).toEqual({});

      await api.saveAnalysisResult(mockRootPath, 'doc-1', 'p2', makePattern(3));
      const final = await api.loadAnalysis(mockRootPath, 'doc-1');
      expect(final?.generation).toBe(2);
      expect(final?.paragraphs.p2?.patterns).toHaveLength(1);
    });

    it('createAnalysisGeneration は何も保存していない documentId でも 1 から始まる', async () => {
      const api = createMockPreloadApi();

      const generation = await api.createAnalysisGeneration(mockRootPath, 'doc-fresh');
      expect(generation).toBe(1);

      const file = await api.loadAnalysis(mockRootPath, 'doc-fresh');
      expect(file?.generation).toBe(1);
      expect(file?.paragraphs).toEqual({});
    });
  });

  it('Reading Agent mock は built-in 4件を返す', async () => {
    const api = createMockPreloadApi();

    const agents = await api.listReadingAgents();

    expect(agents.map((agent) => agent.id)).toEqual([
      'reader-quiet',
      'reader-critical',
      'reader-first',
      'reader-editor',
    ]);
    expect(agents.every((agent) => agent.builtIn)).toBe(true);
  });
});
