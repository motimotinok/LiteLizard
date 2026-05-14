import fs from 'node:fs/promises';
import path from 'node:path';

const LITELIZARD_DIR = '.litelizard';
const CONFIG_FILE = 'config.json';
const ANALYSIS_DIR = 'analysis';
const UNSAFE_PROJECT_ROOT_MESSAGE =
  'LiteLizard の作業フォルダとして安全ではありません。macOS のシステム領域やアプリ実行に必要な領域は選べません。ホームフォルダや Documents 配下に新しい作業フォルダを作って選んでください。';
const UNSAFE_SYSTEM_ROOTS = ['/System', '/Library', '/Applications', '/usr', '/bin', '/sbin', '/etc', '/dev'];
const UNSAFE_INTERNAL_FOLDER_NAMES = new Set(['.git', '.litelizard', 'node_modules']);

interface ProjectConfig {
  version: number;
}

interface DetectResult {
  exists: boolean;
  config?: ProjectConfig;
}

function getLitelizardDir(folderPath: string): string {
  return path.join(folderPath, LITELIZARD_DIR);
}

function getConfigPath(folderPath: string): string {
  return path.join(getLitelizardDir(folderPath), CONFIG_FILE);
}

function isPathAtOrInside(candidatePath: string, parentPath: string): boolean {
  const normalizedCandidate = path.resolve(candidatePath).toLowerCase();
  const normalizedParent = path.resolve(parentPath).toLowerCase();
  const relative = path.relative(normalizedParent, normalizedCandidate);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

async function isLiteLizardSourceCheckout(folderPath: string): Promise<boolean> {
  const requiredEntries = [
    'pnpm-workspace.yaml',
    path.join('apps', 'desktop'),
    path.join('packages', 'shared'),
  ];

  try {
    await Promise.all(requiredEntries.map((entry) => fs.stat(path.join(folderPath, entry))));
    return true;
  } catch {
    return false;
  }
}

export async function assertProjectLocationSafe(folderPath: string): Promise<void> {
  const resolvedPath = path.resolve(folderPath);
  if (resolvedPath === path.parse(resolvedPath).root) {
    throw new Error(`PROJECT_LOCATION_UNSAFE: ${resolvedPath} は ${UNSAFE_PROJECT_ROOT_MESSAGE}`);
  }

  if (UNSAFE_INTERNAL_FOLDER_NAMES.has(path.basename(resolvedPath))) {
    throw new Error(`PROJECT_LOCATION_UNSAFE: ${resolvedPath} は ${UNSAFE_PROJECT_ROOT_MESSAGE}`);
  }

  if (UNSAFE_SYSTEM_ROOTS.some((root) => isPathAtOrInside(resolvedPath, root))) {
    throw new Error(`PROJECT_LOCATION_UNSAFE: ${resolvedPath} は ${UNSAFE_PROJECT_ROOT_MESSAGE}`);
  }

  if (await isLiteLizardSourceCheckout(resolvedPath)) {
    throw new Error(`PROJECT_LOCATION_UNSAFE: ${resolvedPath} は LiteLizard の開発用フォルダに見えます。${UNSAFE_PROJECT_ROOT_MESSAGE}`);
  }
}

export async function initializeProject(folderPath: string): Promise<void> {
  const litelizardDir = getLitelizardDir(folderPath);
  const configPath = getConfigPath(folderPath);
  const analysisDir = path.join(litelizardDir, ANALYSIS_DIR);

  await fs.mkdir(analysisDir, { recursive: true });

  try {
    await fs.writeFile(configPath, JSON.stringify({ version: 1 } satisfies ProjectConfig, null, 2), { encoding: 'utf8', flag: 'wx' });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
      throw error;
    }
  }
}

export async function detectProject(folderPath: string): Promise<DetectResult> {
  const configPath = getConfigPath(folderPath);

  try {
    const raw = await fs.readFile(configPath, 'utf8');
    const config = JSON.parse(raw) as ProjectConfig;
    return { exists: true, config };
  } catch {
    return { exists: false };
  }
}

export async function ensureProject(folderPath: string): Promise<void> {
  await assertProjectLocationSafe(folderPath);
  const result = await detectProject(folderPath);
  if (!result.exists) {
    await initializeProject(folderPath);
    return;
  }
  await assertProjectWritable(folderPath);
}

/**
 * `.litelizard/` 配下にプローブファイルを作成・削除し、書き込み権限があるか確認する。
 * 復元経路は新規初期化を行わないため、ここで明示的に書き込み可否を検出する。
 */
export async function assertProjectWritable(folderPath: string): Promise<void> {
  const litelizardDir = getLitelizardDir(folderPath);
  const probePath = path.join(
    litelizardDir,
    `.write-probe-${process.pid}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
  );

  try {
    await fs.writeFile(probePath, '', { encoding: 'utf8', flag: 'wx' });
  } catch (error) {
    const message = (error as NodeJS.ErrnoException).message ?? 'unknown';
    throw new Error(`PROJECT_NOT_WRITABLE: ${folderPath} (${message})`);
  }

  try {
    await fs.rm(probePath, { force: true });
  } catch {
    // プローブ削除に失敗しても次回以降の writeFile で上書きできるため、検出失敗にはしない
  }
}
