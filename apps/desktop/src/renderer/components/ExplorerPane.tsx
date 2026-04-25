import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { FileNode } from '@litelizard/shared';
import {
  IconChevronDown,
  IconChevronRight,
  IconFile,
  IconFolder,
  IconImport,
  IconNewFile,
  IconNewFolder,
} from './ui/icons.js';

interface Props {
  rootPath: string | null;
  tree: FileNode[];
  currentFilePath: string | null;
  onCreateEntry: (parentPath: string, type: 'file' | 'folder', name: string) => void;
  onRenameEntry: (targetPath: string, nextName: string) => void;
  onDeleteEntry: (targetPath: string) => void;
  onSelectFile: (path: string) => void;
  onImportTextFile: (createParent: string) => void;
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

function displayName(node: FileNode) {
  if (node.type === 'file') {
    return node.name.replace(/\.lzl$/i, '');
  }
  return node.name;
}

function countFiles(nodes: FileNode[]): number {
  let total = 0;
  for (const node of nodes) {
    if (node.type === 'file') {
      total += 1;
    } else if (node.children) {
      total += countFiles(node.children);
    }
  }
  return total;
}

function InlineInput({ type, depth, defaultValue, onConfirm, onCancel }: InlineInputProps) {
  const ref = useRef<HTMLInputElement>(null);
  const confirmed = useRef(false);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    ref.current?.select();
    return () => {
      if (blurTimer.current !== null) clearTimeout(blurTimer.current);
    };
  }, []);

  const paddingLeft = depth * 14 + (type === 'directory' ? 10 : 32);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (e.nativeEvent.isComposing) return;
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
    blurTimer.current = setTimeout(() => {
      if (!confirmed.current) onCancel();
    }, 150);
  };

  return (
    <div className="explorer-inline-input-row" style={{ paddingLeft: `${paddingLeft}px` }}>
      <span className="explorer-node-icon" aria-hidden>
        {type === 'directory' ? <IconFolder size={13} /> : <IconFile size={13} />}
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
                type="button"
                className="explorer-tree-item"
                style={{ paddingLeft: `${depth * 14 + 8}px` }}
                onClick={() => onToggle(node.path)}
                onContextMenu={(event) => onOpenContextMenu(event, node)}
              >
                <span className="explorer-chevron" aria-hidden>
                  {isExpanded ? <IconChevronDown size={11} /> : <IconChevronRight size={11} />}
                </span>
                <span className="explorer-node-icon" aria-hidden>
                  <IconFolder size={13} />
                </span>
                <span className="explorer-node-label">{displayName(node)}</span>
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
            type="button"
            className={
              isSelected
                ? 'explorer-tree-item explorer-tree-item-file active'
                : 'explorer-tree-item explorer-tree-item-file'
            }
            style={{ paddingLeft: `${depth * 14 + 26}px` }}
            onClick={() => onSelectFile(node.path)}
            onContextMenu={(event) => onOpenContextMenu(event, node)}
          >
            <span className="explorer-node-icon" aria-hidden>
              <IconFile size={13} />
            </span>
            <span className="explorer-node-label">{displayName(node)}</span>
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
  onCreateEntry,
  onRenameEntry,
  onDeleteEntry,
  onSelectFile,
  onImportTextFile,
}: Props) {
  const [expanded, setExpanded] = useState<Set<string> | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [selectedFolderPath, setSelectedFolderPath] = useState<string | null>(null);
  const [inlineCreate, setInlineCreate] = useState<InlineCreateState | null>(null);
  const [inlineRename, setInlineRename] = useState<string | null>(null);

  const defaultExpanded = useMemo(() => new Set(collectDirectoryPaths(tree)), [tree]);
  const expandedFolders = expanded ?? defaultExpanded;
  const fileCount = useMemo(() => countFiles(tree), [tree]);
  const rootName = useMemo(() => (rootPath ? baseName(rootPath) : null), [rootPath]);

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

  useEffect(() => {
    if (currentFilePath) {
      setSelectedFolderPath(dirName(currentFilePath));
    } else {
      setSelectedFolderPath(null);
    }
  }, [currentFilePath]);

  useEffect(() => {
    setSelectedFolderPath(null);
  }, [rootPath]);

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
    <>
      <div className="explorer-layout" data-testid="file-browser-pane">
        <div className="sidebar-section-header">
          <span className="sidebar-section-label">Workspace</span>
          <div className="sidebar-section-actions">
            <button
              type="button"
              className="sidebar-icon-button"
              onClick={() => openInlineCreate(createParent, 'file')}
              disabled={!canCreate}
              title="新規ファイル"
              aria-label="新規ファイル"
            >
              <IconNewFile size={13} />
            </button>
            <button
              type="button"
              className="sidebar-icon-button"
              onClick={() => openInlineCreate(createParent, 'folder')}
              disabled={!canCreate}
              title="新規フォルダ"
              aria-label="新規フォルダ"
            >
              <IconNewFolder size={13} />
            </button>
            <button
              type="button"
              className="sidebar-icon-button"
              onClick={() => onImportTextFile(createParent)}
              disabled={!canCreate}
              title="テキストをインポート"
              aria-label="テキストをインポート"
            >
              <IconImport size={13} />
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
          {tree.length === 0 && !inlineCreate ? (
            <div className="explorer-tree-empty">
              {rootPath ? 'ファイルがありません' : 'フォルダが開かれていません'}
            </div>
          ) : null}
          <Tree
            nodes={tree}
            currentFilePath={currentFilePath}
            expanded={expandedFolders}
            onToggle={toggleFolder}
            onSelectFile={onSelectFile}
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

        {rootPath ? (
          <div className="sidebar-footer-meta">
            <span>{rootName}</span>
            <span>{fileCount} files</span>
          </div>
        ) : null}
      </div>

      {contextMenu ? (
        <div
          className="context-menu"
          style={{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px` }}
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            className="menu-item"
            onClick={() => {
              const parentPath = resolveCreateParent(contextMenu);
              openInlineCreate(parentPath, 'file');
            }}
          >
            新規ファイル
          </button>
          <button
            type="button"
            className="menu-item"
            onClick={() => {
              const parentPath = resolveCreateParent(contextMenu);
              openInlineCreate(parentPath, 'folder');
            }}
          >
            新規フォルダ
          </button>
          <button
            type="button"
            className="menu-item"
            onClick={() => {
              const parentPath = resolveCreateParent(contextMenu);
              onImportTextFile(parentPath);
              setContextMenu(null);
            }}
          >
            テキストをインポート
          </button>
          <button
            type="button"
            className="menu-item"
            onClick={() => {
              openInlineRename(contextMenu.targetPath);
            }}
          >
            リネーム
          </button>
          <button
            type="button"
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
    </>
  );
}
