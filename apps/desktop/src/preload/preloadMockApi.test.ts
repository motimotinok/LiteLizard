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

    const createdDocument = await api.createDocument(mockRootPath, 'top-level');
    expect(createdDocument.filePath).toBe(`${mockRootPath}/top-level.lzl`);

    const tree = await api.listTree(mockRootPath);
    expect(flattenFilePaths(tree as TreeNode[])).toEqual(
      expect.arrayContaining([
        `${mockRootPath}/renamed.lzl`,
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
});
