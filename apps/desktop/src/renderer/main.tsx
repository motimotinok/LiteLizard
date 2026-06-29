import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.js';
import { AnalysisFlowPrototype } from './components/prototype/AnalysisFlowPrototype.js';
import './styles.css';

async function bootstrap() {
  if (!window.litelizard) {
    const { createMockPreloadApi } = await import('../preload/preloadMockApi.js');
    window.litelizard = createMockPreloadApi();
  }

  const isAnalysisFlowPrototype =
    new URLSearchParams(window.location.search).get('prototype') === 'analysis-flow';

  createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      {isAnalysisFlowPrototype ? <AnalysisFlowPrototype /> : <App />}
    </React.StrictMode>
  );
}

void bootstrap();
