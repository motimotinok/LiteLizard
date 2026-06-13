import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const apiDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const betterSqliteDirectory = path.dirname(require.resolve('better-sqlite3/package.json'));
const abiMismatchPattern = /NODE_MODULE_VERSION|different Node\.js version/;

export function isNativeAbiMismatch(output) {
  return abiMismatchPattern.test(output);
}

function checkBetterSqlite3() {
  return spawnSync(
    process.execPath,
    [
      '-e',
      [
        "const Database = require('better-sqlite3');",
        "const db = new Database(':memory:');",
        'db.close();',
      ].join(' '),
    ],
    {
      cwd: apiDirectory,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );
}

export function ensureNativeRuntime() {
  let check = checkBetterSqlite3();
  if (check.status === 0) {
    return 0;
  }

  const failureOutput = `${check.stdout ?? ''}\n${check.stderr ?? ''}`;
  if (!isNativeAbiMismatch(failureOutput)) {
    process.stderr.write(failureOutput);
    return check.status ?? 1;
  }

  console.warn(
    `[native-runtime] better-sqlite3 does not match Node ${process.version}; rebuilding it for ABI ${process.versions.modules}.`,
  );

  const rebuild = spawnSync('npm', ['run', 'build-release'], {
    cwd: betterSqliteDirectory,
    stdio: 'inherit',
  });
  if (rebuild.status !== 0) {
    return rebuild.status ?? 1;
  }

  check = checkBetterSqlite3();
  if (check.status !== 0) {
    process.stderr.write(check.stderr ?? '');
    return check.status ?? 1;
  }

  console.log('[native-runtime] better-sqlite3 rebuild completed.');
  return 0;
}

const invokedAsScript =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (invokedAsScript) {
  process.exit(ensureNativeRuntime());
}
