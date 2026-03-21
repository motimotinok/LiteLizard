import { contextBridge } from 'electron';
import { createIpcBridge } from './ipcBridge.js';

const api = createIpcBridge();

try {
  contextBridge.exposeInMainWorld('litelizard', api);
  console.log('[Preload] litelizard bridge exposed (IPC mode)');
} catch (error) {
  console.error('[Preload] expose failed', error);
}
