import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.js';
import './styles.css';

async function bootstrap() {
  if (!window.litelizard) {
    const { createMockPreloadApi } = await import('../preload/preloadMockApi.js');
    window.litelizard = createMockPreloadApi();
  }

  createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

void bootstrap();
