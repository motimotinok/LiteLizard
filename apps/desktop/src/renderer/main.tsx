import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.js';
import './styles.css';
import { createMockPreloadApi } from '../preload/preloadMockApi.js';

if (!window.litelizard) {
  window.litelizard = createMockPreloadApi();
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
