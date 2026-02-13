import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { createSessionVault } from './sessionVault.js';

describe('sessionVault', () => {
  it('encrypts and decrypts session payload', async () => {
    const dir = path.join(os.tmpdir(), `litelizard-vault-${Date.now()}`);
    const vault = createSessionVault(dir);

    await vault.save({
      accessToken: 'token',
      userId: 'usr_001',
      email: 'user@example.com',
      expiresAt: new Date(Date.now() + 3600_000).toISOString(),
    });

    const loaded = await vault.load();
    expect(loaded?.accessToken).toBe('token');
    expect(loaded?.userId).toBe('usr_001');

    await vault.clear();
    await fs.rm(dir, { recursive: true, force: true });
  });
});
