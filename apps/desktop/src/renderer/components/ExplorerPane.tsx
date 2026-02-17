import React, { useMemo, useState } from 'react';
import type { FileNode } from '@litelizard/shared';

interface Props {
  rootPath: string | null;
  tree: FileNode[];
  currentFilePath: string | null;
  onOpenFolder: () => void;
  onCreateFolder: (name: string) => void;
  onCreateDocument: (title: string) => void;
  onSelectFile: (path: string) => void;
}

interface TreeProps {
  nodes: FileNode[];
  currentFilePath: string | null;
  depth?: number;
  expanded: Set<string>;
  onToggle: (path: string) => void;
  onSelectFile: (path: string) => void;
}

function Tree({ nodes, currentFilePath, depth = 0, expanded, onToggle, onSelectFile }: TreeProps) {
  return (
    <div className="explorer-tree-group">
      {nodes.map((node) => {
        if (node.type === 'directory') {
          const isExpanded = expanded.has(node.path);
          return (
            <div key={node.path}>
              <button
                className="explorer-tree-item explorer-tree-item-folder"
                style={{ paddingLeft: `${depth * 12 + 8}px` }}
                onClick={() => onToggle(node.path)}
              >
                <span className="explorer-chevron">{isExpanded ? '▾' : '▸'}</span>
                <span className="explorer-node-icon">D</span>
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
                />
              ) : null}
            </div>
          );
        }

        const isSelected = node.path === currentFilePath;
        return (
          <button
            key={node.path}
            className={isSelected ? 'explorer-tree-item explorer-tree-item-file active' : 'explorer-tree-item explorer-tree-item-file'}
            style={{ paddingLeft: `${depth * 12 + 28}px` }}
            onClick={() => onSelectFile(node.path)}
          >
            <span className="explorer-node-icon">F</span>
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
  onCreateFolder,
  onCreateDocument,
  onSelectFile,
}: Props) {
  const [newDocTitle, setNewDocTitle] = useState('Untitled');
  const [newFolderName, setNewFolderName] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const defaultExpanded = useMemo(() => new Set(collectDirectoryPaths(tree)), [tree]);

  const expandedFolders = expanded.size > 0 ? expanded : defaultExpanded;

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

  const createFolder = () => {
    const trimmed = newFolderName.trim();
    if (!trimmed) {
      return;
    }
    onCreateFolder(trimmed);
    setNewFolderName('');
  };

  const createDocument = () => {
    const trimmed = newDocTitle.trim() || 'Untitled';
    onCreateDocument(trimmed);
  };

  return (
    <aside className="explorer-layout">
      <div className="explorer-iconbar">
        <div className="explorer-icon">LL</div>
      </div>

      <div className="explorer-panel">
        <div className="explorer-header">
          <div className="explorer-title">LiteLizard</div>
          <div className="explorer-root">{rootPath ?? 'フォルダ未選択'}</div>
        </div>

        <div className="explorer-actions-row">
          <button className="action-button" onClick={onOpenFolder}>
            フォルダを開く
          </button>
        </div>

        <div className="explorer-actions-row">
          <input
            value={newDocTitle}
            onChange={(event) => setNewDocTitle(event.target.value)}
            className="input-control"
            placeholder="新規ドキュメント名"
            disabled={!rootPath}
          />
          <button className="action-button" onClick={createDocument} disabled={!rootPath}>
            新規作成
          </button>
        </div>

        <div className="explorer-actions-row">
          <input
            value={newFolderName}
            onChange={(event) => setNewFolderName(event.target.value)}
            className="input-control"
            placeholder="新規フォルダ名"
            disabled={!rootPath}
          />
          <button className="action-button" onClick={createFolder} disabled={!rootPath || !newFolderName.trim()}>
            追加
          </button>
        </div>

        <div className="explorer-tree">
          <Tree
            nodes={tree}
            currentFilePath={currentFilePath}
            expanded={expandedFolders}
            onToggle={toggleFolder}
            onSelectFile={onSelectFile}
          />
        </div>
      </div>
    </aside>
  );
}
