import path from 'node:path';
import { app, BrowserWindow } from 'electron';
import { registerIpcHandlers } from './ipc.js';

let mainWindow: BrowserWindow | null = null;

function createMainWindow() {
  const preloadPath = path.join(app.getAppPath(), 'dist/preload/preload.js');

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      contextIsolation: true,
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
