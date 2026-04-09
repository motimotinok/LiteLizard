import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockStore, mockGetAllDisplays } = vi.hoisted(() => {
  const mockStore = { get: vi.fn(), set: vi.fn() };
  const mockGetAllDisplays = vi.fn();
  return { mockStore, mockGetAllDisplays };
});

vi.mock('electron-store', () => ({
  default: vi.fn().mockImplementation(() => mockStore),
}));

vi.mock('electron', () => ({
  screen: { getAllDisplays: mockGetAllDisplays },
}));

import { loadWindowBounds, saveWindowBounds } from './windowState.js';

const singleDisplay = [{ bounds: { x: 0, y: 0, width: 1920, height: 1080 } }];

describe('loadWindowBounds', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAllDisplays.mockReturnValue(singleDisplay);
  });

  it('保存済み bounds がない（デフォルト値）場合にデフォルト値を返す', () => {
    mockStore.get.mockReturnValue({ width: 1400, height: 900 });

    const result = loadWindowBounds();

    expect(result).toEqual({ width: 1400, height: 900 });
  });

  it('保存済み bounds が画面内にある場合にそのまま返す', () => {
    mockStore.get.mockReturnValue({ x: 100, y: 100, width: 1200, height: 800 });

    const result = loadWindowBounds();

    expect(result).toEqual({ x: 100, y: 100, width: 1200, height: 800 });
  });

  it('保存済み x/y が画面外の場合にサイズのみ返す', () => {
    mockStore.get.mockReturnValue({ x: -5000, y: -5000, width: 1200, height: 800 });

    const result = loadWindowBounds();

    expect(result).toEqual({ width: 1200, height: 800 });
    expect(result.x).toBeUndefined();
    expect(result.y).toBeUndefined();
  });

  it('複数ディスプレイのいずれかに bounds が含まれる場合にそのまま返す', () => {
    mockGetAllDisplays.mockReturnValue([
      { bounds: { x: 0, y: 0, width: 1920, height: 1080 } },
      { bounds: { x: 1920, y: 0, width: 2560, height: 1440 } },
    ]);
    mockStore.get.mockReturnValue({ x: 2000, y: 100, width: 1200, height: 800 });

    const result = loadWindowBounds();

    expect(result).toEqual({ x: 2000, y: 100, width: 1200, height: 800 });
  });

  it('複数ディスプレイのいずれにも含まれない場合にサイズのみ返す', () => {
    mockGetAllDisplays.mockReturnValue([
      { bounds: { x: 0, y: 0, width: 1920, height: 1080 } },
      { bounds: { x: 1920, y: 0, width: 2560, height: 1440 } },
    ]);
    mockStore.get.mockReturnValue({ x: 9999, y: 9999, width: 1200, height: 800 });

    const result = loadWindowBounds();

    expect(result).toEqual({ width: 1200, height: 800 });
  });
});

describe('saveWindowBounds', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('通常状態のウィンドウの bounds を保存する', () => {
    const win = {
      isMinimized: vi.fn().mockReturnValue(false),
      isMaximized: vi.fn().mockReturnValue(false),
      getBounds: vi.fn().mockReturnValue({ x: 200, y: 150, width: 1200, height: 800 }),
    } as unknown as Electron.BrowserWindow;

    saveWindowBounds(win);

    expect(mockStore.set).toHaveBeenCalledWith('windowBounds', { x: 200, y: 150, width: 1200, height: 800 });
  });

  it('最小化中のウィンドウは保存しない', () => {
    const win = {
      isMinimized: vi.fn().mockReturnValue(true),
      isMaximized: vi.fn().mockReturnValue(false),
      getBounds: vi.fn(),
    } as unknown as Electron.BrowserWindow;

    saveWindowBounds(win);

    expect(mockStore.set).not.toHaveBeenCalled();
    expect(win.getBounds).not.toHaveBeenCalled();
  });

  it('最大化中のウィンドウは保存しない', () => {
    const win = {
      isMinimized: vi.fn().mockReturnValue(false),
      isMaximized: vi.fn().mockReturnValue(true),
      getBounds: vi.fn(),
    } as unknown as Electron.BrowserWindow;

    saveWindowBounds(win);

    expect(mockStore.set).not.toHaveBeenCalled();
    expect(win.getBounds).not.toHaveBeenCalled();
  });
});
