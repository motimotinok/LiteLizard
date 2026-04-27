import path from 'node:path';
import { test, expect, _electron as electron } from '@playwright/test';
import { fileURLToPath } from 'node:url';

const shouldRun = process.env.RUN_E2E_ELECTRON === '1';
const dirname = path.dirname(fileURLToPath(import.meta.url));

test.describe('LiteLizard desktop UI check', () => {
  test.skip(!shouldRun, 'Set RUN_E2E_ELECTRON=1 to run Electron E2E');

  let app: Awaited<ReturnType<typeof electron.launch>>;
  let page: Awaited<ReturnType<typeof app.firstWindow>>;

  test.beforeAll(async () => {
    app = await electron.launch({
      executablePath: path.resolve(dirname, '../../../apps/desktop/node_modules/.bin/electron'),
      args: [path.resolve(dirname, '../../../apps/desktop')],
      env: {
        ...process.env,
        VITE_DEV_SERVER_URL: 'http://localhost:5173',
      },
    });
    page = await app.firstWindow();
    await page.waitForLoadState('domcontentloaded');
  });

  test.afterAll(async () => {
    await app.close();
  });

  test('01 - app起動: workspace-root が表示される', async () => {
    await expect(page.locator('.workspace-root')).toBeVisible({ timeout: 15_000 });
    await page.screenshot({ path: 'test-results/01-initial.png', fullPage: true });
  });

  test('02 - Agents 画面: READING AGENTS が表示される', async () => {
    await page.getByRole('button', { name: '分析エージェント' }).click();
    await expect(page.getByText('Reading Agents')).toBeVisible();
    await page.screenshot({ path: 'test-results/02-agents.png', fullPage: true });
  });

  test('03 - Settings 画面: 設定セクションが表示される', async () => {
    await page.getByRole('button', { name: '設定' }).click();
    await expect(page.locator('.settings-section').first()).toBeVisible();
    await page.screenshot({ path: 'test-results/03-settings.png', fullPage: true });
  });

  test('04 - Explorer 復帰: サイドバーが表示される', async () => {
    await page.getByRole('button', { name: 'エクスプローラー' }).click();
    await expect(page.locator('.workspace-sidebar')).toBeVisible();
    await page.screenshot({ path: 'test-results/04-explorer.png', fullPage: true });
  });
});
