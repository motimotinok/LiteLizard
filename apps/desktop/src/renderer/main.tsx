import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.js';
import './styles.css';
import { createMockPreloadApi } from '../preload/preloadMockApi.js';
import { mockRootPath } from '../preload/preloadMockData.js';
import { useAppStore } from './store/useAppStore.js';

if (!window.litelizard) {
  window.litelizard = createMockPreloadApi();
  void (async () => {
    const { openFolder, loadDocument } = useAppStore.getState();
    await openFolder();
    await loadDocument(`${mockRootPath}/welcome.md`);
  })();
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
