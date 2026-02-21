import path from 'node:path';
import { test, expect, _electron as electron } from '@playwright/test';
import { fileURLToPath } from 'node:url';

const shouldRun = process.env.RUN_E2E_ELECTRON === '1';
const dirname = path.dirname(fileURLToPath(import.meta.url));

test.describe('LiteLizard desktop smoke', () => {
  test.skip(!shouldRun, 'Set RUN_E2E_ELECTRON=1 to run Electron E2E');

  test('launches app shell', async () => {
    const app = await electron.launch({
      args: [path.resolve(dirname, '../../../apps/desktop')],
      env: {
        ...process.env,
        VITE_DEV_SERVER_URL: 'http://localhost:5173',
      },
    });

    const page = await app.firstWindow();
    await expect(page.getByTestId('file-browser-pane')).toBeVisible();
    await expect(page.getByTestId('explorer-brand')).toBeVisible();

    await app.close();
  });
});
