import React, { useEffect, useMemo, useState } from 'react';
import type { FileNode } from '@litelizard/shared';

interface Props {
  rootPath: string | null;
  tree: FileNode[];
  currentFilePath: string | null;
  onOpenFolder: () => void;
  onCreateEntry: (parentPath: string, type: 'file' | 'folder', name: string) => void;
  onRenameEntry: (targetPath: string, nextName: string) => void;
  onDeleteEntry: (targetPath: string) => void;
  onSelectFile: (path: string) => void;
}

interface TreeProps {
  nodes: FileNode[];
  currentFilePath: string | null;
  depth?: number;
  expanded: Set<string>;
  onToggle: (path: string) => void;
  onSelectFile: (path: string) => void;
  onOpenContextMenu: (event: React.MouseEvent<HTMLElement>, node: FileNode) => void;
}

interface ContextMenuState {
  x: number;
  y: number;
  targetPath: string;
  targetType: 'file' | 'directory';
}

function DocumentIcon() {
  return (
    <svg viewBox="0 0 24 24" width={18} height={18} aria-hidden>
      <path
        d="M7 3h7l5 5v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Zm6 1.5V9h4.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M9 13.2h6M9 16.7h6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg viewBox="0 0 24 24" width={16} height={16} aria-hidden>
      <path
        d="M3.5 7.5a2 2 0 0 1 2-2h4l1.6 1.8h7.4a2 2 0 0 1 2 2v7.2a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2V7.5Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg viewBox="0 0 24 24" width={16} height={16} aria-hidden>
      <path
        d="M7 3.5h7l4.5 4.5v11a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 5.5 19V5A1.5 1.5 0 0 1 7 3.5Zm6 1.8V9h3.7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function baseName(targetPath: string) {
  const normalized = targetPath.replace(/\\/g, '/');
  const parts = normalized.split('/');
  return parts[parts.length - 1] ?? targetPath;
}

function dirName(targetPath: string) {
  const slash = Math.max(targetPath.lastIndexOf('/'), targetPath.lastIndexOf('\\'));
  if (slash < 0) {
    return targetPath;
  }
  return targetPath.slice(0, slash);
}

function Tree({
  nodes,
  currentFilePath,
  depth = 0,
  expanded,
  onToggle,
  onSelectFile,
  onOpenContextMenu,
}: TreeProps) {
  return (
    <div className="explorer-tree-group">
      {nodes.map((node) => {
        if (node.type === 'directory') {
          const isExpanded = expanded.has(node.path);
          return (
            <div key={node.path}>
              <button
                className="explorer-tree-item explorer-tree-item-folder"
                style={{ paddingLeft: `${depth * 14 + 10}px` }}
                onClick={() => onToggle(node.path)}
                onContextMenu={(event) => onOpenContextMenu(event, node)}
              >
                <span className="explorer-chevron">{isExpanded ? '▾' : '▸'}</span>
                <span className="explorer-node-icon" aria-hidden>
                  <FolderIcon />
                </span>
                <span className="explorer-node-label">{node.name}</span>
              </button>
              {isExpanded && node.children && node.children.length > 0 ? (
                <Tree
                  nodes={node.children}
                  currentFilePath={currentFilePath}
                  depth={depth + 1}
                  expanded={expanded}
                  onToggle={onToggle}
                  onSelectFile={onSelectFile}
                  onOpenContextMenu={onOpenContextMenu}
                />
              ) : null}
            </div>
          );
        }

        const isSelected = node.path === currentFilePath;
        return (
          <button
            key={node.path}
            className={
              isSelected
                ? 'explorer-tree-item explorer-tree-item-file active'
                : 'explorer-tree-item explorer-tree-item-file'
            }
            style={{ paddingLeft: `${depth * 14 + 32}px` }}
            onClick={() => onSelectFile(node.path)}
            onContextMenu={(event) => onOpenContextMenu(event, node)}
          >
            <span className="explorer-node-icon" aria-hidden>
              <FileIcon />
            </span>
            <span className="explorer-node-label">{node.name}</span>
          </button>
        );
      })}
    </div>
  );
}

function collectDirectoryPaths(nodes: FileNode[]) {
  const paths: string[] = [];
  for (const node of nodes) {
    if (node.type === 'directory') {
      paths.push(node.path);
      if (node.children && node.children.length > 0) {
        paths.push(...collectDirectoryPaths(node.children));
      }
    }
  }
  return paths;
}

export function ExplorerPane({
  rootPath,
  tree,
  currentFilePath,
  onOpenFolder,
  onCreateEntry,
  onRenameEntry,
  onDeleteEntry,
  onSelectFile,
}: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);

  const defaultExpanded = useMemo(() => new Set(collectDirectoryPaths(tree)), [tree]);
  const expandedFolders = expanded.size > 0 ? expanded : defaultExpanded;

  useEffect(() => {
    const close = () => {
      setContextMenu(null);
      setQuickCreateOpen(false);
    };

    window.addEventListener('click', close);
    return () => {
      window.removeEventListener('click', close);
    };
  }, []);

  const toggleFolder = (path: string) => {
    setExpanded((current) => {
      const source = current.size > 0 ? current : new Set(defaultExpanded);
      const next = new Set(source);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const openCreatePrompt = (parentPath: string, type: 'file' | 'folder') => {
    const message = type === 'file' ? '新規ファイル名' : '新規フォルダ名';
    const fallback = type === 'file' ? 'Untitled' : 'New Folder';
    const name = window.prompt(message, fallback)?.trim();
    if (!name) {
      return;
    }
    onCreateEntry(parentPath, type, name);
  };

  const openRenamePrompt = (targetPath: string) => {
    const name = window.prompt('新しい名前', baseName(targetPath))?.trim();
    if (!name) {
      return;
    }
    onRenameEntry(targetPath, name);
  };

  const runDelete = (targetPath: string) => {
    if (!window.confirm('削除しますか？')) {
      return;
    }
    onDeleteEntry(targetPath);
  };

  const resolveCreateParent = (menu: ContextMenuState) => {
    if (menu.targetType === 'directory') {
      return menu.targetPath;
    }
    return dirName(menu.targetPath);
  };

  const onOpenContextMenu = (event: React.MouseEvent<HTMLElement>, node: FileNode) => {
    event.preventDefault();
    setQuickCreateOpen(false);
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      targetPath: node.path,
      targetType: node.type,
    });
  };

  const canCreate = Boolean(rootPath);

  return (
    <aside className="explorer-layout" data-testid="file-browser-pane">
      <div className="explorer-panel">
        <div className="explorer-header">
          <div className="explorer-title-row">
            <div className="explorer-title-wrap" data-testid="explorer-brand">
              <span className="explorer-brand-icon" aria-hidden>
                <DocumentIcon />
              </span>
              <div className="explorer-title">LiteLizard</div>
            </div>
            <div className="explorer-header-actions">
              <button className="icon-button" onClick={onOpenFolder} title="フォルダを開く">
                <FolderIcon />
              </button>
              <div className="explorer-plus-wrap">
                <button
                  className="icon-button"
                  onClick={(event) => {
                    event.stopPropagation();
                    setContextMenu(null);
                    setQuickCreateOpen((value) => !value);
                  }}
                  disabled={!canCreate}
                  title="新規作成"
                >
                  ＋
                </button>

                {quickCreateOpen && rootPath ? (
                  <div className="explorer-popover" onClick={(event) => event.stopPropagation()}>
                    <button
                      className="menu-item"
                      onClick={() => {
                        openCreatePrompt(rootPath, 'file');
                        setQuickCreateOpen(false);
                      }}
                    >
                      新規ファイル
                    </button>
                    <button
                      className="menu-item"
                      onClick={() => {
                        openCreatePrompt(rootPath, 'folder');
                        setQuickCreateOpen(false);
                      }}
                    >
                      新規フォルダ
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <div className="explorer-tree" onContextMenu={(event) => event.preventDefault()}>
          <Tree
            nodes={tree}
            currentFilePath={currentFilePath}
            expanded={expandedFolders}
            onToggle={toggleFolder}
            onSelectFile={onSelectFile}
            onOpenContextMenu={onOpenContextMenu}
          />
        </div>
      </div>

      {contextMenu ? (
        <div
          className="context-menu"
          style={{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px` }}
          onClick={(event) => event.stopPropagation()}
        >
          <button
            className="menu-item"
            onClick={() => {
              const parentPath = resolveCreateParent(contextMenu);
              openCreatePrompt(parentPath, 'file');
              setContextMenu(null);
            }}
          >
            新規ファイル
          </button>
          <button
            className="menu-item"
            onClick={() => {
              const parentPath = resolveCreateParent(contextMenu);
              openCreatePrompt(parentPath, 'folder');
              setContextMenu(null);
            }}
          >
            新規フォルダ
          </button>
          <button
            className="menu-item"
            onClick={() => {
              openRenamePrompt(contextMenu.targetPath);
              setContextMenu(null);
            }}
          >
            リネーム
          </button>
          <button
            className="menu-item menu-item-danger"
            onClick={() => {
              runDelete(contextMenu.targetPath);
              setContextMenu(null);
            }}
          >
            削除
          </button>
        </div>
      ) : null}
    </aside>
  );
}
