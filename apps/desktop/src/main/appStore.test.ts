import { beforeEach, describe, expect, it, vi } from 'vitest';

const readFile = vi.fn();
const mkdir = vi.fn();
const writeFile = vi.fn();
const getPath = vi.fn(() => '/tmp/litelizard-user-data');

vi.mock('node:fs/promises', () => ({
  default: {
    readFile,
    mkdir,
    writeFile,
  },
}));

vi.mock('electron', () => ({
  app: {
    getPath,
  },
}));

import { getLastOpenedFolder, setLastOpenedFolder } from './appStore.js';

describe('appStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('保存済み lastOpenedFolder を返す', async () => {
    readFile.mockResolvedValue(JSON.stringify({ lastOpenedFolder: '/projects/novel' }));

    await expect(getLastOpenedFolder()).resolves.toBe('/projects/novel');
  });

  it('ストアが無い場合は null を返す', async () => {
    readFile.mockRejectedValue(new Error('missing'));

    await expect(getLastOpenedFolder()).resolves.toBeNull();
  });

  it('lastOpenedFolder を保存する', async () => {
    writeFile.mockResolvedValue(undefined);
    mkdir.mockResolvedValue(undefined);

    await setLastOpenedFolder('/projects/story');

    expect(mkdir).toHaveBeenCalledWith('/tmp/litelizard-user-data', { recursive: true });
    expect(writeFile).toHaveBeenCalledWith(
      '/tmp/litelizard-user-data/app-store.json',
      JSON.stringify({ lastOpenedFolder: '/projects/story' }, null, 2),
      'utf8'
    );
  });
});
