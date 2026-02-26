import React, { useEffect, useMemo, useState } from 'react';
import { ExplorerPane } from './components/ExplorerPane.js';
import { AnalysisPane } from './components/AnalysisPane.js';
import { EditorPane } from './components/EditorPane.js';
import { LeftIconRail } from './components/LeftIconRail.js';
import { useAppStore } from './store/useAppStore.js';

export function App() {
  const {
    rootPath,
    tree,
    currentFilePath,
    document: currentDocument,
    dirty,
    statusMessage,
    editorMode,
    viewScale,
    openFolder,
    createDocument,
    createEntry,
    renameEntry,
    deleteEntry,
    loadDocument,
    reorderParagraphs,
    syncDocumentStructure,
    saveNow,
    cycleEditorMode,
    setViewScale,
  } = useAppStore();

  const [activeParagraphId, setActiveParagraphId] = useState<string | null>(null);
  const [chatPanelOpen, setChatPanelOpen] = useState(false);
  const [scrollRequest, setScrollRequest] = useState<{ paragraphId: string; nonce: number } | null>(null);

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
      <div className="workspace-left">
        <LeftIconRail />
        <ExplorerPane
          rootPath={rootPath}
          tree={tree}
          currentFilePath={currentFilePath}
          onOpenFolder={() => void openFolder()}
          onCreateEntry={(parentPath, type, name) => void createEntry(parentPath, type, name)}
          onRenameEntry={(targetPath, nextName) => void renameEntry(targetPath, nextName)}
          onDeleteEntry={(targetPath) => void deleteEntry(targetPath)}
          onSelectFile={(path) => void loadDocument(path)}
        />
      </div>

      <main className="workspace-main">
        <div className="workspace-toolbar">
          <div className="workspace-toolbar-left">
            <span className={dirty ? 'toolbar-badge toolbar-badge-dirty' : 'toolbar-badge'}>
              {dirty ? '未保存' : '保存済み'}
            </span>
            <span className="toolbar-text">{statusMessage}</span>
          </div>

          <div className="workspace-toolbar-right">
            <button
              className={chatPanelOpen ? 'action-button action-button-primary' : 'action-button'}
              onClick={() => setChatPanelOpen((current) => !current)}
              title="Cmd/Ctrl+Shift+A"
            >
              チャット {chatPanelOpen ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>

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
            <aside className="chat-shell" aria-label="chat-panel">
              <div className="chat-body">
                <AnalysisPane
                  document={currentDocument}
                  activeParagraphId={activeParagraphId}
                  mode="structure"
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
  );
}
