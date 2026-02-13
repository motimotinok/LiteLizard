import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { Session } from '@litelizard/shared';

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

function encryptSession(session: Session): EncryptedPayload {
  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12);
  const key = deriveKey(salt);

  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const plaintext = JSON.stringify(session);
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

function decryptSession(payload: EncryptedPayload): Session {
  const salt = Buffer.from(payload.salt, 'base64');
  const iv = Buffer.from(payload.iv, 'base64');
  const tag = Buffer.from(payload.tag, 'base64');
  const ciphertext = Buffer.from(payload.ciphertext, 'base64');
  const key = deriveKey(salt);

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
  return JSON.parse(plaintext) as Session;
}

export function createSessionVault(userDataPath: string) {
  const sessionPath = path.join(userDataPath, 'session.enc.json');

  return {
    async load(): Promise<Session | null> {
      try {
        const raw = await fs.readFile(sessionPath, 'utf8');
        const parsed = JSON.parse(raw) as EncryptedPayload;
        return decryptSession(parsed);
      } catch {
        return null;
      }
    },

    async save(session: Session) {
      const encrypted = encryptSession(session);
      await fs.mkdir(path.dirname(sessionPath), { recursive: true });
      await fs.writeFile(sessionPath, JSON.stringify(encrypted, null, 2), 'utf8');
    },

    async clear() {
      try {
        await fs.unlink(sessionPath);
      } catch {
        // ignore missing session
      }
    },
  };
}
