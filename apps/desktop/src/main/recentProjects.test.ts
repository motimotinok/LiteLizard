import { describe, expect, it } from 'vitest';
import {
  RECENT_PROJECTS_MAX,
  appendRecentProject,
  removeRecentProjectFromList,
} from './recentProjects.js';
import type { RecentProjectEntry } from '@litelizard/shared';

const T1 = '2026-05-06T10:00:00.000Z';
const T2 = '2026-05-06T10:05:00.000Z';
const T3 = '2026-05-06T10:10:00.000Z';

describe('appendRecentProject', () => {
  it('空リストに追加できる', () => {
    const result = appendRecentProject([], '/projects/a', T1);

    expect(result).toEqual([{ path: '/projects/a', lastOpenedAt: T1 }]);
  });

  it('新しいパスを先頭に追加し、最終アクセス順を保つ', () => {
    const initial: RecentProjectEntry[] = [{ path: '/projects/a', lastOpenedAt: T1 }];
    const result = appendRecentProject(initial, '/projects/b', T2);

    expect(result).toEqual([
      { path: '/projects/b', lastOpenedAt: T2 },
      { path: '/projects/a', lastOpenedAt: T1 },
    ]);
  });

  it('同じパスを再度開いた場合は重複せず先頭に移動して timestamp を更新する', () => {
    const initial: RecentProjectEntry[] = [
      { path: '/projects/b', lastOpenedAt: T2 },
      { path: '/projects/a', lastOpenedAt: T1 },
    ];
    const result = appendRecentProject(initial, '/projects/a', T3);

    expect(result).toEqual([
      { path: '/projects/a', lastOpenedAt: T3 },
      { path: '/projects/b', lastOpenedAt: T2 },
    ]);
  });

  it('件数上限を超えた場合は古いエントリから捨てる', () => {
    const initial: RecentProjectEntry[] = Array.from({ length: RECENT_PROJECTS_MAX }, (_, index) => ({
      path: `/projects/p${index}`,
      lastOpenedAt: T1,
    }));
    const result = appendRecentProject(initial, '/projects/new', T2);

    expect(result).toHaveLength(RECENT_PROJECTS_MAX);
    expect(result[0]).toEqual({ path: '/projects/new', lastOpenedAt: T2 });
    expect(result.find((entry) => entry.path === `/projects/p${RECENT_PROJECTS_MAX - 1}`)).toBeUndefined();
  });

  it('カスタム上限を尊重し、古いエントリ（リスト末尾）から捨てる', () => {
    const initial: RecentProjectEntry[] = [
      { path: '/projects/b', lastOpenedAt: T2 },
      { path: '/projects/a', lastOpenedAt: T1 },
    ];
    const result = appendRecentProject(initial, '/projects/c', T3, 2);

    expect(result).toEqual([
      { path: '/projects/c', lastOpenedAt: T3 },
      { path: '/projects/b', lastOpenedAt: T2 },
    ]);
  });

  it('既存の入力リストを破壊的に変更しない', () => {
    const initial: RecentProjectEntry[] = [{ path: '/projects/a', lastOpenedAt: T1 }];
    appendRecentProject(initial, '/projects/b', T2);

    expect(initial).toEqual([{ path: '/projects/a', lastOpenedAt: T1 }]);
  });
});

describe('removeRecentProjectFromList', () => {
  it('指定パスを除外する', () => {
    const initial: RecentProjectEntry[] = [
      { path: '/projects/a', lastOpenedAt: T1 },
      { path: '/projects/b', lastOpenedAt: T2 },
    ];
    const result = removeRecentProjectFromList(initial, '/projects/a');

    expect(result).toEqual([{ path: '/projects/b', lastOpenedAt: T2 }]);
  });

  it('存在しないパスでも例外を出さず元と同等のリストを返す', () => {
    const initial: RecentProjectEntry[] = [{ path: '/projects/a', lastOpenedAt: T1 }];
    const result = removeRecentProjectFromList(initial, '/projects/missing');

    expect(result).toEqual(initial);
    expect(result).not.toBe(initial);
  });
});
