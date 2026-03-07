import React, { useEffect, useMemo, useState } from 'react';
import { ExplorerPane } from './components/ExplorerPane.js';
import { AnalysisPane } from './components/AnalysisPane.js';
import { EditorPane } from './components/editor/index.js';
import { LeftIconRail } from './components/LeftIconRail.js';
import { useAppStore } from './store/useAppStore.js';
import { useResizablePanel } from './hooks/useResizablePanel.js';

function DoorIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      {/* 外枠 */}
      <rect x="2.5" y="1.5" width="13" height="15" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
      {/* ヒンジ側の縦線（左から1/3） */}
      <line x1="7" y1="1.5" x2="7" y2="16.5" stroke="currentColor" strokeWidth="1.2" />
      {/* ドアノブ */}
      <circle cx="11.5" cy="9" r="1.1" fill="currentColor" />
    </svg>
  );
}

export function App() {
  const {
    rootPath,
    tree,
    currentFilePath,
    document: currentDocument,
    dirty,
    editorMode,
    viewScale,
    openFolder,
    createDocument,
    createEntry,
    renameEntry,
    deleteEntry,
    loadDocument,
    reorderParagraphs,
    reorderChapters,
    syncDocumentStructure,
    saveNow,
    cycleEditorMode,
    setViewScale,
    bootstrapApiKeyStatus,
  } = useAppStore();

  const [activeParagraphId, setActiveParagraphId] = useState<string | null>(null);
  const [explorerOpen, setExplorerOpen] = useState(true);
  const [chatPanelOpen, setChatPanelOpen] = useState(false);
  const [scrollRequest, setScrollRequest] = useState<{ paragraphId: string; nonce: number } | null>(null);

  const explorerPanel = useResizablePanel(260, 160, 480);
  const chatPanel = useResizablePanel(340, 240, 600);

  useEffect(() => {
    void bootstrapApiKeyStatus();
  }, [bootstrapApiKeyStatus]);

  useEffect(() => {
    if (!dirty || !currentDocument || !currentFilePath) {
      return;
    }

    const handle = window.setTimeout(() => {
      void saveNow();
    }, 2500);

    return () => {
      window.clearTimeout(handle);
    };
  }, [dirty, currentDocument, currentFilePath, saveNow]);

  useEffect(() => {
    if (!currentDocument?.paragraphs.length) {
      setActiveParagraphId(null);
      return;
    }

    if (
      !activeParagraphId ||
      !currentDocument.paragraphs.some((paragraph) => paragraph.id === activeParagraphId)
    ) {
      setActiveParagraphId(currentDocument.paragraphs[0].id);
    }
  }, [currentDocument, activeParagraphId]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const modifier = event.metaKey || event.ctrlKey;
      if (!modifier) {
        return;
      }

      const key = event.key.toLowerCase();

      if (key === 's') {
        event.preventDefault();
        void saveNow();
        return;
      }

      if (event.shiftKey && key === 'a') {
        event.preventDefault();
        setChatPanelOpen((current) => !current);
        return;
      }

      if (event.shiftKey && key === 'm') {
        event.preventDefault();
        cycleEditorMode();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [cycleEditorMode, saveNow]);

  const modeLabel = useMemo(() => {
    if (editorMode === 'writing') {
      return '執筆';
    }
    if (editorMode === 'structure') {
      return '構造推敲';
    }
    return '読み手視点';
  }, [editorMode]);

  return (
    <div className="workspace-root">
      <header className="global-header">
        <div className="global-header-left">
          <button
            className={explorerOpen ? 'panel-toggle is-active' : 'panel-toggle'}
            onClick={() => setExplorerOpen((v) => !v)}
            title="エクスプローラー"
          >
            <DoorIcon />
          </button>
        </div>

        <div className="global-header-center">
          {currentDocument ? (
            <div className="global-tab">{currentDocument.title}</div>
          ) : null}
        </div>

        <div className="global-header-right">
          <button
            className={chatPanelOpen ? 'panel-toggle is-active' : 'panel-toggle'}
            onClick={() => setChatPanelOpen((current) => !current)}
            title="チャット (Cmd/Ctrl+Shift+A)"
          >
            <DoorIcon />
          </button>
        </div>
      </header>

      <div className="workspace-body">
        <div className="workspace-left">
          <LeftIconRail />
          {explorerOpen && (
            <ExplorerPane
              rootPath={rootPath}
              tree={tree}
              currentFilePath={currentFilePath}
              style={{ width: explorerPanel.width }}
              onCreateEntry={(parentPath, type, name) => void createEntry(parentPath, type, name)}
              onRenameEntry={(targetPath, nextName) => void renameEntry(targetPath, nextName)}
              onDeleteEntry={(targetPath) => void deleteEntry(targetPath)}
              onSelectFile={(path) => void loadDocument(path)}
            />
          )}
          {explorerOpen && (
            <div
              className="panel-resizer"
              onMouseDown={(e) => explorerPanel.onMouseDown(e, 1)}
            />
          )}
        </div>

        <main className="workspace-main">
          <div className={chatPanelOpen ? 'workspace-content with-chat' : 'workspace-content no-chat'}>
            <EditorPane
              isExpanded={!chatPanelOpen}
              document={currentDocument}
              dirty={dirty}
              activeParagraphId={activeParagraphId}
              scrollRequest={scrollRequest}
              setActiveParagraphId={setActiveParagraphId}
              viewScale={viewScale}
              onSetViewScale={setViewScale}
              onSyncStructure={(input) => syncDocumentStructure(input)}
              onReorderParagraphs={(orderedIds) => reorderParagraphs(orderedIds)}
              onReorderChapters={(orderedIds) => reorderChapters(orderedIds)}
              onCreateEssay={() => {
                if (!rootPath) {
                  void openFolder();
                  return;
                }
                void createDocument('Untitled', rootPath);
              }}
              onOpenFolder={() => void openFolder()}
            />

            {chatPanelOpen ? (
              <aside className="chat-shell" style={{ width: chatPanel.width }} aria-label="chat-panel">
                <div
                  className="panel-resizer panel-resizer-left"
                  onMouseDown={(e) => chatPanel.onMouseDown(e, -1)}
                />
                <div className="chat-body">
                  <AnalysisPane
                    document={currentDocument}
                    activeParagraphId={activeParagraphId}
                    onSetActiveParagraphId={setActiveParagraphId}
                    onReorderParagraphs={(orderedIds) => reorderParagraphs(orderedIds)}
                    onRequestScrollToParagraph={(paragraphId) => {
                      setScrollRequest({ paragraphId, nonce: Date.now() });
                    }}
                  />
                </div>
              </aside>
            ) : null}
          </div>

          <div className="workspace-statusline">
            <span>モード: {modeLabel}</span>
            <span>視点: {viewScale === 'micro' ? 'ミクロ' : 'マクロ'}</span>
            <span>Cmd/Ctrl+Shift+M でモード切替</span>
          </div>
        </main>
      </div>
    </div>
  );
}
