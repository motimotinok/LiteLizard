import React, { type CSSProperties, useEffect, useState } from 'react';
import type { EditorTweaks } from '@litelizard/shared';
import { ExplorerPane } from './components/ExplorerPane.js';
import { AnalysisPane } from './components/AnalysisPane.js';
import { EditorPane } from './components/editor/index.js';
import { LeftIconRail } from './components/LeftIconRail.js';
import { ProjectSetupScreen } from './components/ProjectSetupScreen.js';
import { SettingsScreen } from './components/SettingsScreen.js';
import { AgentsScreen } from './components/AgentsScreen.js';
import { SearchScreen } from './components/SearchScreen.js';
import { useAppStore } from './store/useAppStore.js';
import { IconExport, IconPanel } from './components/ui/icons.js';
import { useResizablePanel } from './hooks/useResizablePanel.js';

function clampNumber(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getEditorTweaksStyle(editorTweaks: EditorTweaks): CSSProperties {
  const paperWarmth = clampNumber(editorTweaks.paperWarmth, 0, 100) / 100;
  const lightness = 99 - paperWarmth * 2.5;
  const chroma = 0.004 + paperWarmth * 0.021;
  const hue = 96 - paperWarmth * 14;

  return {
    '--editor-typeface': editorTweaks.typeface === 'sans' ? 'var(--sans)' : 'var(--serif)',
    '--editor-body-font-size': `${clampNumber(editorTweaks.bodyFontSize, 15, 22)}px`,
    '--editor-line-height': String(clampNumber(editorTweaks.lineHeight, 1.4, 2.4)),
    '--editor-paper': `oklch(${lightness.toFixed(2)}% ${chroma.toFixed(3)} ${hue.toFixed(1)})`,
  } as CSSProperties;
}

function WorkspaceShell() {
  const {
    rootPath,
    tree,
    currentFilePath,
    document: currentDocument,
    dirty,
    activeWorkspacePanel,
    pendingParagraphNavigation,
    viewScale,
    analysisSettings,
    openFolder,
    openEditorPanel,
    openSettingsPanel,
    openAgentsPanel,
    openSearchPanel,
    consumePendingParagraphNavigation,
    createDocument,
    createEntry,
    renameEntry,
    moveEntry,
    deleteEntry,
    importTextFile,
    exportCurrentDocumentText,
    loadDocument,
    reorderParagraphs,
    reorderChapters,
    deleteChapter,
    syncDocumentStructure,
    saveNow,
    setViewScale,
  } = useAppStore();

  const [activeParagraphId, setActiveParagraphId] = useState<string | null>(null);
  const [linkedHighlightParagraphId, setLinkedHighlightParagraphId] = useState<string | null>(null);
  const [analysisPanelOpen, setAnalysisPanelOpen] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [scrollRequest, setScrollRequest] = useState<{ paragraphId: string; nonce: number } | null>(null);
  // #120: panel widths are session-local for now. Persisting them would expand the settings/userData contract.
  const sidebarPanel = useResizablePanel(232, 180, 360);
  const analysisPanel = useResizablePanel(380, 280, 560, {
    disabled: analysisSettings.editorTweaks.analysisPanelMode === 'overlay',
  });

  useEffect(() => {
    if (!dirty || !currentDocument || !currentFilePath) {
      return;
    }

    const handle = window.setTimeout(() => {
      void saveNow();
    }, 300);

    return () => {
      window.clearTimeout(handle);
    };
  }, [dirty, currentDocument, currentFilePath, saveNow]);

  useEffect(() => {
    if (!currentDocument?.paragraphs.length) {
      setActiveParagraphId(null);
      setLinkedHighlightParagraphId(null);
      return;
    }

    if (activeParagraphId && !currentDocument.paragraphs.some((paragraph) => paragraph.id === activeParagraphId)) {
      setActiveParagraphId(null);
    }

    if (
      linkedHighlightParagraphId &&
      !currentDocument.paragraphs.some((paragraph) => paragraph.id === linkedHighlightParagraphId)
    ) {
      setLinkedHighlightParagraphId(null);
    }
  }, [currentDocument, activeParagraphId, linkedHighlightParagraphId]);

  useEffect(() => {
    if (!pendingParagraphNavigation) {
      return;
    }

    const paragraphExists = currentDocument?.paragraphs.some(
      (paragraph) => paragraph.id === pendingParagraphNavigation.paragraphId,
    );
    if (paragraphExists) {
      setActiveParagraphId(pendingParagraphNavigation.paragraphId);
      setScrollRequest(pendingParagraphNavigation);
    }
    consumePendingParagraphNavigation();
  }, [consumePendingParagraphNavigation, currentDocument, pendingParagraphNavigation]);

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
        setAnalysisPanelOpen((current) => !current);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [saveNow]);

  if (activeWorkspacePanel === 'settings') {
    return <SettingsScreen />;
  }

  if (activeWorkspacePanel === 'agents') {
    return <AgentsScreen />;
  }

  if (activeWorkspacePanel === 'search') {
    return <SearchScreen />;
  }

  const titleText = currentDocument?.title ?? null;
  const statusLabel = currentDocument ? (dirty ? '下書き' : '保存済み') : null;
  const showAnalysisRail = analysisPanelOpen && Boolean(currentDocument) && viewScale === 'micro';
  const showAnalysisPanel = analysisPanelOpen && Boolean(currentDocument && activeParagraphId);
  const analysisPanelMode = analysisSettings.editorTweaks.analysisPanelMode;
  const workspaceMainClass = [
    showAnalysisPanel ? 'workspace-main with-panel' : 'workspace-main',
    showAnalysisPanel && analysisPanelMode === 'overlay' ? 'analysis-overlay-mode' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const workspaceStyle = {
    ...getEditorTweaksStyle(analysisSettings.editorTweaks),
    '--sidebar-width': `${sidebarPanel.width}px`,
    '--panel-width': `${analysisPanel.width}px`,
  } as CSSProperties;

  return (
    <div className={sidebarOpen ? 'workspace-root' : 'workspace-root sidebar-collapsed'} style={workspaceStyle}>
      <LeftIconRail
        activePanel="editor"
        editorPanelExpanded={sidebarOpen}
        onSelectPanel={(panel) => {
          if (panel === 'editor') {
            openEditorPanel();
            setSidebarOpen((current) => !current);
          } else if (panel === 'settings') openSettingsPanel();
          else if (panel === 'agents') openAgentsPanel();
          else if (panel === 'search') openSearchPanel();
        }}
      />
      {sidebarOpen ? (
        <aside className="workspace-sidebar">
          <ExplorerPane
            rootPath={rootPath}
            tree={tree}
            currentFilePath={currentFilePath}
            onCreateEntry={(parentPath, type, name) => void createEntry(parentPath, type, name)}
            onRenameEntry={(targetPath, nextName) => void renameEntry(targetPath, nextName)}
            onMoveEntry={(sourcePath, destinationFolderPath) => void moveEntry(sourcePath, destinationFolderPath)}
            onDeleteEntry={(targetPath) => void deleteEntry(targetPath)}
            onSelectFile={(path) => void loadDocument(path)}
            onImportTextFile={(createParent) => void importTextFile(createParent)}
          />
          <div
            className="panel-resizer panel-resizer-sidebar"
            role="separator"
            aria-label="ファイルパネル幅を調整"
            aria-orientation="vertical"
            title="ファイルパネル幅を調整"
            onMouseDown={(event) => sidebarPanel.onMouseDown(event, 1)}
          />
        </aside>
      ) : null}

      <main className={workspaceMainClass}>
        <div className="workspace-titlebar">
          <span className="workspace-titlebar-spacer" />
          <div className="workspace-titlebar-center">
            {titleText ? (
              <>
                <span>{titleText}</span>
                {statusLabel ? (
                  <>
                    <span className="titlebar-divider">—</span>
                    <span className="titlebar-status">{statusLabel}</span>
                  </>
                ) : null}
              </>
            ) : null}
          </div>
          <div className="workspace-titlebar-actions">
            {currentDocument ? (
              <button
                type="button"
                className="titlebar-icon-button"
                onClick={() => void exportCurrentDocumentText()}
                title="テキストを書き出す"
                aria-label="テキストを書き出す"
              >
                <IconExport size={15} />
              </button>
            ) : null}
            {currentDocument ? (
              <button
                type="button"
                className={
                  analysisPanelOpen ? 'titlebar-icon-button is-active' : 'titlebar-icon-button'
                }
                onClick={() => setAnalysisPanelOpen((value) => !value)}
                title={analysisPanelOpen ? '分析パネルを閉じる' : '分析パネルを開く'}
                aria-label="分析パネルを切り替え"
              >
                <IconPanel size={15} />
              </button>
            ) : null}
          </div>
        </div>

        <EditorPane
          isExpanded
          document={currentDocument}
          dirty={dirty}
          activeParagraphId={activeParagraphId}
          linkedHighlightParagraphId={linkedHighlightParagraphId}
          scrollRequest={scrollRequest}
          setActiveParagraphId={setActiveParagraphId}
          onPreviewParagraphLink={setLinkedHighlightParagraphId}
          analysisRailVisible={showAnalysisRail}
          onSelectAnalysisRailParagraph={(paragraphId) => {
            setActiveParagraphId(paragraphId);
            setScrollRequest({ paragraphId, nonce: Date.now() });
          }}
          viewScale={viewScale}
          onSetViewScale={setViewScale}
          onSyncStructure={(input) => syncDocumentStructure(input)}
          onReorderParagraphs={(orderedIds) => reorderParagraphs(orderedIds)}
          onReorderChapters={(orderedIds) => reorderChapters(orderedIds)}
          onDeleteChapter={(chapterId) => deleteChapter(chapterId)}
          onCreateEssay={() => {
            if (!rootPath) {
              void openFolder();
              return;
            }
            void createDocument('Untitled', rootPath);
          }}
          onOpenFolder={() => void openFolder()}
        />

        {showAnalysisPanel && analysisPanelMode === 'side' ? (
          <div
            className="panel-resizer panel-resizer-analysis"
            role="separator"
            aria-label="分析パネル幅を調整"
            aria-orientation="vertical"
            title="分析パネル幅を調整"
            onMouseDown={(event) => analysisPanel.onMouseDown(event, -1)}
          />
        ) : null}
        {showAnalysisPanel ? (
          <AnalysisPane
            document={currentDocument}
            activeParagraphId={activeParagraphId}
            onSetActiveParagraphId={setActiveParagraphId}
            onRequestScrollToParagraph={(paragraphId) => {
              setScrollRequest({ paragraphId, nonce: Date.now() });
            }}
          />
        ) : null}
      </main>
    </div>
  );
}

export function App() {
  const {
    startupState,
    rootPath,
    openFolder,
    restoreLastProject,
    bootstrapAnalysisSettings,
    loadAgents,
    loadAppVersion,
    checkForUpdates,
    recentProjects,
    openRecentProject,
    removeRecentProject,
    statusMessage,
  } = useAppStore();

  useEffect(() => {
    void bootstrapAnalysisSettings();
    void loadAgents();
    void restoreLastProject();
    void loadAppVersion();
    void checkForUpdates();
  }, [bootstrapAnalysisSettings, loadAgents, restoreLastProject, loadAppVersion, checkForUpdates]);

  useEffect(() => {
    if (!window.litelizard) {
      return;
    }

    const unsubscribe = window.litelizard.onRequestOpenFolder(() => {
      void openFolder();
    });

    return unsubscribe;
  }, [openFolder]);

  if (startupState === 'loading') {
    return (
      <div className="project-launch-screen">
        <div className="project-launch-panel">
          <p className="project-launch-eyebrow">LiteLizard</p>
          <h1 className="project-launch-title">準備中</h1>
          <div className="project-launch-rule" />
          <p className="project-launch-description">
            {statusMessage || '前回の作業フォルダを確認しています。'}
          </p>
        </div>
      </div>
    );
  }

  if (startupState === 'needs-project' && !rootPath) {
    return (
      <ProjectSetupScreen
        onSelectFolder={() => void openFolder()}
        recentProjects={recentProjects}
        onOpenRecent={(folderPath) => void openRecentProject(folderPath)}
        onRemoveRecent={(folderPath) => void removeRecentProject(folderPath)}
      />
    );
  }

  return <WorkspaceShell />;
}
