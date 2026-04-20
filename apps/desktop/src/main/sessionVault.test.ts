import { beforeEach, describe, expect, it, vi } from 'vitest';

const mkdir = vi.fn();
const readFile = vi.fn();
const writeFile = vi.fn();
const unlink = vi.fn();

const isEncryptionAvailable = vi.fn();
const encryptString = vi.fn();
const decryptString = vi.fn();

vi.mock('node:fs/promises', () => ({
  default: {
    mkdir,
    readFile,
    writeFile,
    unlink,
  },
}));

vi.mock('electron', () => ({
  safeStorage: {
    isEncryptionAvailable,
    encryptString,
    decryptString,
  },
}));

import { createApiKeyVault } from './sessionVault.js';

describe('apiKeyVault', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('safeStorage が利用可能な場合は暗号化ファイルへ保存して復号できる', async () => {
    const encrypted = Buffer.from('encrypted-api-keys');
    isEncryptionAvailable.mockReturnValue(true);
    encryptString.mockReturnValue(encrypted);
    readFile.mockResolvedValue(encrypted);
    decryptString.mockReturnValue(JSON.stringify({ openai: 'sk-test-123' }));

    const vault = createApiKeyVault('/tmp/litelizard-user-data');

    await vault.save('openai', 'sk-test-123');
    await expect(vault.load('openai')).resolves.toBe('sk-test-123');

    expect(mkdir).toHaveBeenCalledWith('/tmp/litelizard-user-data', { recursive: true });
    expect(encryptString).toHaveBeenCalledWith(JSON.stringify({ openai: 'sk-test-123' }));
    expect(writeFile).toHaveBeenCalledWith('/tmp/litelizard-user-data/api-keys.bin', encrypted);
    expect(decryptString).toHaveBeenCalledWith(encrypted);
  });

  it('safeStorage が使えない場合は平文ファイルへフォールバックする', async () => {
    isEncryptionAvailable.mockReturnValue(false);
    readFile
      .mockRejectedValueOnce(Object.assign(new Error('missing'), { code: 'ENOENT' }))
      .mockResolvedValueOnce(JSON.stringify({ openai: 'sk-plain-123' }));

    const vault = createApiKeyVault('/tmp/litelizard-user-data');

    await vault.save('openai', 'sk-plain-123');
    await expect(vault.load('openai')).resolves.toBe('sk-plain-123');

    expect(writeFile).toHaveBeenCalledWith(
      '/tmp/litelizard-user-data/api-keys.plaintext',
      JSON.stringify({ openai: 'sk-plain-123' }),
      'utf8',
    );
    expect(encryptString).not.toHaveBeenCalled();
  });

  it('保存済みファイルが無い場合は null を返す', async () => {
    readFile.mockRejectedValue(Object.assign(new Error('missing'), { code: 'ENOENT' }));

    const vault = createApiKeyVault('/tmp/litelizard-user-data');

    await expect(vault.load('openai')).resolves.toBeNull();
  });

  it('暗号化ファイルが破損している場合は null を返す', async () => {
    const encrypted = Buffer.from('broken-encrypted-api-key');
    readFile.mockResolvedValue(encrypted);
    decryptString.mockImplementation(() => {
      throw new Error('corrupted payload');
    });

    const vault = createApiKeyVault('/tmp/litelizard-user-data');

    await expect(vault.load('openai')).resolves.toBeNull();
  });

  it('clear は暗号化ファイルと平文ファイルの両方を削除対象にする', async () => {
    unlink.mockResolvedValue(undefined);

    const vault = createApiKeyVault('/tmp/litelizard-user-data');

    await vault.clear();

    expect(unlink).toHaveBeenCalledWith('/tmp/litelizard-user-data/api-keys.bin');
    expect(unlink).toHaveBeenCalledWith('/tmp/litelizard-user-data/api-keys.plaintext');
  });

  it('provider ごとに個別保存できる', async () => {
    const encrypted = Buffer.from('encrypted-api-keys');
    isEncryptionAvailable.mockReturnValue(true);
    encryptString.mockReturnValue(encrypted);
    decryptString.mockReturnValue(JSON.stringify({ openai: 'sk-openai', anthropic: 'sk-anthropic' }));
    readFile.mockResolvedValue(encrypted);

    const vault = createApiKeyVault('/tmp/litelizard-user-data');

    await vault.save('openai', 'sk-openai');
    await vault.save('anthropic', 'sk-anthropic');

    await expect(vault.load('anthropic')).resolves.toBe('sk-anthropic');
  });

  it('旧形式の暗号化済み単一 API キーを openai として読める', async () => {
    const encrypted = Buffer.from('legacy-encrypted-api-key');
    readFile.mockResolvedValue(encrypted);
    decryptString.mockReturnValue('sk-legacy-openai');

    const vault = createApiKeyVault('/tmp/litelizard-user-data');

    await expect(vault.load('openai')).resolves.toBe('sk-legacy-openai');
  });
});
