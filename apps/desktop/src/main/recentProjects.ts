import type { RecentProjectEntry } from '@litelizard/shared';

export const RECENT_PROJECTS_MAX = 10;

export function appendRecentProject(
  list: readonly RecentProjectEntry[],
  path: string,
  now: string,
  max: number = RECENT_PROJECTS_MAX,
): RecentProjectEntry[] {
  const filtered = list.filter((entry) => entry.path !== path);
  const next: RecentProjectEntry[] = [{ path, lastOpenedAt: now }, ...filtered];
  if (next.length > max) {
    next.length = max;
  }
  return next;
}

export function removeRecentProjectFromList(
  list: readonly RecentProjectEntry[],
  path: string,
): RecentProjectEntry[] {
  return list.filter((entry) => entry.path !== path);
}
