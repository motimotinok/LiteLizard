import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import {
  DEFAULT_READING_AGENT_TEMPERATURE,
  ReadingAgentInputSchema,
  ReadingAgentSchema,
  type ReadingAgent,
  type ReadingAgentInput,
} from '@litelizard/shared';

const AGENTS_FILE_NAME = 'agents.json';
const AGENTS_BACKUP_FILE_NAME = 'agents.json.bak';

type Clock = () => string;
type IdGenerator = () => string;

export interface ReadingAgentStoreOptions {
  now?: Clock;
  createId?: IdGenerator;
}

function buildSystemPrompt(name: string, role: string) {
  return `あなたは『${name}』として、エッセイの一段落を読んだ感想を書きます。

## 視点
${role}。読み手の身体感覚に近い、率直な反応を優先してください。

## 出力
- 100〜200字
- タグを4つ（情緒・印象を表すもの）
- 0〜100の確度

## 禁則
- 文章の良し悪しの断定
- 著者への助言
- 修正案の提示`;
}

export function createDefaultReadingAgents(now: string): ReadingAgent[] {
  const presets = [
    { id: 'reader-quiet', name: '静かな読者', role: '情緒や余韻を中心に短く' },
    { id: 'reader-critical', name: '批評的な読者', role: '構成・論理・破綻を指摘' },
    { id: 'reader-first', name: 'はじめての読者', role: '予備知識ゼロで率直に' },
    { id: 'reader-editor', name: '担当編集', role: '売り・引っかかりを評価' },
  ];

  return presets.map((preset) => ({
    ...preset,
    systemPrompt: buildSystemPrompt(preset.name, preset.role),
    model: null,
    temperature: DEFAULT_READING_AGENT_TEMPERATURE,
    createdAt: now,
    updatedAt: now,
    builtIn: true,
  }));
}

function isMissingFileError(error: unknown) {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT';
}

function cloneAgents(agents: ReadingAgent[]) {
  return agents.map((agent) => ({ ...agent }));
}

export function createReadingAgentStore(
  userDataPath: string,
  options: ReadingAgentStoreOptions = {},
) {
  const agentsPath = path.join(userDataPath, AGENTS_FILE_NAME);
  const backupPath = path.join(userDataPath, AGENTS_BACKUP_FILE_NAME);
  const now = options.now ?? (() => new Date().toISOString());
  const createId = options.createId ?? (() => crypto.randomUUID());
  let queue: Promise<void> = Promise.resolve();

  async function writeAgents(agents: ReadingAgent[]) {
    await fs.mkdir(userDataPath, { recursive: true });
    const tempPath = `${agentsPath}.${process.pid}.${crypto.randomUUID()}.tmp`;
    await fs.writeFile(tempPath, JSON.stringify(agents, null, 2), 'utf8');
    await fs.rename(tempPath, agentsPath);
  }

  async function loadOrInitialize(): Promise<ReadingAgent[]> {
    try {
      const raw = await fs.readFile(agentsPath, 'utf8');
      return ReadingAgentSchema.array().parse(JSON.parse(raw));
    } catch (error) {
      if (isMissingFileError(error)) {
        const defaults = createDefaultReadingAgents(now());
        await writeAgents(defaults);
        return defaults;
      }

      await fs.mkdir(userDataPath, { recursive: true });
      try {
        await fs.rename(agentsPath, backupPath);
      } catch (renameError) {
        if (!isMissingFileError(renameError)) {
          throw renameError;
        }
      }

      const defaults = createDefaultReadingAgents(now());
      await writeAgents(defaults);
      return defaults;
    }
  }

  function runSerialized<T>(operation: () => Promise<T>): Promise<T> {
    const next = queue.then(operation, operation);
    queue = next.then(
      () => undefined,
      () => undefined,
    );
    return next;
  }

  return {
    async list(): Promise<ReadingAgent[]> {
      return runSerialized(async () => cloneAgents(await loadOrInitialize()));
    },

    async get(id: string): Promise<ReadingAgent | null> {
      return runSerialized(async () => {
        const normalizedId = id.trim();
        const agents = await loadOrInitialize();
        const agent = agents.find((entry) => entry.id === normalizedId);
        return agent ? { ...agent } : null;
      });
    },

    async save(input: ReadingAgentInput & { id?: string }): Promise<ReadingAgent> {
      return runSerialized(async () => {
        const parsed = ReadingAgentInputSchema.parse(input);
        const inputId = input.id?.trim();
        if (inputId !== undefined && inputId.length === 0) {
          throw new Error('Reading agent id must not be empty.');
        }
        if (inputId && inputId.length > 120) {
          throw new Error('Reading agent id must be 120 characters or less.');
        }

        const agents = await loadOrInitialize();
        const timestamp = now();
        const id = inputId || createId();
        const existingIndex = agents.findIndex((agent) => agent.id === id);
        const existing = existingIndex >= 0 ? agents[existingIndex] : undefined;
        const nextAgent: ReadingAgent = {
          id,
          name: parsed.name,
          role: parsed.role,
          systemPrompt: parsed.systemPrompt,
          model: parsed.model,
          temperature: parsed.temperature,
          createdAt: existing?.createdAt ?? timestamp,
          updatedAt: timestamp,
          builtIn: existing?.builtIn ?? false,
        };

        if (existingIndex >= 0) {
          agents[existingIndex] = nextAgent;
        } else {
          agents.push(nextAgent);
        }

        await writeAgents(agents);
        return { ...nextAgent };
      });
    },

    async delete(id: string): Promise<void> {
      return runSerialized(async () => {
        const normalizedId = id.trim();
        const agents = await loadOrInitialize();
        await writeAgents(agents.filter((agent) => agent.id !== normalizedId));
      });
    },

    async resetToDefaults(): Promise<ReadingAgent[]> {
      return runSerialized(async () => {
        const defaults = createDefaultReadingAgents(now());
        await writeAgents(defaults);
        return cloneAgents(defaults);
      });
    },
  };
}
