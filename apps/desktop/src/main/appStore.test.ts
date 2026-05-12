import { beforeEach, describe, expect, it, vi } from 'vitest';

const appStoreMock = vi.hoisted(() => ({
  readFile: vi.fn(),
  mkdir: vi.fn(),
  writeFile: vi.fn(),
  stat: vi.fn(),
  getPath: vi.fn(() => '/tmp/litelizard-user-data'),
}));

vi.mock('node:fs/promises', () => ({
  default: {
    readFile: appStoreMock.readFile,
    mkdir: appStoreMock.mkdir,
    writeFile: appStoreMock.writeFile,
    stat: appStoreMock.stat,
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
  getRecentProjects,
  removeRecentProject,
  setActiveReadingAgentId,
  setLastOpenedFolder,
} from './appStore.js';

function makeDirStat(isDir: boolean) {
  return { isDirectory: () => isDir } as Awaited<ReturnType<typeof import('node:fs/promises').stat>>;
}

describe('appStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it('保存済み lastOpenedFolder を返す', async () => {
    appStoreMock.readFile.mockResolvedValue(JSON.stringify({ lastOpenedFolder: '/projects/novel' }));

    await expect(getLastOpenedFolder()).resolves.toBe('/projects/novel');
  });

  it('ストアが無い場合は null を返す', async () => {
    appStoreMock.readFile.mockRejectedValue(new Error('missing'));

    await expect(getLastOpenedFolder()).resolves.toBeNull();
  });

  it('lastOpenedFolder を保存し、recentProjects も更新する', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-06T10:00:00.000Z'));
    appStoreMock.writeFile.mockResolvedValue(undefined);
    appStoreMock.mkdir.mockResolvedValue(undefined);
    appStoreMock.readFile.mockRejectedValue(new Error('missing'));

    await setLastOpenedFolder('/projects/story');

    expect(appStoreMock.mkdir).toHaveBeenCalledWith('/tmp/litelizard-user-data', { recursive: true });
    expect(appStoreMock.writeFile).toHaveBeenCalledWith(
      '/tmp/litelizard-user-data/app-store.json',
      JSON.stringify(
        {
          lastOpenedFolder: '/projects/story',
          activeReadingAgentId: null,
          recentProjects: [{ path: '/projects/story', lastOpenedAt: '2026-05-06T10:00:00.000Z' }],
        },
        null,
        2,
      ),
      'utf8',
    );
  });

  it('同じフォルダを再度開くと recentProjects 内で先頭に移動して timestamp が更新される', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-06T11:00:00.000Z'));
    appStoreMock.writeFile.mockResolvedValue(undefined);
    appStoreMock.mkdir.mockResolvedValue(undefined);
    appStoreMock.readFile.mockResolvedValue(
      JSON.stringify({
        lastOpenedFolder: '/projects/other',
        activeReadingAgentId: null,
        recentProjects: [
          { path: '/projects/other', lastOpenedAt: '2026-05-06T10:30:00.000Z' },
          { path: '/projects/story', lastOpenedAt: '2026-05-06T10:00:00.000Z' },
        ],
      }),
    );

    await setLastOpenedFolder('/projects/story');

    const written = JSON.parse(appStoreMock.writeFile.mock.calls.at(-1)?.[1] ?? '{}');
    expect(written.recentProjects).toEqual([
      { path: '/projects/story', lastOpenedAt: '2026-05-06T11:00:00.000Z' },
      { path: '/projects/other', lastOpenedAt: '2026-05-06T10:30:00.000Z' },
    ]);
  });

  it('activeReadingAgentId を保存して復元する', async () => {
    appStoreMock.readFile
      .mockResolvedValueOnce(JSON.stringify({ lastOpenedFolder: '/projects/story' }))
      .mockResolvedValueOnce(JSON.stringify({ activeReadingAgentId: 'reader-editor' }));
    appStoreMock.writeFile.mockResolvedValue(undefined);
    appStoreMock.mkdir.mockResolvedValue(undefined);

    await setActiveReadingAgentId('reader-editor');
    await expect(getActiveReadingAgentId()).resolves.toBe('reader-editor');

    const written = JSON.parse(appStoreMock.writeFile.mock.calls.at(-1)?.[1] ?? '{}');
    expect(written.activeReadingAgentId).toBe('reader-editor');
  });

  it('getRecentProjects は exists フラグを付けて返す', async () => {
    appStoreMock.readFile.mockResolvedValue(
      JSON.stringify({
        recentProjects: [
          { path: '/projects/exists', lastOpenedAt: '2026-05-06T10:00:00.000Z' },
          { path: '/projects/missing', lastOpenedAt: '2026-05-06T09:00:00.000Z' },
        ],
      }),
    );
    appStoreMock.stat.mockImplementation(async (target: string) => {
      if (target === '/projects/missing') {
        throw new Error('ENOENT');
      }
      return makeDirStat(true);
    });

    await expect(getRecentProjects()).resolves.toEqual([
      { path: '/projects/exists', lastOpenedAt: '2026-05-06T10:00:00.000Z', exists: true },
      { path: '/projects/missing', lastOpenedAt: '2026-05-06T09:00:00.000Z', exists: false },
    ]);
  });

  it('getRecentProjects はファイル（ディレクトリでない）パスは exists=false にする', async () => {
    appStoreMock.readFile.mockResolvedValue(
      JSON.stringify({
        recentProjects: [{ path: '/projects/file.txt', lastOpenedAt: '2026-05-06T10:00:00.000Z' }],
      }),
    );
    appStoreMock.stat.mockResolvedValue(makeDirStat(false));

    await expect(getRecentProjects()).resolves.toEqual([
      { path: '/projects/file.txt', lastOpenedAt: '2026-05-06T10:00:00.000Z', exists: false },
    ]);
  });

  it('removeRecentProject は指定エントリを除外して保存する', async () => {
    appStoreMock.writeFile.mockResolvedValue(undefined);
    appStoreMock.mkdir.mockResolvedValue(undefined);
    appStoreMock.readFile.mockResolvedValue(
      JSON.stringify({
        recentProjects: [
          { path: '/projects/a', lastOpenedAt: '2026-05-06T10:00:00.000Z' },
          { path: '/projects/b', lastOpenedAt: '2026-05-06T09:00:00.000Z' },
        ],
      }),
    );

    await removeRecentProject('/projects/a');

    const written = JSON.parse(appStoreMock.writeFile.mock.calls.at(-1)?.[1] ?? '{}');
    expect(written.recentProjects).toEqual([
      { path: '/projects/b', lastOpenedAt: '2026-05-06T09:00:00.000Z' },
    ]);
  });

  it('removeRecentProject は対象が存在しない場合は書き込みしない', async () => {
    appStoreMock.writeFile.mockResolvedValue(undefined);
    appStoreMock.mkdir.mockResolvedValue(undefined);
    appStoreMock.readFile.mockResolvedValue(
      JSON.stringify({
        recentProjects: [{ path: '/projects/a', lastOpenedAt: '2026-05-06T10:00:00.000Z' }],
      }),
    );

    await removeRecentProject('/projects/nonexistent');

    expect(appStoreMock.writeFile).not.toHaveBeenCalled();
  });

  it('removeRecentProject は lastOpenedFolder と一致する場合に lastOpenedFolder も null にする', async () => {
    appStoreMock.writeFile.mockResolvedValue(undefined);
    appStoreMock.mkdir.mockResolvedValue(undefined);
    appStoreMock.readFile.mockResolvedValue(
      JSON.stringify({
        lastOpenedFolder: '/projects/missing',
        recentProjects: [
          { path: '/projects/missing', lastOpenedAt: '2026-05-06T10:00:00.000Z' },
          { path: '/projects/keep', lastOpenedAt: '2026-05-06T09:00:00.000Z' },
        ],
      }),
    );

    await removeRecentProject('/projects/missing');

    const written = JSON.parse(appStoreMock.writeFile.mock.calls.at(-1)?.[1] ?? '{}');
    expect(written.lastOpenedFolder).toBeNull();
    expect(written.recentProjects).toEqual([
      { path: '/projects/keep', lastOpenedAt: '2026-05-06T09:00:00.000Z' },
    ]);
  });

  it('removeRecentProject は recentProjects に無くても lastOpenedFolder 一致時にクリアする', async () => {
    appStoreMock.writeFile.mockResolvedValue(undefined);
    appStoreMock.mkdir.mockResolvedValue(undefined);
    appStoreMock.readFile.mockResolvedValue(
      JSON.stringify({
        lastOpenedFolder: '/projects/orphan',
        recentProjects: [],
      }),
    );

    await removeRecentProject('/projects/orphan');

    const written = JSON.parse(appStoreMock.writeFile.mock.calls.at(-1)?.[1] ?? '{}');
    expect(written.lastOpenedFolder).toBeNull();
    expect(written.recentProjects).toEqual([]);
  });
});
