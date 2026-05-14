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
  const [scrollRequest, setScrollRequest] = useState<{ paragraphId: string; nonce: number } | null>(null);

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

    if (
      !activeParagraphId ||
      !currentDocument.paragraphs.some((paragraph) => paragraph.id === activeParagraphId)
    ) {
      setActiveParagraphId(currentDocument.paragraphs[0].id);
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
  const showAnalysisPanel = analysisPanelOpen && Boolean(currentDocument);
  const analysisPanelMode = analysisSettings.editorTweaks.analysisPanelMode;
  const workspaceMainClass = [
    showAnalysisPanel ? 'workspace-main with-panel' : 'workspace-main',
    showAnalysisPanel && analysisPanelMode === 'overlay' ? 'analysis-overlay-mode' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="workspace-root" style={getEditorTweaksStyle(analysisSettings.editorTweaks)}>
      <LeftIconRail
        activePanel="editor"
        onSelectPanel={(panel) => {
          if (panel === 'editor') openEditorPanel();
          else if (panel === 'settings') openSettingsPanel();
          else if (panel === 'agents') openAgentsPanel();
          else if (panel === 'search') openSearchPanel();
        }}
      />
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
      </aside>

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

        {showAnalysisPanel ? (
          <AnalysisPane
            document={currentDocument}
            activeParagraphId={activeParagraphId}
            linkedHighlightParagraphId={linkedHighlightParagraphId}
            onSetActiveParagraphId={setActiveParagraphId}
            onPreviewParagraphLink={setLinkedHighlightParagraphId}
            onReorderParagraphs={(orderedIds) => reorderParagraphs(orderedIds)}
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
    recentProjects,
    openRecentProject,
    removeRecentProject,
    statusMessage,
  } = useAppStore();

  useEffect(() => {
    void bootstrapAnalysisSettings();
    void loadAgents();
    void restoreLastProject();
  }, [bootstrapAnalysisSettings, loadAgents, restoreLastProject]);

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
