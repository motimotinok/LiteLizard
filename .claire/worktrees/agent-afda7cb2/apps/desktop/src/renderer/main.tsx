import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.js';
import './styles.css';

async function bootstrap() {
  if (!window.litelizard) {
    const { createMockPreloadApi } = await import('../preload/preloadMockApi.js');
    const { mockRootPath } = await import('../preload/preloadMockData.js');
    window.litelizard = createMockPreloadApi();

    const { useAppStore } = await import('./store/useAppStore.js');
    const { openFolder, loadDocument } = useAppStore.getState();
    await openFolder();
    await loadDocument(`${mockRootPath}/pakira.md`);
  }

  createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

void bootstrap();
