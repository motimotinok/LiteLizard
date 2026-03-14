import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { FileNode } from '@litelizard/shared';

interface Props {
  rootPath: string | null;
  tree: FileNode[];
  currentFilePath: string | null;
  style?: React.CSSProperties;
  onCreateEntry: (parentPath: string, type: 'file' | 'folder', name: string) => void;
  onRenameEntry: (targetPath: string, nextName: string) => void;
  onDeleteEntry: (targetPath: string) => void;
  onSelectFile: (path: string) => void;
}

interface InlineCreateState {
  parentPath: string;
  type: 'file' | 'directory';
  defaultValue: string;
}

interface TreeProps {
  nodes: FileNode[];
  currentFilePath: string | null;
  depth?: number;
  expanded: Set<string>;
  onToggle: (path: string) => void;
  onSelectFile: (path: string) => void;
  onOpenContextMenu: (event: React.MouseEvent<HTMLElement>, node: FileNode) => void;
  inlineCreate: InlineCreateState | null;
  inlineRename: string | null;
  onInlineCreateConfirm: (name: string) => void;
  onInlineCreateCancel: () => void;
  onInlineRenameConfirm: (targetPath: string, name: string) => void;
  onInlineRenameCancel: () => void;
}

interface ContextMenuState {
  x: number;
  y: number;
  targetPath: string;
  targetType: 'file' | 'directory';
}

interface InlineInputProps {
  type: 'file' | 'directory';
  depth: number;
  defaultValue: string;
  onConfirm: (name: string) => void;
  onCancel: () => void;
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

function InlineInput({ type, depth, defaultValue, onConfirm, onCancel }: InlineInputProps) {
  const ref = useRef<HTMLInputElement>(null);
  const confirmed = useRef(false);
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    ref.current?.select();
  }, []);

  const paddingLeft = depth * 14 + (type === 'directory' ? 10 : 32);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (e.nativeEvent.isComposing) return; // IME変換中は無視
      const trimmed = value.trim();
      if (trimmed) {
        confirmed.current = true;
        onConfirm(trimmed);
      }
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  const handleBlur = () => {
    setTimeout(() => {
      if (!confirmed.current) onCancel();
    }, 150);
  };

  return (
    <div className="explorer-inline-input-row" style={{ paddingLeft: `${paddingLeft}px` }}>
      <span className="explorer-node-icon" aria-hidden>
        {type === 'directory' ? <FolderIcon /> : <FileIcon />}
      </span>
      <input
        ref={ref}
        className="explorer-inline-input"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        autoFocus
      />
    </div>
  );
}

function Tree({
  nodes,
  currentFilePath,
  depth = 0,
  expanded,
  onToggle,
  onSelectFile,
  onOpenContextMenu,
  inlineCreate,
  inlineRename,
  onInlineCreateConfirm,
  onInlineCreateCancel,
  onInlineRenameConfirm,
  onInlineRenameCancel,
}: TreeProps) {
  return (
    <div className="explorer-tree-group">
      {nodes.map((node) => {
        if (node.type === 'directory') {
          if (inlineRename === node.path) {
            return (
              <InlineInput
                key={node.path}
                type="directory"
                depth={depth}
                defaultValue={baseName(node.path)}
                onConfirm={(name) => onInlineRenameConfirm(node.path, name)}
                onCancel={onInlineRenameCancel}
              />
            );
          }

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
              {isExpanded && (
                <>
                  {node.children && node.children.length > 0 && (
                    <Tree
                      nodes={node.children}
                      currentFilePath={currentFilePath}
                      depth={depth + 1}
                      expanded={expanded}
                      onToggle={onToggle}
                      onSelectFile={onSelectFile}
                      onOpenContextMenu={onOpenContextMenu}
                      inlineCreate={inlineCreate}
                      inlineRename={inlineRename}
                      onInlineCreateConfirm={onInlineCreateConfirm}
                      onInlineCreateCancel={onInlineCreateCancel}
                      onInlineRenameConfirm={onInlineRenameConfirm}
                      onInlineRenameCancel={onInlineRenameCancel}
                    />
                  )}
                  {inlineCreate?.parentPath === node.path && (
                    <InlineInput
                      type={inlineCreate.type}
                      depth={depth + 1}
                      defaultValue={inlineCreate.defaultValue}
                      onConfirm={onInlineCreateConfirm}
                      onCancel={onInlineCreateCancel}
                    />
                  )}
                </>
              )}
            </div>
          );
        }

        if (inlineRename === node.path) {
          return (
            <InlineInput
              key={node.path}
              type="file"
              depth={depth}
              defaultValue={baseName(node.path)}
              onConfirm={(name) => onInlineRenameConfirm(node.path, name)}
              onCancel={onInlineRenameCancel}
            />
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
  style,
  onCreateEntry,
  onRenameEntry,
  onDeleteEntry,
  onSelectFile,
}: Props) {
  const [expanded, setExpanded] = useState<Set<string> | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [selectedFolderPath, setSelectedFolderPath] = useState<string | null>(null);
  const [inlineCreate, setInlineCreate] = useState<InlineCreateState | null>(null);
  const [inlineRename, setInlineRename] = useState<string | null>(null);

  const defaultExpanded = useMemo(() => new Set(collectDirectoryPaths(tree)), [tree]);
  const expandedFolders = expanded ?? defaultExpanded;

  useEffect(() => {
    const close = () => setContextMenu(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, []);

  const toggleFolder = (path: string) => {
    setExpanded((current) => {
      const source = current ?? new Set(defaultExpanded);
      const next = new Set(source);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const handleFileClick = (path: string) => {
    onSelectFile(path);
  };

  // currentFilePath が変わったとき（自動展開・ファイルクリック・新規作成後）に sync
  // null になった場合（ファイル削除・フォルダ削除）はリセットして rootPath フォールバックに任せる
  useEffect(() => {
    if (currentFilePath) {
      setSelectedFolderPath(dirName(currentFilePath));
    } else {
      setSelectedFolderPath(null);
    }
  }, [currentFilePath]);

  // rootPath 変更時にリセット
  useEffect(() => {
    setSelectedFolderPath(null);
  }, [rootPath]);

  // tree 更新後にパス存在チェック → rootPath へフォールバック
  useEffect(() => {
    if (selectedFolderPath === null) return;
    const dirs = new Set(collectDirectoryPaths(tree));
    if (!dirs.has(selectedFolderPath) && selectedFolderPath !== rootPath) {
      setSelectedFolderPath(rootPath);
    }
  }, [tree, selectedFolderPath, rootPath]);

  const openInlineCreate = (parentPath: string, type: 'file' | 'folder') => {
    setExpanded((prev) => {
      const next = new Set(prev ?? defaultExpanded);
      next.add(parentPath);
      return next;
    });
    setInlineCreate({
      parentPath,
      type: type === 'folder' ? 'directory' : 'file',
      defaultValue: type === 'file' ? 'Untitled' : 'New Folder',
    });
    setContextMenu(null);
  };

  const openInlineRename = (targetPath: string) => {
    setInlineRename(targetPath);
    setContextMenu(null);
  };

  const handleInlineCreateConfirm = (name: string) => {
    if (inlineCreate) {
      const type = inlineCreate.type === 'directory' ? 'folder' : 'file';
      onCreateEntry(inlineCreate.parentPath, type, name);
    }
    setInlineCreate(null);
  };

  const handleInlineRenameConfirm = (targetPath: string, name: string) => {
    onRenameEntry(targetPath, name);
    setInlineRename(null);
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
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      targetPath: node.path,
      targetType: node.type,
    });
  };

  const canCreate = Boolean(rootPath);
  const createParent = selectedFolderPath ?? rootPath ?? '';

  return (
    <aside className="explorer-layout" style={style} data-testid="file-browser-pane">
      <div className="explorer-panel">
        <div className="explorer-panel-toolbar">
          <div className="explorer-toolbar-actions">
            <button
              className="icon-button explorer-add-btn"
              onClick={() => openInlineCreate(createParent, 'file')}
              disabled={!canCreate}
              title="新規ファイル"
              aria-label="新規ファイル"
            >
              <span className="explorer-icon-wrap"><FileIcon /><span className="explorer-add-plus">+</span></span>
            </button>
            <button
              className="icon-button explorer-add-btn"
              onClick={() => openInlineCreate(createParent, 'folder')}
              disabled={!canCreate}
              title="新規フォルダ"
              aria-label="新規フォルダ"
            >
              <span className="explorer-icon-wrap"><FolderIcon /><span className="explorer-add-plus">+</span></span>
            </button>
          </div>
        </div>

        <div
          className="explorer-tree"
          onContextMenu={(event) => event.preventDefault()}
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedFolderPath(null);
            }
          }}
        >
          <Tree
            nodes={tree}
            currentFilePath={currentFilePath}
            expanded={expandedFolders}
            onToggle={toggleFolder}
            onSelectFile={handleFileClick}
            onOpenContextMenu={onOpenContextMenu}
            inlineCreate={inlineCreate}
            inlineRename={inlineRename}
            onInlineCreateConfirm={handleInlineCreateConfirm}
            onInlineCreateCancel={() => setInlineCreate(null)}
            onInlineRenameConfirm={handleInlineRenameConfirm}
            onInlineRenameCancel={() => setInlineRename(null)}
          />
          {inlineCreate?.parentPath === rootPath && (
            <InlineInput
              type={inlineCreate.type}
              depth={0}
              defaultValue={inlineCreate.defaultValue}
              onConfirm={handleInlineCreateConfirm}
              onCancel={() => setInlineCreate(null)}
            />
          )}
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
              openInlineCreate(parentPath, 'file');
            }}
          >
            新規ファイル
          </button>
          <button
            className="menu-item"
            onClick={() => {
              const parentPath = resolveCreateParent(contextMenu);
              openInlineCreate(parentPath, 'folder');
            }}
          >
            新規フォルダ
          </button>
          <button
            className="menu-item"
            onClick={() => {
              openInlineRename(contextMenu.targetPath);
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
