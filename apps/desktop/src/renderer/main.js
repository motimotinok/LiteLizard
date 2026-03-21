import { jsx as _jsx } from "react/jsx-runtime";
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
        await loadDocument(`${mockRootPath}/pakira.md`);
    })();
}
createRoot(document.getElementById('root')).render(_jsx(React.StrictMode, { children: _jsx(App, {}) }));
//# sourceMappingURL=main.js.map