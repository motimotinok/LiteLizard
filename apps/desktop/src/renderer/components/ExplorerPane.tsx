import React from 'react';
import type { FileNode } from '@litelizard/shared';

interface Props {
  rootPath: string | null;
  tree: FileNode[];
  currentFilePath: string | null;
  onOpenFolder: () => void;
  onCreateDocument: () => void;
  onSelectFile: (path: string) => void;
}

function renderTree(nodes: FileNode[], currentFilePath: string | null, onSelectFile: (path: string) => void) {
  return nodes.map((node) => {
    if (node.type === 'directory') {
      return (
        <li key={node.path}>
          <strong>{node.name}</strong>
          {node.children && node.children.length > 0 ? (
            <ul>{renderTree(node.children, currentFilePath, onSelectFile)}</ul>
          ) : null}
        </li>
      );
    }

    return (
      <li key={node.path}>
        <button
          className={node.path === currentFilePath ? 'file-button active' : 'file-button'}
          onClick={() => onSelectFile(node.path)}
        >
          {node.name}
        </button>
      </li>
    );
  });
}

export function ExplorerPane(props: Props) {
  return (
    <aside className="pane explorer-pane">
      <h2>Explorer</h2>
      <div className="explorer-actions">
        <button onClick={props.onOpenFolder}>Open Folder</button>
        <button onClick={props.onCreateDocument} disabled={!props.rootPath}>
          New Doc
        </button>
      </div>
      <div className="hint">{props.rootPath ?? 'No folder opened'}</div>
      <ul className="tree">{renderTree(props.tree, props.currentFilePath, props.onSelectFile)}</ul>
    </aside>
  );
}
