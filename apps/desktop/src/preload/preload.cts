import { contextBridge } from 'electron';
import { createIpcBridge } from './ipcBridge.js';

const api = createIpcBridge();

try {
  contextBridge.exposeInMainWorld('litelizard', api);
  if (process.env.LITELIZARD_PACKAGED_SMOKE === '1') {
    contextBridge.exposeInMainWorld('__litelizardPreloadSmoke', 'ipc');
  }
  console.log('[Preload] litelizard bridge exposed (IPC mode)');
} catch (error) {
  console.error('[Preload] expose failed', error);
}
