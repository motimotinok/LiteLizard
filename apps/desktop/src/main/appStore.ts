import fs from 'node:fs/promises';
import path from 'node:path';
import { app } from 'electron';

interface AppStoreSchema {
  lastOpenedFolder: string | null;
}

const STORE_FILE = 'app-store.json';

const defaults: AppStoreSchema = {
  lastOpenedFolder: null,
};

function getStorePath(): string {
  return path.join(app.getPath('userData'), STORE_FILE);
}

async function readStore(): Promise<AppStoreSchema> {
  try {
    const raw = await fs.readFile(getStorePath(), 'utf8');
    return { ...defaults, ...(JSON.parse(raw) as Partial<AppStoreSchema>) };
  } catch {
    return { ...defaults };
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
  await writeStore({ lastOpenedFolder: folderPath });
}
