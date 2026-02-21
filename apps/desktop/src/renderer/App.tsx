import React, { useEffect, useMemo, useState } from 'react';
import { ExplorerPane } from './components/ExplorerPane.js';
import { EditorPane } from './components/EditorPane.js';
import { AnalysisPane } from './components/AnalysisPane.js';
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
    analysisLayerOpen,
    openFolder,
    createDocument,
    createEntry,
    renameEntry,
    deleteEntry,
    loadDocument,
    replaceParagraphs,
    saveNow,
    setEditorMode,
    cycleEditorMode,
    toggleAnalysisLayer,
  } = useAppStore();

  const [activeParagraphId, setActiveParagraphId] = useState<string | null>(null);

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
        toggleAnalysisLayer();
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
  }, [cycleEditorMode, saveNow, toggleAnalysisLayer]);

  const canOpenAnalysis = editorMode !== 'writing';
  const showAnalysis = canOpenAnalysis && analysisLayerOpen;

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
            <div className="mode-switcher" role="tablist" aria-label="editor-mode">
              <button
                className={editorMode === 'writing' ? 'mode-pill active' : 'mode-pill'}
                onClick={() => setEditorMode('writing')}
              >
                執筆
              </button>
              <button
                className={editorMode === 'structure' ? 'mode-pill active' : 'mode-pill'}
                onClick={() => setEditorMode('structure')}
              >
                構造推敲
              </button>
              <button
                className={editorMode === 'reader' ? 'mode-pill active' : 'mode-pill'}
                onClick={() => setEditorMode('reader')}
              >
                読み手視点
              </button>
            </div>

            <button
              className={showAnalysis ? 'action-button action-button-primary' : 'action-button'}
              onClick={toggleAnalysisLayer}
              title="Cmd/Ctrl+Shift+A"
            >
              推敲モード {showAnalysis ? 'ON' : 'OFF'}
            </button>

            <button className="action-button" onClick={() => void saveNow()} disabled={!currentDocument} title="Cmd/Ctrl+S">
              保存
            </button>
          </div>
        </div>

        <div className={showAnalysis ? 'workspace-content with-analysis' : 'workspace-content'}>
          <EditorPane
            document={currentDocument}
            dirty={dirty}
            activeParagraphId={activeParagraphId}
            setActiveParagraphId={setActiveParagraphId}
            onSyncParagraphs={(texts) => replaceParagraphs(texts)}
            onCreateEssay={() => {
              if (!rootPath) {
                void openFolder();
                return;
              }
              void createDocument('Untitled', rootPath);
            }}
            onOpenFolder={() => void openFolder()}
          />

          {showAnalysis ? (
            <AnalysisPane
              document={currentDocument}
              activeParagraphId={activeParagraphId}
              mode={editorMode === 'reader' ? 'reader' : 'structure'}
            />
          ) : null}
        </div>

        <div className="workspace-statusline">
          <span>モード: {modeLabel}</span>
          <span>Cmd/Ctrl+Shift+M でモード切替</span>
        </div>
      </main>
    </div>
  );
}
