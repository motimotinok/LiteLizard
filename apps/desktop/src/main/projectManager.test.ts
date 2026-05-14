import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  initializeProject,
  detectProject,
  ensureProject,
  assertProjectLocationSafe,
  assertProjectWritable,
} from './projectManager.js';

async function withTempDir(run: (dir: string) => Promise<void>) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'litelizard-project-manager-'));
  try {
    await run(dir);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

describe('initializeProject', () => {
  it('.litelizard/ と config.json と analysis/ が生成される', async () => {
    await withTempDir(async (dir) => {
      await initializeProject(dir);

      const litelizardDir = path.join(dir, '.litelizard');
      const configPath = path.join(litelizardDir, 'config.json');
      const analysisDir = path.join(litelizardDir, 'analysis');

      const [litelizardStat, configStat, analysisStat] = await Promise.all([
        fs.stat(litelizardDir),
        fs.stat(configPath),
        fs.stat(analysisDir),
      ]);

      expect(litelizardStat.isDirectory()).toBe(true);
      expect(configStat.isFile()).toBe(true);
      expect(analysisStat.isDirectory()).toBe(true);

      const raw = await fs.readFile(configPath, 'utf8');
      const config = JSON.parse(raw) as { version: number };
      expect(config.version).toBe(1);
    });
  });

  it('2回呼んでもエラーにならず既存の config.json が上書きされない', async () => {
    await withTempDir(async (dir) => {
      await initializeProject(dir);

      const configPath = path.join(dir, '.litelizard', 'config.json');
      await fs.writeFile(configPath, JSON.stringify({ version: 1, extra: 'custom' }, null, 2), 'utf8');

      await initializeProject(dir);

      const raw = await fs.readFile(configPath, 'utf8');
      const config = JSON.parse(raw) as { version: number; extra?: string };
      expect(config.extra).toBe('custom');
    });
  });
});

describe('detectProject', () => {
  it('.litelizard/config.json があれば exists: true と config を返す', async () => {
    await withTempDir(async (dir) => {
      await initializeProject(dir);

      const result = await detectProject(dir);

      expect(result.exists).toBe(true);
      expect(result.config).toEqual({ version: 1 });
    });
  });

  it('.litelizard/ がなければ exists: false を返す', async () => {
    await withTempDir(async (dir) => {
      const result = await detectProject(dir);

      expect(result.exists).toBe(false);
      expect(result.config).toBeUndefined();
    });
  });
});

describe('ensureProject', () => {
  it('新規フォルダでは初期化を実行する', async () => {
    await withTempDir(async (dir) => {
      await ensureProject(dir);

      const configPath = path.join(dir, '.litelizard', 'config.json');
      const stat = await fs.stat(configPath);
      expect(stat.isFile()).toBe(true);
    });
  });

  it('macOS のシステム領域はプロジェクトとして初期化しない', async () => {
    await expect(ensureProject('/System')).rejects.toThrow(
      'LiteLizard の作業フォルダとして安全ではありません',
    );
  });

  it('既存プロジェクトでは何もしない（config.json を上書きしない）', async () => {
    await withTempDir(async (dir) => {
      await initializeProject(dir);

      const configPath = path.join(dir, '.litelizard', 'config.json');
      await fs.writeFile(configPath, JSON.stringify({ version: 1, extra: 'preserved' }, null, 2), 'utf8');

      await ensureProject(dir);

      const raw = await fs.readFile(configPath, 'utf8');
      const config = JSON.parse(raw) as { version: number; extra?: string };
      expect(config.extra).toBe('preserved');
    });
  });

  it('既存プロジェクトでも .litelizard/ への書き込み可否を確認する', async () => {
    await withTempDir(async (dir) => {
      await initializeProject(dir);

      await ensureProject(dir);

      const probeEntries = (await fs.readdir(path.join(dir, '.litelizard'))).filter((entry) =>
        entry.startsWith('.write-probe-'),
      );
      expect(probeEntries).toEqual([]);
    });
  });
});

describe('assertProjectLocationSafe', () => {
  it('通常のユーザー作業フォルダは許可する', async () => {
    await withTempDir(async (dir) => {
      await expect(assertProjectLocationSafe(dir)).resolves.toBeUndefined();
    });
  });

  it.each(['/System', '/Library', '/usr', '/bin'])(
    'システム領域を分かる理由付きで拒否する (%s)',
    async (folderPath) => {
      await expect(assertProjectLocationSafe(folderPath)).rejects.toThrow(
        'macOS のシステム領域やアプリ実行に必要な領域は選べません',
      );
    },
  );
});

describe('assertProjectWritable', () => {
  const platformsWithChmod = process.platform === 'win32' ? [] : ['posix' as const];

  it('書き込み可能な .litelizard/ ではエラーにならず、プローブも残らない', async () => {
    await withTempDir(async (dir) => {
      await initializeProject(dir);

      await expect(assertProjectWritable(dir)).resolves.toBeUndefined();

      const probeEntries = (await fs.readdir(path.join(dir, '.litelizard'))).filter((entry) =>
        entry.startsWith('.write-probe-'),
      );
      expect(probeEntries).toEqual([]);
    });
  });

  it('.litelizard/ が存在しないフォルダでもエラーを投げる', async () => {
    await withTempDir(async (dir) => {
      await expect(assertProjectWritable(dir)).rejects.toThrow(/PROJECT_NOT_WRITABLE/);
    });
  });

  it.each(platformsWithChmod)('読み取り専用 .litelizard/ では PROJECT_NOT_WRITABLE を投げる (%s)', async () => {
    await withTempDir(async (dir) => {
      await initializeProject(dir);
      const litelizardDir = path.join(dir, '.litelizard');
      await fs.chmod(litelizardDir, 0o500);

      try {
        await expect(assertProjectWritable(dir)).rejects.toThrow(/PROJECT_NOT_WRITABLE/);
      } finally {
        await fs.chmod(litelizardDir, 0o700);
      }
    });
  });
});
