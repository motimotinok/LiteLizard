import fs from 'node:fs/promises';
import path from 'node:path';
import { safeStorage } from 'electron';

const ENCRYPTED_FILE_NAME = 'api-keys.bin';
const PLAINTEXT_FILE_NAME = 'api-keys.plaintext';

function isMissingFileError(error: unknown) {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT';
}

async function readIfExists(filePath: string, encoding?: BufferEncoding) {
  try {
    return await fs.readFile(filePath, encoding);
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

  return {
    async load(): Promise<string | null> {
      const encrypted = await readIfExists(encryptedPath);
      if (encrypted) {
        try {
          return safeStorage.decryptString(encrypted);
        } catch {
          return null;
        }
      }

      return readIfExists(plaintextPath, 'utf8');
    },

    async save(apiKey: string) {
      await fs.mkdir(userDataPath, { recursive: true });

      if (safeStorage.isEncryptionAvailable()) {
        const encrypted = safeStorage.encryptString(apiKey);
        await fs.writeFile(encryptedPath, encrypted);
        await removeIfExists(plaintextPath);
        return;
      }

      await fs.writeFile(plaintextPath, apiKey, 'utf8');
      await removeIfExists(encryptedPath);
    },

    async clear() {
      await Promise.all([
        removeIfExists(encryptedPath),
        removeIfExists(plaintextPath),
      ]);
    },
  };
}
