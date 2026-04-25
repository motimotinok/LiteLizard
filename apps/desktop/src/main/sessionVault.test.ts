import { beforeEach, describe, expect, it, vi } from 'vitest';

const vaultMock = vi.hoisted(() => ({
  mkdir: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn(),
  unlink: vi.fn(),
  isEncryptionAvailable: vi.fn(),
  encryptString: vi.fn(),
  decryptString: vi.fn(),
}));

vi.mock('node:fs/promises', () => ({
  default: {
    mkdir: vaultMock.mkdir,
    readFile: vaultMock.readFile,
    writeFile: vaultMock.writeFile,
    unlink: vaultMock.unlink,
  },
}));

vi.mock('electron', () => ({
  safeStorage: {
    isEncryptionAvailable: vaultMock.isEncryptionAvailable,
    encryptString: vaultMock.encryptString,
    decryptString: vaultMock.decryptString,
  },
}));

import { createApiKeyVault } from './sessionVault.js';

describe('apiKeyVault', () => {
  beforeEach(() => {
    Object.values(vaultMock).forEach((mock) => {
      mock.mockReset();
    });
  });

  it('safeStorage が利用可能な場合は暗号化ファイルへ保存して復号できる', async () => {
    const encrypted = Buffer.from('encrypted-api-keys');
    vaultMock.isEncryptionAvailable.mockReturnValue(true);
    vaultMock.encryptString.mockReturnValue(encrypted);
    vaultMock.readFile.mockResolvedValue(encrypted);
    vaultMock.decryptString.mockReturnValue(JSON.stringify({ openai: 'sk-test-123' }));

    const vault = createApiKeyVault('/tmp/litelizard-user-data');

    await vault.save('openai', 'sk-test-123');
    await expect(vault.load('openai')).resolves.toBe('sk-test-123');

    expect(vaultMock.mkdir).toHaveBeenCalledWith('/tmp/litelizard-user-data', { recursive: true });
    expect(vaultMock.encryptString).toHaveBeenCalledWith(JSON.stringify({ openai: 'sk-test-123' }));
    expect(vaultMock.writeFile).toHaveBeenCalledWith('/tmp/litelizard-user-data/api-keys.bin', encrypted);
    expect(vaultMock.decryptString).toHaveBeenCalledWith(encrypted);
  });

  it('safeStorage が使えない場合は平文ファイルへフォールバックする', async () => {
    vaultMock.isEncryptionAvailable.mockReturnValue(false);
    vaultMock.readFile.mockRejectedValue(Object.assign(new Error('missing'), { code: 'ENOENT' }));

    const vault = createApiKeyVault('/tmp/litelizard-user-data');

    await vault.save('openai', 'sk-plain-123');

    vaultMock.readFile.mockReset();
    vaultMock.readFile
      .mockRejectedValueOnce(Object.assign(new Error('missing'), { code: 'ENOENT' }))
      .mockResolvedValueOnce(JSON.stringify({ openai: 'sk-plain-123' }));

    await expect(vault.load('openai')).resolves.toBe('sk-plain-123');

    expect(vaultMock.writeFile).toHaveBeenCalledWith(
      '/tmp/litelizard-user-data/api-keys.plaintext',
      JSON.stringify({ openai: 'sk-plain-123' }),
      'utf8',
    );
    expect(vaultMock.encryptString).not.toHaveBeenCalled();
  });

  it('保存済みファイルが無い場合は null を返す', async () => {
    vaultMock.readFile.mockRejectedValue(Object.assign(new Error('missing'), { code: 'ENOENT' }));

    const vault = createApiKeyVault('/tmp/litelizard-user-data');

    await expect(vault.load('openai')).resolves.toBeNull();
  });

  it('暗号化ファイルが破損している場合は null を返す', async () => {
    const encrypted = Buffer.from('broken-encrypted-api-key');
    vaultMock.readFile.mockResolvedValue(encrypted);
    vaultMock.decryptString.mockImplementation(() => {
      throw new Error('corrupted payload');
    });

    const vault = createApiKeyVault('/tmp/litelizard-user-data');

    await expect(vault.load('openai')).resolves.toBeNull();
  });

  it('clear は暗号化ファイルと平文ファイルの両方を削除対象にする', async () => {
    vaultMock.unlink.mockResolvedValue(undefined);

    const vault = createApiKeyVault('/tmp/litelizard-user-data');

    await vault.clear();

    expect(vaultMock.unlink).toHaveBeenCalledWith('/tmp/litelizard-user-data/api-keys.bin');
    expect(vaultMock.unlink).toHaveBeenCalledWith('/tmp/litelizard-user-data/api-keys.plaintext');
  });

  it('provider ごとに個別保存できる', async () => {
    const encrypted = Buffer.from('encrypted-api-keys');
    vaultMock.isEncryptionAvailable.mockReturnValue(true);
    vaultMock.encryptString.mockReturnValue(encrypted);
    vaultMock.decryptString.mockReturnValue(JSON.stringify({ openai: 'sk-openai', anthropic: 'sk-anthropic' }));
    vaultMock.readFile.mockResolvedValue(encrypted);

    const vault = createApiKeyVault('/tmp/litelizard-user-data');

    await vault.save('openai', 'sk-openai');
    await vault.save('anthropic', 'sk-anthropic');

    await expect(vault.load('anthropic')).resolves.toBe('sk-anthropic');
  });

  it('旧形式の暗号化済み単一 API キーを openai として読める', async () => {
    const encrypted = Buffer.from('legacy-encrypted-api-key');
    vaultMock.readFile.mockResolvedValue(encrypted);
    vaultMock.decryptString.mockReturnValue('sk-legacy-openai');

    const vault = createApiKeyVault('/tmp/litelizard-user-data');

    await expect(vault.load('openai')).resolves.toBe('sk-legacy-openai');
  });
});
