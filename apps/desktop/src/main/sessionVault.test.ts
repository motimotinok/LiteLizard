import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { createApiKeyVault } from './sessionVault.js';

describe('apiKeyVault', () => {
  it('encrypts and decrypts API key', async () => {
    const dir = path.join(os.tmpdir(), `litelizard-vault-${Date.now()}`);
    const vault = createApiKeyVault(dir);

    await vault.save('sk-test-123');

    const loaded = await vault.load();
    expect(loaded).toBe('sk-test-123');

    await vault.clear();
    await fs.rm(dir, { recursive: true, force: true });
  });
});
