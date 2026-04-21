import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useRef, useState } from 'react';
function FolderIcon() {
    return (_jsx("svg", { viewBox: "0 0 24 24", width: 16, height: 16, "aria-hidden": true, children: _jsx("path", { d: "M3.5 7.5a2 2 0 0 1 2-2h4l1.6 1.8h7.4a2 2 0 0 1 2 2v7.2a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2V7.5Z", fill: "none", stroke: "currentColor", strokeWidth: "1.6", strokeLinejoin: "round" }) }));
}
function FileIcon() {
    return (_jsx("svg", { viewBox: "0 0 24 24", width: 16, height: 16, "aria-hidden": true, children: _jsx("path", { d: "M7 3.5h7l4.5 4.5v11a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 5.5 19V5A1.5 1.5 0 0 1 7 3.5Zm6 1.8V9h3.7", fill: "none", stroke: "currentColor", strokeWidth: "1.6", strokeLinecap: "round", strokeLinejoin: "round" }) }));
}
function baseName(targetPath) {
    const normalized = targetPath.replace(/\\/g, '/');
    const parts = normalized.split('/');
    return parts[parts.length - 1] ?? targetPath;
}
function dirName(targetPath) {
    const slash = Math.max(targetPath.lastIndexOf('/'), targetPath.lastIndexOf('\\'));
    if (slash < 0) {
        return targetPath;
    }
    return targetPath.slice(0, slash);
}
function displayName(node) {
    if (node.type === 'file') {
        return node.name.replace(/\.lzl$/i, '');
    }
    return node.name;
}
function InlineInput({ type, depth, defaultValue, onConfirm, onCancel }) {
    const ref = useRef(null);
    const confirmed = useRef(false);
    const blurTimer = useRef(null);
    const [value, setValue] = useState(defaultValue);
    useEffect(() => {
        ref.current?.select();
        return () => {
            if (blurTimer.current !== null)
                clearTimeout(blurTimer.current);
        };
    }, []);
    const paddingLeft = depth * 14 + (type === 'directory' ? 10 : 32);
    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            if (e.nativeEvent.isComposing)
                return; // IME変換中は無視
            const trimmed = value.trim();
            if (trimmed) {
                confirmed.current = true;
                onConfirm(trimmed);
            }
        }
        else if (e.key === 'Escape') {
            onCancel();
        }
    };
    const handleBlur = () => {
        blurTimer.current = setTimeout(() => {
            if (!confirmed.current)
                onCancel();
        }, 150);
    };
    return (_jsxs("div", { className: "explorer-inline-input-row", style: { paddingLeft: `${paddingLeft}px` }, children: [_jsx("span", { className: "explorer-node-icon", "aria-hidden": true, children: type === 'directory' ? _jsx(FolderIcon, {}) : _jsx(FileIcon, {}) }), _jsx("input", { ref: ref, className: "explorer-inline-input", value: value, onChange: (e) => setValue(e.target.value), onKeyDown: handleKeyDown, onBlur: handleBlur, autoFocus: true })] }));
}
function Tree({ nodes, currentFilePath, depth = 0, expanded, onToggle, onSelectFile, onOpenContextMenu, inlineCreate, inlineRename, onInlineCreateConfirm, onInlineCreateCancel, onInlineRenameConfirm, onInlineRenameCancel, }) {
    return (_jsx("div", { className: "explorer-tree-group", children: nodes.map((node) => {
            if (node.type === 'directory') {
                if (inlineRename === node.path) {
                    return (_jsx(InlineInput, { type: "directory", depth: depth, defaultValue: baseName(node.path), onConfirm: (name) => onInlineRenameConfirm(node.path, name), onCancel: onInlineRenameCancel }, node.path));
                }
                const isExpanded = expanded.has(node.path);
                return (_jsxs("div", { children: [_jsxs("button", { className: "explorer-tree-item explorer-tree-item-folder", style: { paddingLeft: `${depth * 14 + 10}px` }, onClick: () => onToggle(node.path), onContextMenu: (event) => onOpenContextMenu(event, node), children: [_jsx("span", { className: "explorer-chevron", children: isExpanded ? '▾' : '▸' }), _jsx("span", { className: "explorer-node-icon", "aria-hidden": true, children: _jsx(FolderIcon, {}) }), _jsx("span", { className: "explorer-node-label", children: displayName(node) })] }), isExpanded && (_jsxs(_Fragment, { children: [node.children && node.children.length > 0 && (_jsx(Tree, { nodes: node.children, currentFilePath: currentFilePath, depth: depth + 1, expanded: expanded, onToggle: onToggle, onSelectFile: onSelectFile, onOpenContextMenu: onOpenContextMenu, inlineCreate: inlineCreate, inlineRename: inlineRename, onInlineCreateConfirm: onInlineCreateConfirm, onInlineCreateCancel: onInlineCreateCancel, onInlineRenameConfirm: onInlineRenameConfirm, onInlineRenameCancel: onInlineRenameCancel })), inlineCreate?.parentPath === node.path && (_jsx(InlineInput, { type: inlineCreate.type, depth: depth + 1, defaultValue: inlineCreate.defaultValue, onConfirm: onInlineCreateConfirm, onCancel: onInlineCreateCancel }))] }))] }, node.path));
            }
            if (inlineRename === node.path) {
                return (_jsx(InlineInput, { type: "file", depth: depth, defaultValue: baseName(node.path), onConfirm: (name) => onInlineRenameConfirm(node.path, name), onCancel: onInlineRenameCancel }, node.path));
            }
            const isSelected = node.path === currentFilePath;
            return (_jsxs("button", { className: isSelected
                    ? 'explorer-tree-item explorer-tree-item-file active'
                    : 'explorer-tree-item explorer-tree-item-file', style: { paddingLeft: `${depth * 14 + 32}px` }, onClick: () => onSelectFile(node.path), onContextMenu: (event) => onOpenContextMenu(event, node), children: [_jsx("span", { className: "explorer-node-icon", "aria-hidden": true, children: _jsx(FileIcon, {}) }), _jsx("span", { className: "explorer-node-label", children: displayName(node) })] }, node.path));
        }) }));
}
function collectDirectoryPaths(nodes) {
    const paths = [];
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
export function ExplorerPane({ rootPath, tree, currentFilePath, style, onCreateEntry, onRenameEntry, onDeleteEntry, onSelectFile, }) {
    const [expanded, setExpanded] = useState(null);
    const [contextMenu, setContextMenu] = useState(null);
    const [selectedFolderPath, setSelectedFolderPath] = useState(null);
    const [inlineCreate, setInlineCreate] = useState(null);
    const [inlineRename, setInlineRename] = useState(null);
    const defaultExpanded = useMemo(() => new Set(collectDirectoryPaths(tree)), [tree]);
    const expandedFolders = expanded ?? defaultExpanded;
    useEffect(() => {
        const close = () => setContextMenu(null);
        window.addEventListener('click', close);
        return () => window.removeEventListener('click', close);
    }, []);
    const toggleFolder = (path) => {
        setExpanded((current) => {
            const source = current ?? new Set(defaultExpanded);
            const next = new Set(source);
            if (next.has(path)) {
                next.delete(path);
            }
            else {
                next.add(path);
            }
            return next;
        });
    };
    const handleFileClick = (path) => {
        onSelectFile(path);
    };
    // currentFilePath が変わったとき（自動展開・ファイルクリック・新規作成後）に sync
    // null になった場合（ファイル削除・フォルダ削除）はリセットして rootPath フォールバックに任せる
    useEffect(() => {
        if (currentFilePath) {
            setSelectedFolderPath(dirName(currentFilePath));
        }
        else {
            setSelectedFolderPath(null);
        }
    }, [currentFilePath]);
    // rootPath 変更時にリセット
    useEffect(() => {
        setSelectedFolderPath(null);
    }, [rootPath]);
    // tree 更新後にパス存在チェック → rootPath へフォールバック
    useEffect(() => {
        if (selectedFolderPath === null)
            return;
        const dirs = new Set(collectDirectoryPaths(tree));
        if (!dirs.has(selectedFolderPath) && selectedFolderPath !== rootPath) {
            setSelectedFolderPath(rootPath);
        }
    }, [tree, selectedFolderPath, rootPath]);
    const openInlineCreate = (parentPath, type) => {
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
    const openInlineRename = (targetPath) => {
        setInlineRename(targetPath);
        setContextMenu(null);
    };
    const handleInlineCreateConfirm = (name) => {
        if (inlineCreate) {
            const type = inlineCreate.type === 'directory' ? 'folder' : 'file';
            onCreateEntry(inlineCreate.parentPath, type, name);
        }
        setInlineCreate(null);
    };
    const handleInlineRenameConfirm = (targetPath, name) => {
        onRenameEntry(targetPath, name);
        setInlineRename(null);
    };
    const runDelete = (targetPath) => {
        if (!window.confirm('削除しますか？')) {
            return;
        }
        onDeleteEntry(targetPath);
    };
    const resolveCreateParent = (menu) => {
        if (menu.targetType === 'directory') {
            return menu.targetPath;
        }
        return dirName(menu.targetPath);
    };
    const onOpenContextMenu = (event, node) => {
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
    return (_jsxs("aside", { className: "explorer-layout", style: style, "data-testid": "file-browser-pane", children: [_jsxs("div", { className: "explorer-panel", children: [_jsx("div", { className: "explorer-panel-toolbar", children: _jsxs("div", { className: "explorer-toolbar-actions", children: [_jsx("button", { className: "icon-button explorer-add-btn", onClick: () => openInlineCreate(createParent, 'file'), disabled: !canCreate, title: "\u65B0\u898F\u30D5\u30A1\u30A4\u30EB", "aria-label": "\u65B0\u898F\u30D5\u30A1\u30A4\u30EB", children: _jsxs("span", { className: "explorer-icon-wrap", children: [_jsx(FileIcon, {}), _jsx("span", { className: "explorer-add-plus", children: "+" })] }) }), _jsx("button", { className: "icon-button explorer-add-btn", onClick: () => openInlineCreate(createParent, 'folder'), disabled: !canCreate, title: "\u65B0\u898F\u30D5\u30A9\u30EB\u30C0", "aria-label": "\u65B0\u898F\u30D5\u30A9\u30EB\u30C0", children: _jsxs("span", { className: "explorer-icon-wrap", children: [_jsx(FolderIcon, {}), _jsx("span", { className: "explorer-add-plus", children: "+" })] }) })] }) }), _jsxs("div", { className: "explorer-tree", onContextMenu: (event) => event.preventDefault(), onClick: (event) => {
                            if (event.target === event.currentTarget) {
                                setSelectedFolderPath(null);
                            }
                        }, children: [_jsx(Tree, { nodes: tree, currentFilePath: currentFilePath, expanded: expandedFolders, onToggle: toggleFolder, onSelectFile: handleFileClick, onOpenContextMenu: onOpenContextMenu, inlineCreate: inlineCreate, inlineRename: inlineRename, onInlineCreateConfirm: handleInlineCreateConfirm, onInlineCreateCancel: () => setInlineCreate(null), onInlineRenameConfirm: handleInlineRenameConfirm, onInlineRenameCancel: () => setInlineRename(null) }), inlineCreate?.parentPath === rootPath && (_jsx(InlineInput, { type: inlineCreate.type, depth: 0, defaultValue: inlineCreate.defaultValue, onConfirm: handleInlineCreateConfirm, onCancel: () => setInlineCreate(null) }))] })] }), contextMenu ? (_jsxs("div", { className: "context-menu", style: { left: `${contextMenu.x}px`, top: `${contextMenu.y}px` }, onClick: (event) => event.stopPropagation(), children: [_jsx("button", { className: "menu-item", onClick: () => {
                            const parentPath = resolveCreateParent(contextMenu);
                            openInlineCreate(parentPath, 'file');
                        }, children: "\u65B0\u898F\u30D5\u30A1\u30A4\u30EB" }), _jsx("button", { className: "menu-item", onClick: () => {
                            const parentPath = resolveCreateParent(contextMenu);
                            openInlineCreate(parentPath, 'folder');
                        }, children: "\u65B0\u898F\u30D5\u30A9\u30EB\u30C0" }), _jsx("button", { className: "menu-item", onClick: () => {
                            openInlineRename(contextMenu.targetPath);
                        }, children: "\u30EA\u30CD\u30FC\u30E0" }), _jsx("button", { className: "menu-item menu-item-danger", onClick: () => {
                            runDelete(contextMenu.targetPath);
                            setContextMenu(null);
                        }, children: "\u524A\u9664" })] })) : null] }));
}
//# sourceMappingURL=ExplorerPane.js.map