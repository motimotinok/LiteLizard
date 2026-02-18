import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { app, BrowserWindow } from 'electron';
import { registerIpcHandlers } from './ipc.js';

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

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      contextIsolation: true,
      sandbox: false,
      preload: preloadPath,
      nodeIntegration: false,
    },
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
}

app.whenReady().then(() => {
  registerIpcHandlers();
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
