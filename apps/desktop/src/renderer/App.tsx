import React, { useEffect, useMemo, useState } from 'react';
import { ExplorerPane } from './components/ExplorerPane.js';
import { EditorPane } from './components/EditorPane.js';
import { AnalysisPane } from './components/AnalysisPane.js';
import { useAppStore } from './store/useAppStore.js';

function useIsNarrowLayout(breakpoint = 1100) {
  const [isNarrow, setIsNarrow] = useState(() => window.innerWidth < breakpoint);

  useEffect(() => {
    const onResize = () => {
      setIsNarrow(window.innerWidth < breakpoint);
    };

    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
    };
  }, [breakpoint]);

  return isNarrow;
}

export function App() {
  const {
    rootPath,
    tree,
    currentFilePath,
    document: currentDocument,
    dirty,
    statusMessage,
    openFolder,
    createFolder,
    createDocument,
    loadDocument,
    replaceParagraphs,
    runAnalysis,
    saveNow,
    bootstrapApiKeyStatus,
  } = useAppStore();

  const [activeParagraphId, setActiveParagraphId] = useState<string | null>(null);
  const [splitPercent, setSplitPercent] = useState(50);
  const [resizing, setResizing] = useState(false);
  const isNarrowLayout = useIsNarrowLayout(1100);

  useEffect(() => {
    void bootstrapApiKeyStatus();
  }, [bootstrapApiKeyStatus]);

  useEffect(() => {
    if (!dirty || !currentDocument || !currentFilePath) {
      return;
    }

    const handle = window.setTimeout(() => {
      void saveNow();
    }, 3000);

    return () => {
      window.clearTimeout(handle);
    };
  }, [dirty, currentDocument, currentFilePath, saveNow]);

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

  const staleCount = useMemo(
    () =>
      currentDocument
        ? currentDocument.paragraphs.filter((paragraph) => paragraph.lizard.status === 'stale').length
        : 0,
    [currentDocument],
  );

  useEffect(() => {
    if (!resizing) {
      return;
    }

    const onMove = (event: globalThis.MouseEvent) => {
      const content = window.document.querySelector('.workspace-split-layout');
      if (!content) {
        return;
      }
      const rect = content.getBoundingClientRect();
      if (isNarrowLayout) {
        const y = event.clientY - rect.top;
        const percent = (y / rect.height) * 100;
        setSplitPercent(Math.min(70, Math.max(30, percent)));
      } else {
        const x = event.clientX - rect.left;
        const percent = (x / rect.width) * 100;
        setSplitPercent(Math.min(70, Math.max(30, percent)));
      }
    };

    const onUp = () => {
      setResizing(false);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [resizing, isNarrowLayout]);

  return (
    <div className="workspace-root">
      <ExplorerPane
        rootPath={rootPath}
        tree={tree}
        currentFilePath={currentFilePath}
        onOpenFolder={() => void openFolder()}
        onCreateFolder={(name) => void createFolder(name)}
        onCreateDocument={(title) => void createDocument(title)}
        onSelectFile={(path) => void loadDocument(path)}
      />

      <main className="workspace-main">
        <div className="workspace-toolbar">
          <div className="workspace-toolbar-left">
            <span className="toolbar-badge">{dirty ? '未保存の変更あり' : '保存済み'}</span>
            <span className="toolbar-text">{statusMessage}</span>
          </div>
          <div className="workspace-toolbar-right">
            <span className="toolbar-meta">再解析待ち: {staleCount}</span>
            <button className="action-button" onClick={() => void saveNow()} disabled={!currentDocument}>
              今すぐ保存
            </button>
            <button
              className="action-button action-button-primary"
              onClick={() => void runAnalysis()}
              disabled={!currentDocument}
            >
              全体解析を実行
            </button>
          </div>
        </div>

        <div className="workspace-content">
          <div className={isNarrowLayout ? 'workspace-split-layout vertical' : 'workspace-split-layout'}>
            <div className="split-panel" style={{ flexBasis: `${splitPercent}%` }}>
              <EditorPane
                document={currentDocument}
                dirty={dirty}
                activeParagraphId={activeParagraphId}
                setActiveParagraphId={setActiveParagraphId}
                onSyncParagraphs={(texts) => replaceParagraphs(texts)}
              />
            </div>
            <div
              className={isNarrowLayout ? 'resize-handle resize-handle-row' : 'resize-handle'}
              onMouseDown={() => setResizing(true)}
              role="separator"
              aria-orientation={isNarrowLayout ? 'horizontal' : 'vertical'}
              tabIndex={0}
            />
            <div className="split-panel" style={{ flexBasis: `${100 - splitPercent}%` }}>
              <AnalysisPane
                document={currentDocument}
                activeParagraphId={activeParagraphId}
                onRunAnalysis={() => void runAnalysis()}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
