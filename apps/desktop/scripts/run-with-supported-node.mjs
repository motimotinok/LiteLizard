import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const minimumVersion = [22, 12, 0];
const targetScript = process.argv[2];

if (!targetScript) {
  console.error('[Node runtime] pnpm script name is required.');
  process.exit(1);
}

function parseVersion(version) {
  const match = version.trim().match(/^v?(\d+)\.(\d+)\.(\d+)/);
  return match ? match.slice(1).map(Number) : null;
}

function isSupported(version) {
  const parsed = parseVersion(version);
  if (!parsed) {
    return false;
  }

  for (let index = 0; index < minimumVersion.length; index += 1) {
    if (parsed[index] !== minimumVersion[index]) {
      return parsed[index] > minimumVersion[index];
    }
  }
  return true;
}

function getNodeVersion(executable) {
  const result = spawnSync(executable, ['--version'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  });
  return result.status === 0 ? result.stdout.trim() : null;
}

function addVersionManagerNodes(candidates, baseDirectory) {
  if (!existsSync(baseDirectory)) {
    return;
  }

  for (const entry of readdirSync(baseDirectory, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      candidates.add(path.join(baseDirectory, entry.name, 'bin', 'node'));
    }
  }
}

const candidates = new Set([process.execPath]);
for (const directory of (process.env.PATH ?? '').split(path.delimiter)) {
  if (directory) {
    candidates.add(path.join(directory, 'node'));
  }
}

const homeDirectory = os.homedir();
addVersionManagerNodes(
  candidates,
  path.join(process.env.NVM_DIR ?? path.join(homeDirectory, '.nvm'), 'versions', 'node')
);
addVersionManagerNodes(candidates, path.join(homeDirectory, '.nodebrew', 'node'));

const supportedNodes = [...candidates]
  .filter(existsSync)
  .map((executable) => ({ executable, version: getNodeVersion(executable) }))
  .filter(({ version }) => version && isSupported(version))
  .sort((left, right) => {
    const leftVersion = parseVersion(left.version);
    const rightVersion = parseVersion(right.version);
    for (let index = 0; index < 3; index += 1) {
      if (leftVersion[index] !== rightVersion[index]) {
        return rightVersion[index] - leftVersion[index];
      }
    }
    return 0;
  });

const selectedNode = isSupported(process.version)
  ? { executable: process.execPath, version: process.version }
  : supportedNodes[0];

if (!selectedNode) {
  console.error(
    `[Node runtime] LiteLizard desktop requires Node.js >= ${minimumVersion.join('.')}.`
  );
  console.error('[Node runtime] Install Node.js 24 and run `nvm use` before retrying.');
  process.exit(1);
}

console.log(
  selectedNode.executable === process.execPath
    ? `[Node runtime] using ${selectedNode.version}.`
    : `[Node runtime] ${process.version} is unsupported; using ${selectedNode.version} instead.`
);

const pnpmExecutable = process.env.npm_execpath;
if (!pnpmExecutable || !existsSync(pnpmExecutable)) {
  console.error('[Node runtime] pnpm executable could not be resolved.');
  process.exit(1);
}

const result = spawnSync(selectedNode.executable, [pnpmExecutable, 'run', targetScript], {
  env: {
    ...process.env,
    PATH: `${path.dirname(selectedNode.executable)}${path.delimiter}${process.env.PATH ?? ''}`,
    npm_node_execpath: selectedNode.executable,
  },
  stdio: 'inherit',
});

if (result.error) {
  console.error(`[Node runtime] Failed to start ${targetScript}: ${result.error.message}`);
  process.exit(1);
}

process.exit(result.status ?? 1);
