import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { createDefaultReadingAgents, createReadingAgentStore } from './agentStore.js';

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
  it('初回 list で built-in agent 4件を seed する', async () => {
    await withTempUserData(async (userDataPath) => {
      const store = createReadingAgentStore(userDataPath, { now: () => '2026-05-02T00:00:00.000Z' });

      const agents = await store.list();

      expect(agents.map((agent) => agent.id)).toEqual([
        'reader-first-impression',
        'reader-sensory',
        'reader-structure-editor',
        'reader-writing-companion',
      ]);
      expect(agents.map((agent) => agent.name)).toEqual([
        '初見の読者',
        '感覚を読む読者',
        '構造編集者',
        '書き続ける伴走者',
      ]);
      expect(agents.every((agent) => agent.builtIn)).toBe(true);
      expect(await readAgentsFile(userDataPath)).toHaveLength(4);
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
          createdAt: '2026-05-01T00:00:00.000Z',
          updatedAt: '2026-05-01T00:00:00.000Z',
          builtIn: false,
        },
      ];
      await fs.writeFile(path.join(userDataPath, 'agents.json'), JSON.stringify(existing, null, 2), 'utf8');
      const store = createReadingAgentStore(userDataPath, { now: () => '2026-05-02T00:00:00.000Z' });

      await expect(store.list()).resolves.toEqual([
        {
          ...existing[0],
          model: null,
          temperature: 0.7,
        },
      ]);
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
      });
      const updated = await store.save({
        id: 'reader-custom',
        name: '更新読者',
        role: '温度を見る',
        systemPrompt: '温度を中心に読んでください。',
        model: null,
        temperature: 0.8,
      });

      expect(created).toMatchObject({
        id: 'reader-custom',
        name: '自作読者',
        role: '余白を見る',
        systemPrompt: '余白を中心に読んでください。',
        model: 'gpt-4.1-mini',
        temperature: 0.3,
        createdAt: '2026-05-02T00:00:02.000Z',
        builtIn: false,
      });
      expect(updated).toMatchObject({
        id: 'reader-custom',
        name: '更新読者',
        model: null,
        temperature: 0.8,
        createdAt: '2026-05-02T00:00:02.000Z',
        updatedAt: '2026-05-02T00:00:03.000Z',
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
      });
      await store.delete('reader-delete-me');

      await expect(store.get('reader-delete-me')).resolves.toBeNull();
    });
  });

  it('resetToDefaults は built-in 4件に戻す', async () => {
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
      });
      const reset = await store.resetToDefaults();

      expect(reset).toEqual(createDefaultReadingAgents(now));
      await expect(store.get('reader-custom')).resolves.toBeNull();
    });
  });

  it('不正 JSON は backup に退避して defaults を再生成する', async () => {
    await withTempUserData(async (userDataPath) => {
      await fs.writeFile(path.join(userDataPath, 'agents.json'), '{broken', 'utf8');
      const store = createReadingAgentStore(userDataPath, { now: () => '2026-05-02T00:00:00.000Z' });

      const agents = await store.list();
      const backup = await fs.readFile(path.join(userDataPath, 'agents.json.bak'), 'utf8');

      expect(agents).toHaveLength(4);
      expect(backup).toBe('{broken');
    });
  });
});
