import { jsx as _jsx } from "react/jsx-runtime";
import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.js';
import './styles.css';
async function bootstrap() {
    if (!window.litelizard) {
        const { createMockPreloadApi } = await import('../preload/preloadMockApi.js');
        window.litelizard = createMockPreloadApi();
    }
    createRoot(document.getElementById('root')).render(_jsx(React.StrictMode, { children: _jsx(App, {}) }));
}
void bootstrap();
//# sourceMappingURL=main.js.map