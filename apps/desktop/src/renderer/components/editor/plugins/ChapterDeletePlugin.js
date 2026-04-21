import { jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { $getRoot, $isParagraphNode } from 'lexical';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { deleteChapterNodeInLexical } from './ChapterCommandPlugin.js';
function ChapterDeleteButton({ nodeKey, position, onDelete }) {
    const { top, height } = position;
    const wrapperStyle = {
        position: 'absolute',
        top,
        right: 0,
        height,
        display: 'flex',
        alignItems: 'center',
        pointerEvents: 'none',
    };
    const buttonStyle = {
        pointerEvents: 'auto',
    };
    function handleMouseDown(e) {
        e.preventDefault();
        e.stopPropagation();
        onDelete(nodeKey);
    }
    return (_jsx("div", { style: wrapperStyle, children: _jsx("button", { type: "button", style: buttonStyle, className: "chapter-delete-btn", "aria-label": "\u7AE0\u3092\u524A\u9664", title: "\u7AE0\u3092\u524A\u9664", onMouseDown: handleMouseDown, children: "\u00D7" }) }));
}
export function ChapterDeletePlugin({ chapterNodeKeys, chapterNodeKeySetRef, containerRef }) {
    const [editor] = useLexicalComposerContext();
    const [positions, setPositions] = useState(new Map());
    useEffect(() => {
        const container = containerRef.current;
        if (!container)
            return;
        const update = () => {
            const containerRect = container.getBoundingClientRect();
            const next = new Map();
            chapterNodeKeys.forEach((key) => {
                const el = editor.getElementByKey(key);
                if (el) {
                    const rect = el.getBoundingClientRect();
                    next.set(key, {
                        top: rect.top - containerRect.top + container.scrollTop,
                        height: rect.height,
                    });
                }
            });
            setPositions(next);
        };
        update();
        const observer = new ResizeObserver(update);
        observer.observe(container);
        container.addEventListener('scroll', update);
        return () => {
            observer.disconnect();
            container.removeEventListener('scroll', update);
        };
    }, [editor, chapterNodeKeys, containerRef]);
    function handleDelete(nodeKey) {
        editor.update(() => {
            const children = $getRoot().getChildren();
            const node = children.find((n) => $isParagraphNode(n) && n.getKey() === nodeKey);
            if (node) {
                deleteChapterNodeInLexical(node, chapterNodeKeySetRef);
            }
        });
    }
    const container = containerRef.current;
    if (!container)
        return null;
    return createPortal(_jsx(_Fragment, { children: chapterNodeKeys.map((key) => {
            const pos = positions.get(key);
            return pos !== undefined ? (_jsx(ChapterDeleteButton, { nodeKey: key, position: pos, chapterNodeKeySetRef: chapterNodeKeySetRef, onDelete: handleDelete }, key)) : null;
        }) }), container);
}
//# sourceMappingURL=ChapterDeletePlugin.js.map