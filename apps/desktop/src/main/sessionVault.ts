import fs from 'node:fs/promises';
import path from 'node:path';
import { safeStorage } from 'electron';
import type { AnalysisProviderId } from '@litelizard/shared';

const ENCRYPTED_FILE_NAME = 'api-keys.bin';
const PLAINTEXT_FILE_NAME = 'api-keys.plaintext';

type SecretMap = Partial<Record<AnalysisProviderId | string, string>>;

function isMissingFileError(error: unknown) {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT';
}

async function readBufferIfExists(filePath: string): Promise<Buffer | null> {
  try {
    return await fs.readFile(filePath);
  } catch (error) {
    if (isMissingFileError(error)) {
      return null;
    }
    throw error;
  }
}

async function readTextIfExists(filePath: string): Promise<string | null> {
  try {
    return await fs.readFile(filePath, 'utf8');
  } catch (error) {
    if (isMissingFileError(error)) {
      return null;
    }
    throw error;
  }
}

async function removeIfExists(filePath: string) {
  try {
    await fs.unlink(filePath);
  } catch (error) {
    if (!isMissingFileError(error)) {
      throw error;
    }
  }
}

export function createApiKeyVault(userDataPath: string) {
  const encryptedPath = path.join(userDataPath, ENCRYPTED_FILE_NAME);
  const plaintextPath = path.join(userDataPath, PLAINTEXT_FILE_NAME);

  async function loadSecrets(): Promise<SecretMap> {
    const encrypted = await readBufferIfExists(encryptedPath);
    if (encrypted) {
      try {
        const raw = safeStorage.decryptString(encrypted);
        try {
          const parsed = JSON.parse(raw) as unknown;
          if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            return {};
          }
          return Object.fromEntries(
            Object.entries(parsed).filter((entry): entry is [string, string] => typeof entry[1] === 'string')
          );
        } catch {
          if (raw.trim()) {
            return { openai: raw };
          }
          return {};
        }
      } catch {
        return {};
      }
    }

    const plaintext = await readTextIfExists(plaintextPath);
    if (!plaintext) {
      return {};
    }

    try {
      const parsed = JSON.parse(plaintext) as unknown;
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return { openai: plaintext };
      }
      return Object.fromEntries(
        Object.entries(parsed).filter((entry): entry is [string, string] => typeof entry[1] === 'string')
      );
    } catch {
      return { openai: plaintext };
    }
  }

  async function saveSecrets(secrets: SecretMap) {
    await fs.mkdir(userDataPath, { recursive: true });
    const normalized = Object.fromEntries(
      Object.entries(secrets).filter(
        (entry): entry is [string, string] => typeof entry[1] === 'string' && Boolean(entry[1].trim())
      )
    );
    const serialized = JSON.stringify(normalized);

    if (safeStorage.isEncryptionAvailable()) {
      const encrypted = safeStorage.encryptString(serialized);
      await fs.writeFile(encryptedPath, encrypted);
      await removeIfExists(plaintextPath);
      return;
    }

    await fs.writeFile(plaintextPath, serialized, 'utf8');
    await removeIfExists(encryptedPath);
  }

  return {
    async load(providerId = 'openai'): Promise<string | null> {
      const secrets = await loadSecrets();
      return secrets[providerId]?.trim() ? secrets[providerId] ?? null : null;
    },

    async loadAll(): Promise<SecretMap> {
      return loadSecrets();
    },

    async save(providerId: string, apiKey: string) {
      const secrets = await loadSecrets();
      secrets[providerId] = apiKey;
      await saveSecrets(secrets);
    },

    async clear(providerId?: string) {
      if (!providerId) {
        await Promise.all([removeIfExists(encryptedPath), removeIfExists(plaintextPath)]);
        return;
      }

      const secrets = await loadSecrets();
      delete secrets[providerId];

      if (Object.keys(secrets).length === 0) {
        await Promise.all([removeIfExists(encryptedPath), removeIfExists(plaintextPath)]);
        return;
      }

      await saveSecrets(secrets);
    },
  };
}
