import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
import { ExplorerPane } from './components/ExplorerPane.js';
import { AnalysisPane } from './components/AnalysisPane.js';
import { EditorPane } from './components/editor/index.js';
import { LeftIconRail } from './components/LeftIconRail.js';
import { ProjectSetupScreen } from './components/ProjectSetupScreen.js';
import { SettingsScreen } from './components/SettingsScreen.js';
import { useAppStore } from './store/useAppStore.js';
import { useResizablePanel } from './hooks/useResizablePanel.js';
const COMPACT_LAYOUT_BREAKPOINT = 1180;
function DoorIcon() {
    return (_jsxs("svg", { width: "18", height: "18", viewBox: "0 0 18 18", fill: "none", "aria-hidden": true, children: [_jsx("rect", { x: "2.5", y: "1.5", width: "13", height: "15", rx: "1.5", stroke: "currentColor", strokeWidth: "1.4" }), _jsx("line", { x1: "7", y1: "1.5", x2: "7", y2: "16.5", stroke: "currentColor", strokeWidth: "1.2" }), _jsx("circle", { cx: "11.5", cy: "9", r: "1.1", fill: "currentColor" })] }));
}
function WorkspaceShell() {
    const { rootPath, tree, currentFilePath, document: currentDocument, dirty, activeWorkspacePanel, editorMode, viewScale, openFolder, openEditorPanel, openSettingsPanel, createDocument, createEntry, renameEntry, deleteEntry, loadDocument, reorderParagraphs, reorderChapters, deleteChapter, syncDocumentStructure, saveNow, cycleEditorMode, setViewScale, } = useAppStore();
    const [activeParagraphId, setActiveParagraphId] = useState(null);
    const [explorerOpen, setExplorerOpen] = useState(true);
    const [chatPanelOpen, setChatPanelOpen] = useState(false);
    const [scrollRequest, setScrollRequest] = useState(null);
    const [isCompactLayout, setIsCompactLayout] = useState(() => window.innerWidth <= COMPACT_LAYOUT_BREAKPOINT);
    const explorerPanel = useResizablePanel(260, 160, 480, { disabled: isCompactLayout });
    const chatPanel = useResizablePanel(340, 240, 600, { disabled: isCompactLayout });
    useEffect(() => {
        const onResize = () => {
            setIsCompactLayout(window.innerWidth <= COMPACT_LAYOUT_BREAKPOINT);
        };
        window.addEventListener('resize', onResize);
        return () => {
            window.removeEventListener('resize', onResize);
        };
    }, []);
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
            return;
        }
        if (!activeParagraphId ||
            !currentDocument.paragraphs.some((paragraph) => paragraph.id === activeParagraphId)) {
            setActiveParagraphId(currentDocument.paragraphs[0].id);
        }
    }, [currentDocument, activeParagraphId]);
    useEffect(() => {
        const onKeyDown = (event) => {
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
    return (_jsxs("div", { className: "workspace-root", children: [_jsxs("header", { className: "global-header", children: [_jsx("div", { className: "global-header-left", children: _jsx("button", { className: explorerOpen ? 'panel-toggle is-active' : 'panel-toggle', onClick: () => setExplorerOpen((v) => !v), title: "\u30A8\u30AF\u30B9\u30D7\u30ED\u30FC\u30E9\u30FC", children: _jsx(DoorIcon, {}) }) }), _jsx("div", { className: "global-header-center", children: activeWorkspacePanel === 'settings' ? (_jsx("div", { className: "global-tab", children: "\u5206\u6790\u8A2D\u5B9A" })) : currentDocument ? (_jsx("div", { className: "global-tab", children: currentDocument.title })) : null }), _jsx("div", { className: "global-header-right", children: _jsx("button", { className: chatPanelOpen ? 'panel-toggle is-active' : 'panel-toggle', onClick: () => setChatPanelOpen((current) => !current), title: "\u30C1\u30E3\u30C3\u30C8 (Cmd/Ctrl+Shift+A)", children: _jsx(DoorIcon, {}) }) })] }), _jsxs("div", { className: "workspace-body", children: [_jsxs("div", { className: "workspace-left", children: [_jsx(LeftIconRail, { activePanel: activeWorkspacePanel, onDocumentsClick: openEditorPanel, onSettingsClick: openSettingsPanel }), explorerOpen && (_jsx(ExplorerPane, { rootPath: rootPath, tree: tree, currentFilePath: currentFilePath, style: isCompactLayout ? undefined : { width: explorerPanel.width }, onCreateEntry: (parentPath, type, name) => void createEntry(parentPath, type, name), onRenameEntry: (targetPath, nextName) => void renameEntry(targetPath, nextName), onDeleteEntry: (targetPath) => void deleteEntry(targetPath), onSelectFile: (path) => void loadDocument(path) })), explorerOpen && !isCompactLayout && (_jsx("div", { className: "panel-resizer", onMouseDown: (e) => explorerPanel.onMouseDown(e, 1) }))] }), _jsxs("main", { className: "workspace-main", children: [_jsxs("div", { className: chatPanelOpen ? 'workspace-content with-chat' : 'workspace-content no-chat', children: [activeWorkspacePanel === 'settings' ? (_jsx(SettingsScreen, {})) : (_jsx(EditorPane, { isExpanded: !chatPanelOpen, document: currentDocument, dirty: dirty, activeParagraphId: activeParagraphId, scrollRequest: scrollRequest, setActiveParagraphId: setActiveParagraphId, viewScale: viewScale, onSetViewScale: setViewScale, onSyncStructure: (input) => syncDocumentStructure(input), onReorderParagraphs: (orderedIds) => reorderParagraphs(orderedIds), onReorderChapters: (orderedIds) => reorderChapters(orderedIds), onDeleteChapter: (chapterId) => deleteChapter(chapterId), onCreateEssay: () => {
                                            if (!rootPath) {
                                                void openFolder();
                                                return;
                                            }
                                            void createDocument('Untitled', rootPath);
                                        }, onOpenFolder: () => void openFolder() })), chatPanelOpen && activeWorkspacePanel === 'editor' ? (_jsxs("aside", { className: "chat-shell", style: isCompactLayout ? undefined : { width: chatPanel.width }, "aria-label": "chat-panel", children: [!isCompactLayout ? (_jsx("div", { className: "panel-resizer panel-resizer-left", onMouseDown: (e) => chatPanel.onMouseDown(e, -1) })) : null, _jsx("div", { className: "chat-body", children: _jsx(AnalysisPane, { document: currentDocument, activeParagraphId: activeParagraphId, onSetActiveParagraphId: setActiveParagraphId, onReorderParagraphs: (orderedIds) => reorderParagraphs(orderedIds), onRequestScrollToParagraph: (paragraphId) => {
                                                        setScrollRequest({ paragraphId, nonce: Date.now() });
                                                    } }) })] })) : null] }), _jsxs("div", { className: "workspace-statusline", children: [_jsxs("span", { children: ["\u30E2\u30FC\u30C9: ", modeLabel] }), _jsxs("span", { children: ["\u8996\u70B9: ", viewScale === 'micro' ? 'ミクロ' : 'マクロ'] }), _jsx("span", { children: "Cmd/Ctrl+Shift+M \u3067\u30E2\u30FC\u30C9\u5207\u66FF" })] })] })] })] }));
}
export function App() {
    const { startupState, rootPath, openFolder, restoreLastProject, bootstrapAnalysisSettings, } = useAppStore();
    useEffect(() => {
        void bootstrapAnalysisSettings();
        void restoreLastProject();
    }, [bootstrapAnalysisSettings, restoreLastProject]);
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
        return (_jsx("div", { className: "project-launch-screen", children: _jsxs("div", { className: "project-launch-panel", children: [_jsx("p", { className: "project-launch-eyebrow", children: "LiteLizard" }), _jsx("h1", { className: "project-launch-title", children: "\u30D7\u30ED\u30B8\u30A7\u30AF\u30C8\u3092\u6E96\u5099\u3057\u3066\u3044\u307E\u3059" }), _jsx("p", { className: "project-launch-description", children: "\u524D\u56DE\u306E\u4F5C\u696D\u30D5\u30A9\u30EB\u30C0\u3092\u78BA\u8A8D\u3057\u3066\u3001\u3059\u3050\u306B\u57F7\u7B46\u3092\u518D\u958B\u3067\u304D\u308B\u72B6\u614B\u306B\u3057\u3066\u3044\u307E\u3059\u3002" })] }) }));
    }
    if (startupState === 'needs-project' && !rootPath) {
        return _jsx(ProjectSetupScreen, { onSelectFolder: () => void openFolder() });
    }
    return _jsx(WorkspaceShell, {});
}
//# sourceMappingURL=App.js.map