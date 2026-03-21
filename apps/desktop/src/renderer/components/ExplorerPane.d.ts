import React from 'react';
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
export declare function ExplorerPane({ rootPath, tree, currentFilePath, style, onCreateEntry, onRenameEntry, onDeleteEntry, onSelectFile, }: Props): import("react/jsx-runtime").JSX.Element;
export {};
