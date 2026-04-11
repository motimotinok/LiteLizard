import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { app, BrowserWindow, Menu } from 'electron';
import { IPC_CHANNELS } from '@litelizard/shared';
import { registerIpcHandlers } from './ipc.js';
import { loadWindowBounds, saveWindowBounds } from './windowState.js';
import { buildAppMenu } from './menu.js';

let mainWindow: BrowserWindow | null = null;

function resolvePreloadPath() {
  const currentFile = fileURLToPath(import.meta.url);
  const candidates = [
    path.join(app.getAppPath(), 'dist/preload/preload.cjs'),
    path.join(process.cwd(), 'dist/preload/preload.cjs'),
    path.resolve(path.dirname(currentFile), '../preload/preload.cjs'),
    path.join(app.getAppPath(), 'dist/preload/preload.js'),
    path.join(process.cwd(), 'dist/preload/preload.js'),
    path.resolve(path.dirname(currentFile), '../preload/preload.js'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return candidates[0];
}

function createMainWindow() {
  const preloadPath = resolvePreloadPath();
  console.log('[Main] preload path:', preloadPath);

  const bounds = loadWindowBounds();
  mainWindow = new BrowserWindow({
    ...bounds,
    webPreferences: {
      contextIsolation: true,
      // Keep sandbox on by default. Only disable explicitly for local debugging.
      sandbox: process.env.ELECTRON_DISABLE_SANDBOX === '1' ? false : undefined,
      preload: preloadPath,
      nodeIntegration: false,
    },
  });

  mainWindow.on('close', () => {
    if (mainWindow) {
      saveWindowBounds(mainWindow);
    }
  });

  const devUrl = process.env.VITE_DEV_SERVER_URL ?? 'http://localhost:5173';
  if (!app.isPackaged) {
    void mainWindow.loadURL(devUrl);
  } else {
    const indexPath = path.join(app.getAppPath(), 'dist/renderer/index.html');
    void mainWindow.loadFile(indexPath);
  }

  mainWindow.webContents.on('did-finish-load', () => {
    console.log('[Main] did-finish-load url:', mainWindow?.webContents.getURL());
  });

  mainWindow.webContents.on('console-message', (_event, _level, message, line, sourceId) => {
    console.log('[Renderer console]', message, sourceId ? `(${sourceId}:${line})` : '');
  });

  mainWindow.webContents.on('preload-error', (_event, preloadPathWithError, error) => {
    console.error('[Main] preload-error', preloadPathWithError, error);
  });

  mainWindow.on('closed', () => {
    if (mainWindow?.isDestroyed()) {
      mainWindow = null;
    }
  });

  return mainWindow;
}

function getUsableMainWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    return mainWindow;
  }

  const fallback = BrowserWindow.getAllWindows().find((win) => !win.isDestroyed()) ?? null;
  mainWindow = fallback;
  return fallback;
}

function requestOpenFolderFromMenu() {
  const target = getUsableMainWindow() ?? createMainWindow();

  if (target.webContents.isLoading()) {
    target.webContents.once('did-finish-load', () => {
      target.webContents.send(IPC_CHANNELS.requestOpenFolder);
    });
    return;
  }

  target.webContents.send(IPC_CHANNELS.requestOpenFolder);
}

app.whenReady().then(() => {
  registerIpcHandlers();
  createMainWindow();
  Menu.setApplicationMenu(buildAppMenu(requestOpenFolderFromMenu));

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
      Menu.setApplicationMenu(buildAppMenu(requestOpenFolderFromMenu));
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
