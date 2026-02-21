import { contextBridge } from 'electron';
import { createMockPreloadApi } from './preloadMockApi.js';

const api = createMockPreloadApi();

try {
  contextBridge.exposeInMainWorld('litelizard', api);
  console.log('[Preload] litelizard bridge exposed (mock mode)');
} catch (error) {
  console.error('[Preload] expose failed', error);
}
