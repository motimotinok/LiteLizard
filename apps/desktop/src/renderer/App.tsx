import React, { useEffect, useMemo, useState } from 'react';
import { ExplorerPane } from './components/ExplorerPane.js';
import { EditorPane } from './components/EditorPane.js';
import { AnalysisPane } from './components/AnalysisPane.js';
import { useAppStore } from './store/useAppStore.js';

export function App() {
  const {
    rootPath,
    tree,
    currentFilePath,
    document,
    dirty,
    apiKeyConfigured,
    statusMessage,
    openFolder,
    createFolder,
    createDocument,
    loadDocument,
    updateParagraph,
    reorderParagraphs,
    saveNow,
    runAnalysis,
    bootstrapApiKeyStatus,
    saveApiKey,
    clearApiKey,
  } = useAppStore();

  const [titleInput, setTitleInput] = useState('Untitled');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [explorerVisible, setExplorerVisible] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    void bootstrapApiKeyStatus();
  }, [bootstrapApiKeyStatus]);

  useEffect(() => {
    if (!dirty || !document || !currentFilePath) {
      return;
    }

    const handle = window.setTimeout(() => {
      void saveNow();
    }, 3000);

    return () => {
      window.clearTimeout(handle);
    };
  }, [dirty, document, currentFilePath, saveNow]);

  useEffect(() => {
    const onBeforeUnload = () => {
      if (dirty) {
        void saveNow();
      }
    };

    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, [dirty, saveNow]);

  const staleCount = useMemo(
    () => (document ? document.paragraphs.filter((paragraph) => paragraph.lizard.status === 'stale').length : 0),
    [document]
  );

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="top-left">
          <h1>LiteLizard</h1>
          <div className="status-line">{statusMessage}</div>
        </div>
        <div className="top-right">
          <span>Dirty: {dirty ? 'yes' : 'no'}</span>
          <span>Stale: {staleCount}</span>
          <button onClick={() => setExplorerVisible((current) => !current)}>
            Explorer: {explorerVisible ? 'Hide' : 'Show'}
          </button>
          <button onClick={() => setSettingsOpen((current) => !current)}>
            Settings: {settingsOpen ? 'Close' : 'Open'}
          </button>
        </div>
      </header>

      <section className="layout-controls">
        <input value={titleInput} onChange={(event) => setTitleInput(event.target.value)} />
        <button onClick={() => void createDocument(titleInput)} disabled={!rootPath}>
          Create Document
        </button>
        <button onClick={() => void saveNow()} disabled={!document}>
          Save Now
        </button>
      </section>

      {settingsOpen ? (
        <section className="settings-panel">
          <h2>Settings</h2>
          <div className="settings-row">
            <span>OpenAI API Key: {apiKeyConfigured ? 'Configured' : 'Not configured'}</span>
          </div>
          <div className="settings-row">
            <input
              type="password"
              placeholder="sk-..."
              value={apiKeyInput}
              onChange={(event) => setApiKeyInput(event.target.value)}
            />
            <button onClick={() => void saveApiKey(apiKeyInput)} disabled={!apiKeyInput.trim()}>
              Save API Key
            </button>
            <button onClick={() => void clearApiKey()} disabled={!apiKeyConfigured}>
              Clear API Key
            </button>
          </div>
        </section>
      ) : null}

      <main className={explorerVisible ? 'main-grid' : 'main-grid explorer-hidden'}>
        {explorerVisible ? (
          <ExplorerPane
            rootPath={rootPath}
            tree={tree}
            currentFilePath={currentFilePath}
            onOpenFolder={() => void openFolder()}
            onCreateFolder={(name) => void createFolder(name)}
            onCreateDocument={() => void createDocument(titleInput)}
            onSelectFile={(path) => void loadDocument(path)}
          />
        ) : null}
        <EditorPane
          document={document}
          onChangeParagraph={(paragraphId, text) => updateParagraph(paragraphId, text)}
          onReorder={(orderedIds) => reorderParagraphs(orderedIds)}
        />
        <AnalysisPane document={document} onRunAnalysis={() => void runAnalysis()} />
      </main>
    </div>
  );
}
