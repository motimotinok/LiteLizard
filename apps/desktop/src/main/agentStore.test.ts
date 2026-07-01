import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { createReadingAgentStore, listReadingAgentTemplates } from './agentStore.js';

async function withTempUserData(run: (userDataPath: string) => Promise<void>) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'litelizard-agents-'));
  try {
    await run(dir);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

function createClock() {
  let index = 0;
  return () => {
    index += 1;
    return `2026-05-02T00:00:0${index}.000Z`;
  };
}

async function readAgentsFile(userDataPath: string) {
  const raw = await fs.readFile(path.join(userDataPath, 'agents.json'), 'utf8');
  return JSON.parse(raw) as unknown[];
}

describe('createReadingAgentStore', () => {
  it('初回 list では built-in agent を自動 seed しない', async () => {
    await withTempUserData(async (userDataPath) => {
      const store = createReadingAgentStore(userDataPath, { now: () => '2026-05-02T00:00:00.000Z' });

      const agents = await store.list();

      expect(agents).toEqual([]);
      await expect(fs.readFile(path.join(userDataPath, 'agents.json'), 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });
    });
  });

  it('テンプレート一覧から明示的に通常 Agent として追加できる', async () => {
    await withTempUserData(async (userDataPath) => {
      const store = createReadingAgentStore(userDataPath, { now: () => '2026-05-02T00:00:00.000Z' });
      const templates = store.listTemplates();

      expect(templates.map((template) => template.id)).toEqual(listReadingAgentTemplates().map((template) => template.id));

      const added = await store.addFromTemplate('reader-first-impression');

      expect(added).toMatchObject({
        id: 'reader-first-impression',
        name: '初見の読者',
        builtIn: false,
        createdAt: '2026-05-02T00:00:00.000Z',
      });
      expect(await readAgentsFile(userDataPath)).toHaveLength(1);
    });
  });

  it('既存 agents.json がある場合は seed で上書きしない', async () => {
    await withTempUserData(async (userDataPath) => {
      const existing = [
        {
          id: 'custom-reader',
          name: '自作読者',
          role: '率直に読む',
          systemPrompt: '率直に読んでください。',
          model: null,
          temperature: 0.7,
          contextPolicy: { mode: 'whole-document' },
          createdAt: '2026-05-01T00:00:00.000Z',
          updatedAt: '2026-05-01T00:00:00.000Z',
          builtIn: false,
        },
      ];
      await fs.writeFile(path.join(userDataPath, 'agents.json'), JSON.stringify(existing, null, 2), 'utf8');
      const store = createReadingAgentStore(userDataPath, { now: () => '2026-05-02T00:00:00.000Z' });

      await expect(store.list()).resolves.toEqual([
        existing[0],
      ]);
    });
  });

  it('旧形式 agents.json は backup に退避して空リストへ復旧する', async () => {
    await withTempUserData(async (userDataPath) => {
      const legacy = [
        {
          id: 'legacy-reader',
          name: '旧読者',
          role: '旧形式',
          systemPrompt: '旧形式のプロンプトです。',
          model: null,
          temperature: 0.7,
          createdAt: '2026-05-01T00:00:00.000Z',
          updatedAt: '2026-05-01T00:00:00.000Z',
          builtIn: false,
        },
      ];
      await fs.writeFile(path.join(userDataPath, 'agents.json'), JSON.stringify(legacy, null, 2), 'utf8');
      const store = createReadingAgentStore(userDataPath, { now: () => '2026-05-02T00:00:00.000Z' });

      const agents = await store.list();
      const backup = JSON.parse(await fs.readFile(path.join(userDataPath, 'agents.json.bak'), 'utf8')) as unknown[];

      expect(agents).toEqual([]);
      expect(backup).toEqual(legacy);
    });
  });

  it('save は新規作成と既存更新を行い、createdAt と builtIn を保持する', async () => {
    await withTempUserData(async (userDataPath) => {
      const store = createReadingAgentStore(userDataPath, {
        now: createClock(),
        createId: () => 'reader-custom',
      });

      const created = await store.save({
        name: '  自作読者  ',
        role: '  余白を見る  ',
        systemPrompt: '  余白を中心に読んでください。  ',
        model: '  gpt-4.1-mini  ',
        temperature: 0.3,
        contextPolicy: { mode: 'target-only' },
      });
      const updated = await store.save({
        id: 'reader-custom',
        name: '更新読者',
        role: '温度を見る',
        systemPrompt: '温度を中心に読んでください。',
        model: null,
        temperature: 0.8,
        contextPolicy: { mode: 'preceding', range: 'lastN', lastN: 4 },
      });

      expect(created).toMatchObject({
        id: 'reader-custom',
        name: '自作読者',
        role: '余白を見る',
        systemPrompt: '余白を中心に読んでください。',
        model: 'gpt-4.1-mini',
        temperature: 0.3,
        contextPolicy: { mode: 'target-only' },
        createdAt: '2026-05-02T00:00:01.000Z',
        builtIn: false,
      });
      expect(updated).toMatchObject({
        id: 'reader-custom',
        name: '更新読者',
        model: null,
        temperature: 0.8,
        contextPolicy: { mode: 'preceding', range: 'lastN', lastN: 4 },
        createdAt: '2026-05-02T00:00:01.000Z',
        updatedAt: '2026-05-02T00:00:02.000Z',
        builtIn: false,
      });
    });
  });

  it('delete 後は get が null を返す', async () => {
    await withTempUserData(async (userDataPath) => {
      const store = createReadingAgentStore(userDataPath, {
        now: () => '2026-05-02T00:00:00.000Z',
        createId: () => 'reader-delete-me',
      });

      await store.save({
        name: '削除対象',
        role: '消える',
        systemPrompt: '消える読者です。',
        model: null,
        temperature: 0.7,
        contextPolicy: { mode: 'whole-document' },
      });
      await store.delete('reader-delete-me');

      await expect(store.get('reader-delete-me')).resolves.toBeNull();
    });
  });

  it('resetToDefaults は agent を空に戻す', async () => {
    await withTempUserData(async (userDataPath) => {
      const now = '2026-05-02T00:00:00.000Z';
      const store = createReadingAgentStore(userDataPath, {
        now: () => now,
        createId: () => 'reader-custom',
      });

      await store.save({
        name: '自作読者',
        role: '自由に読む',
        systemPrompt: '自由に読んでください。',
        model: null,
        temperature: 0.7,
        contextPolicy: { mode: 'whole-document' },
      });
      const reset = await store.resetToDefaults();

      expect(reset).toEqual([]);
      await expect(store.get('reader-custom')).resolves.toBeNull();
    });
  });

  it('不正 JSON は backup に退避して空リストへ復旧する', async () => {
    await withTempUserData(async (userDataPath) => {
      await fs.writeFile(path.join(userDataPath, 'agents.json'), '{broken', 'utf8');
      const store = createReadingAgentStore(userDataPath, { now: () => '2026-05-02T00:00:00.000Z' });

      const agents = await store.list();
      const backup = await fs.readFile(path.join(userDataPath, 'agents.json.bak'), 'utf8');

      expect(agents).toEqual([]);
      expect(backup).toBe('{broken');
    });
  });
});
