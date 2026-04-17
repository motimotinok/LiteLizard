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
});
