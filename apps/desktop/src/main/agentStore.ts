import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import {
  ReadingAgentInputSchema,
  ReadingAgentSchema,
  createDefaultReadingAgentsFromPresets,
  listDefaultReadingAgentTemplates,
  type ReadingAgent,
  type ReadingAgentInput,
  type ReadingAgentTemplate,
} from '@litelizard/shared';

const AGENTS_FILE_NAME = 'agents.json';
const AGENTS_BACKUP_FILE_NAME = 'agents.json.bak';

type Clock = () => string;
type IdGenerator = () => string;

export interface ReadingAgentStoreOptions {
  now?: Clock;
  createId?: IdGenerator;
}

export function createDefaultReadingAgents(now: string): ReadingAgent[] {
  return createDefaultReadingAgentsFromPresets(now);
}

export function listReadingAgentTemplates(): ReadingAgentTemplate[] {
  return listDefaultReadingAgentTemplates();
}

function isMissingFileError(error: unknown) {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT';
}

function cloneAgents(agents: ReadingAgent[]) {
  return structuredClone(agents);
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
        return [];
      }

      await fs.mkdir(userDataPath, { recursive: true });
      try {
        await fs.rename(agentsPath, backupPath);
      } catch (renameError) {
        if (!isMissingFileError(renameError)) {
          throw renameError;
        }
      }

      await writeAgents([]);
      return [];
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
    listTemplates(): ReadingAgentTemplate[] {
      return listReadingAgentTemplates();
    },

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
          contextPolicy: parsed.contextPolicy,
          tagDefinitions: parsed.tagDefinitions,
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

    async addFromTemplate(templateId: string): Promise<ReadingAgent> {
      return runSerialized(async () => {
        const template = listReadingAgentTemplates().find((entry) => entry.id === templateId.trim());
        if (!template) {
          throw new Error(`Reading agent template not found: ${templateId}`);
        }

        const agents = await loadOrInitialize();
        const timestamp = now();
        const baseId = template.id;
        let id = baseId;
        let suffix = 2;
        const existingIds = new Set(agents.map((agent) => agent.id));
        while (existingIds.has(id)) {
          id = `${baseId}-${suffix}`;
          suffix += 1;
        }

        const agent: ReadingAgent = {
          ...template,
          tagDefinitions: template.tagDefinitions ?? [],
          id,
          createdAt: timestamp,
          updatedAt: timestamp,
          builtIn: false,
        };
        agents.push(agent);
        await writeAgents(agents);
        return { ...agent };
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
        await writeAgents([]);
        return [];
      });
    },
  };
}
