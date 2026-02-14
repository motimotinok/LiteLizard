import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

interface EncryptedPayload {
  version: 1;
  salt: string;
  iv: string;
  tag: string;
  ciphertext: string;
}

const PEPPER = 'litelizard-v1-pepper';

function deriveKey(salt: Buffer) {
  const userMaterial = `${os.userInfo().username}:${os.homedir()}:${PEPPER}`;
  return crypto.pbkdf2Sync(userMaterial, salt, 210_000, 32, 'sha256');
}

function encryptValue(value: string): EncryptedPayload {
  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12);
  const key = deriveKey(salt);

  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const plaintext = JSON.stringify({ value });
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    version: 1,
    salt: salt.toString('base64'),
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
    ciphertext: ciphertext.toString('base64'),
  };
}

function decryptValue(payload: EncryptedPayload): string {
  const salt = Buffer.from(payload.salt, 'base64');
  const iv = Buffer.from(payload.iv, 'base64');
  const tag = Buffer.from(payload.tag, 'base64');
  const ciphertext = Buffer.from(payload.ciphertext, 'base64');
  const key = deriveKey(salt);

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
  const parsed = JSON.parse(plaintext) as { value?: unknown };
  if (typeof parsed.value !== 'string') {
    throw new Error('Invalid vault payload');
  }
  return parsed.value;
}

export function createApiKeyVault(userDataPath: string) {
  const apiKeyPath = path.join(userDataPath, 'api-key.enc.json');

  return {
    async load(): Promise<string | null> {
      try {
        const raw = await fs.readFile(apiKeyPath, 'utf8');
        const parsed = JSON.parse(raw) as EncryptedPayload;
        return decryptValue(parsed);
      } catch {
        return null;
      }
    },

    async save(apiKey: string) {
      const encrypted = encryptValue(apiKey);
      await fs.mkdir(path.dirname(apiKeyPath), { recursive: true });
      await fs.writeFile(apiKeyPath, JSON.stringify(encrypted, null, 2), 'utf8');
    },

    async clear() {
      try {
        await fs.unlink(apiKeyPath);
      } catch {
        // ignore missing key
      }
    },
  };
}
