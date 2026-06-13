import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { deriveReleaseVersion, prepareReleaseVersion } from './prepare-release-version.mjs';

test('deriveReleaseVersion uses the workflow run number as a stable patch version', () => {
  assert.equal(deriveReleaseVersion('0.1.0', 9), '0.1.9');
  assert.equal(deriveReleaseVersion('0.1.0', 9), '0.1.9');
  assert.equal(deriveReleaseVersion('0.2.0', 10), '0.2.10');
});

test('deriveReleaseVersion rejects malformed inputs', () => {
  assert.throws(() => deriveReleaseVersion('0.1', 9), /valid SemVer/);
  assert.throws(() => deriveReleaseVersion('0.1.0', 0), /positive integer/);
  assert.throws(() => deriveReleaseVersion('0.1.0', '1.5'), /positive integer/);
});

test('prepareReleaseVersion updates the desktop package version', async () => {
  const temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), 'litelizard-release-version-'));
  const packagePath = path.join(temporaryDirectory, 'package.json');
  try {
    await writeFile(
      packagePath,
      `${JSON.stringify({ name: '@litelizard/desktop', version: '0.1.0' }, null, 2)}\n`,
    );

    const releaseVersion = await prepareReleaseVersion(12, packagePath);
    const packageJson = JSON.parse(await readFile(packagePath, 'utf8'));

    assert.equal(releaseVersion, '0.1.12');
    assert.equal(packageJson.version, '0.1.12');
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
});
