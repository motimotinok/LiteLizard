import fs from 'node:fs/promises';
import path from 'node:path';
import { app } from 'electron';
import type { RecentProjectEntry } from '@litelizard/shared';
import { appendRecentProject, removeRecentProjectFromList } from './recentProjects.js';

interface AppStoreSchema {
  lastOpenedFolder: string | null;
  activeReadingAgentId: string | null;
  recentProjects: RecentProjectEntry[];
}

const STORE_FILE = 'app-store.json';

const defaults: AppStoreSchema = {
  lastOpenedFolder: null,
  activeReadingAgentId: null,
  recentProjects: [],
};

function normalizeRecentProjects(value: unknown): RecentProjectEntry[] {
  if (!Array.isArray(value)) return [];
  const result: RecentProjectEntry[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== 'object') continue;
    const candidate = entry as Partial<RecentProjectEntry>;
    if (typeof candidate.path !== 'string' || !candidate.path) continue;
    if (typeof candidate.lastOpenedAt !== 'string') continue;
    result.push({ path: candidate.path, lastOpenedAt: candidate.lastOpenedAt });
  }
  return result;
}

function getStorePath(): string {
  return path.join(app.getPath('userData'), STORE_FILE);
}

async function readStore(): Promise<AppStoreSchema> {
  try {
    const raw = await fs.readFile(getStorePath(), 'utf8');
    const parsed = JSON.parse(raw) as Partial<AppStoreSchema>;
    return {
      ...defaults,
      ...parsed,
      recentProjects: normalizeRecentProjects(parsed.recentProjects),
    };
  } catch {
    return { ...defaults, recentProjects: [] };
  }
}

async function writeStore(data: AppStoreSchema): Promise<void> {
  const storePath = getStorePath();
  await fs.mkdir(path.dirname(storePath), { recursive: true });
  await fs.writeFile(storePath, JSON.stringify(data, null, 2), 'utf8');
}

export async function getLastOpenedFolder(): Promise<string | null> {
  const store = await readStore();
  return store.lastOpenedFolder;
}

export async function setLastOpenedFolder(folderPath: string): Promise<void> {
  const store = await readStore();
  const recentProjects = appendRecentProject(
    store.recentProjects,
    folderPath,
    new Date().toISOString(),
  );
  await writeStore({ ...store, lastOpenedFolder: folderPath, recentProjects });
}

export async function getRecentProjects(): Promise<RecentProjectEntry[]> {
  const store = await readStore();
  const entries = await Promise.all(
    store.recentProjects.map(async (entry) => ({
      ...entry,
      exists: await pathExists(entry.path),
    })),
  );
  return entries;
}

export async function removeRecentProject(folderPath: string): Promise<void> {
  const store = await readStore();
  const recentProjects = removeRecentProjectFromList(store.recentProjects, folderPath);
  if (recentProjects.length === store.recentProjects.length) {
    return;
  }
  await writeStore({ ...store, recentProjects });
}

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    const stat = await fs.stat(targetPath);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

export async function getActiveReadingAgentId(): Promise<string | null> {
  const store = await readStore();
  return store.activeReadingAgentId;
}

export async function setActiveReadingAgentId(id: string): Promise<void> {
  const store = await readStore();
  await writeStore({ ...store, activeReadingAgentId: id });
}
