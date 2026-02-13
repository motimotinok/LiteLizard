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
    session,
    usage,
    statusMessage,
    devCode,
    openFolder,
    createDocument,
    loadDocument,
    updateParagraph,
    reorderParagraphs,
    saveNow,
    runAnalysis,
    bootstrapSession,
    requestEmailLink,
    verifyEmailLink,
    logout,
  } = useAppStore();

  const [titleInput, setTitleInput] = useState('Untitled');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');

  useEffect(() => {
    void bootstrapSession();
  }, [bootstrapSession]);

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
        </div>
      </header>

      <section className="auth-bar">
        {!session ? (
          <>
            <input
              placeholder="Email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <button onClick={() => void requestEmailLink(email)}>Request Email Link</button>
            <input
              placeholder="6-digit code"
              value={code}
              onChange={(event) => setCode(event.target.value)}
            />
            <button onClick={() => void verifyEmailLink(email, code)}>Verify</button>
            {devCode ? <span className="dev-code">Dev code: {devCode}</span> : null}
          </>
        ) : (
          <>
            <span>Logged in: {session.email}</span>
            <button onClick={() => void logout()}>Logout</button>
            <span>
              Usage Today: {usage?.today.requestCount ?? 0} req / {usage?.today.inputTokens ?? 0} in tokens
            </span>
          </>
        )}
      </section>

      <section className="layout-controls">
        <input value={titleInput} onChange={(event) => setTitleInput(event.target.value)} />
        <button onClick={() => void createDocument(titleInput)} disabled={!rootPath}>
          Create Document
        </button>
        <button onClick={() => void saveNow()} disabled={!document}>
          Save Now
        </button>
      </section>

      <main className="main-grid">
        <ExplorerPane
          rootPath={rootPath}
          tree={tree}
          currentFilePath={currentFilePath}
          onOpenFolder={() => void openFolder()}
          onCreateDocument={() => void createDocument(titleInput)}
          onSelectFile={(path) => void loadDocument(path)}
        />
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
