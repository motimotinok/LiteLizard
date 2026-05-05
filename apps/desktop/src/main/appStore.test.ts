import { beforeEach, describe, expect, it, vi } from 'vitest';

const appStoreMock = vi.hoisted(() => ({
  readFile: vi.fn(),
  mkdir: vi.fn(),
  writeFile: vi.fn(),
  getPath: vi.fn(() => '/tmp/litelizard-user-data'),
}));

vi.mock('node:fs/promises', () => ({
  default: {
    readFile: appStoreMock.readFile,
    mkdir: appStoreMock.mkdir,
    writeFile: appStoreMock.writeFile,
  },
}));

vi.mock('electron', () => ({
  app: {
    getPath: appStoreMock.getPath,
  },
}));

import {
  getActiveReadingAgentId,
  getLastOpenedFolder,
  setActiveReadingAgentId,
  setLastOpenedFolder,
} from './appStore.js';

describe('appStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('保存済み lastOpenedFolder を返す', async () => {
    appStoreMock.readFile.mockResolvedValue(JSON.stringify({ lastOpenedFolder: '/projects/novel' }));

    await expect(getLastOpenedFolder()).resolves.toBe('/projects/novel');
  });

  it('ストアが無い場合は null を返す', async () => {
    appStoreMock.readFile.mockRejectedValue(new Error('missing'));

    await expect(getLastOpenedFolder()).resolves.toBeNull();
  });

  it('lastOpenedFolder を保存する', async () => {
    appStoreMock.writeFile.mockResolvedValue(undefined);
    appStoreMock.mkdir.mockResolvedValue(undefined);
    appStoreMock.readFile.mockRejectedValue(new Error('missing'));

    await setLastOpenedFolder('/projects/story');

    expect(appStoreMock.mkdir).toHaveBeenCalledWith('/tmp/litelizard-user-data', { recursive: true });
    expect(appStoreMock.writeFile).toHaveBeenCalledWith(
      '/tmp/litelizard-user-data/app-store.json',
      JSON.stringify({ lastOpenedFolder: '/projects/story', activeReadingAgentId: null }, null, 2),
      'utf8'
    );
  });

  it('activeReadingAgentId を保存して復元する', async () => {
    appStoreMock.readFile
      .mockResolvedValueOnce(JSON.stringify({ lastOpenedFolder: '/projects/story' }))
      .mockResolvedValueOnce(JSON.stringify({ activeReadingAgentId: 'reader-editor' }));
    appStoreMock.writeFile.mockResolvedValue(undefined);
    appStoreMock.mkdir.mockResolvedValue(undefined);

    await setActiveReadingAgentId('reader-editor');
    await expect(getActiveReadingAgentId()).resolves.toBe('reader-editor');

    expect(appStoreMock.writeFile).toHaveBeenCalledWith(
      '/tmp/litelizard-user-data/app-store.json',
      JSON.stringify({ lastOpenedFolder: '/projects/story', activeReadingAgentId: 'reader-editor' }, null, 2),
      'utf8',
    );
  });
});
