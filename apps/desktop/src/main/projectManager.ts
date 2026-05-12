import fs from 'node:fs/promises';
import path from 'node:path';

const LITELIZARD_DIR = '.litelizard';
const CONFIG_FILE = 'config.json';
const ANALYSIS_DIR = 'analysis';

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
