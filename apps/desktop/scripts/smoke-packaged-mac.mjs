import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

const appExecutable = path.resolve(
  'release/mac-arm64/LiteLizard.app/Contents/MacOS/LiteLizard'
);
const timeoutMs = Number(process.env.LITELIZARD_SMOKE_TIMEOUT_MS ?? 60000);

if (process.platform !== 'darwin') {
  console.error('[Smoke] mac packaged app smoke can only run on macOS.');
  process.exit(1);
}

if (!existsSync(appExecutable)) {
  console.error(`[Smoke] packaged app executable was not found: ${appExecutable}`);
  console.error('[Smoke] Run `pnpm --filter @litelizard/desktop package:mac` first.');
  process.exit(1);
}

const child = spawn(appExecutable, ['--no-sandbox'], {
  env: {
    ...process.env,
    ELECTRON_ENABLE_LOGGING: '1',
    LITELIZARD_PACKAGED_SMOKE: '1',
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});

let output = '';
let settled = false;
let ready = false;

const finish = (code, signal = null) => {
  if (settled) {
    return;
  }
  settled = true;
  clearTimeout(timer);

  const passed = ready && (code === 0 || signal === 'SIGTERM');
  if (!passed) {
    console.error(output.trim());
    console.error(
      `[Smoke] packaged app smoke failed with exit code ${code ?? 'null'} and signal ${
        signal ?? 'null'
      }.`
    );
    process.exit(1);
  }

  process.stdout.write(output);
};

const timer = setTimeout(() => {
  if (!child.killed) {
    child.kill('SIGTERM');
  }
  finish(null, 'timeout');
}, timeoutMs);

child.stdout.on('data', (chunk) => {
  output += chunk.toString();
  if (!ready && output.includes('[Smoke] packaged app ready:')) {
    ready = true;
    child.kill('SIGTERM');
  }
});

child.stderr.on('data', (chunk) => {
  output += chunk.toString();
  if (!ready && output.includes('[Smoke] packaged app ready:')) {
    ready = true;
    child.kill('SIGTERM');
  }
});

child.on('error', (error) => {
  output += `[Smoke] failed to launch packaged app: ${error.message}\n`;
  finish(null);
});

child.on('exit', (code, signal) => {
  finish(code, signal);
});
