import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const defaultPackagePath = path.resolve(scriptDirectory, '../package.json');

export function deriveReleaseVersion(baseVersion, runNumber) {
  const versionMatch = /^(\d+)\.(\d+)\.(\d+)(?:[-+][0-9A-Za-z.-]+)?$/.exec(baseVersion);
  if (!versionMatch) {
    throw new Error(`Desktop package version is not valid SemVer: ${baseVersion}`);
  }

  if (!/^[1-9]\d*$/.test(String(runNumber))) {
    throw new Error(`GitHub run number must be a positive integer: ${runNumber}`);
  }

  return `${versionMatch[1]}.${versionMatch[2]}.${runNumber}`;
}

export async function prepareReleaseVersion(runNumber, packagePath = defaultPackagePath) {
  const packageJson = JSON.parse(await readFile(packagePath, 'utf8'));
  const releaseVersion = deriveReleaseVersion(packageJson.version, runNumber);

  packageJson.version = releaseVersion;
  await writeFile(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`);

  return releaseVersion;
}

const invokedAsScript =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (invokedAsScript) {
  const runNumber = process.argv[2];
  const releaseVersion = await prepareReleaseVersion(runNumber);
  process.stdout.write(`version=${releaseVersion}\n`);
}
