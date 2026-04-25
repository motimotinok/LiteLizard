import { describe, expect, it, vi } from 'vitest';

const menuMock = vi.hoisted(() => ({
  buildFromTemplate: vi.fn((template) => ({ template })),
}));

vi.mock('electron', () => ({
  Menu: {
    buildFromTemplate: menuMock.buildFromTemplate,
  },
  app: {
    name: 'LiteLizard',
  },
}));

import { buildAppMenu } from './menu.js';

describe('buildAppMenu', () => {
  it('ファイルメニューに別のフォルダを開くを含む', () => {
    const menu = buildAppMenu(() => {}) as unknown as { template: Electron.MenuItemConstructorOptions[] };
    const fileMenu = menu.template.find((item) => item.label === 'ファイル');
    const submenu = Array.isArray(fileMenu?.submenu) ? fileMenu.submenu : [];

    expect(submenu.some((item) => 'label' in item && item.label === '別のフォルダを開く...')).toBe(true);
  });

  it('別のフォルダを開くクリックで callback を呼ぶ', () => {
    const onRequestOpenFolder = vi.fn();
    const menu = buildAppMenu(onRequestOpenFolder) as unknown as { template: Electron.MenuItemConstructorOptions[] };
    const fileMenu = menu.template.find((item) => item.label === 'ファイル');
    const submenu = Array.isArray(fileMenu?.submenu) ? fileMenu.submenu : [];
    const openItem = submenu.find((item) => 'label' in item && item.label === '別のフォルダを開く...');

    if (!openItem || !('click' in openItem) || typeof openItem.click !== 'function') {
      throw new Error('open folder menu item not found');
    }

    openItem.click(undefined as never, undefined as never, undefined as never);

    expect(onRequestOpenFolder).toHaveBeenCalledTimes(1);
  });
});
