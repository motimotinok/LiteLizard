import { jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { $getRoot, $isParagraphNode } from 'lexical';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useDndMonitor } from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
// 段落と同じ位置・サイズの wrapper を `position: absolute` で重ねて配置する。
// wrapper に dnd-kit の transform を適用することで、DnD 中にハンドルも段落と一緒に追従する。
// wrapper は pointer-events: none で編集を妨げない。
function ParagraphSortableHandle({ nodeKey, position, editor }) {
    const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging, } = useSortable({ id: nodeKey });
    // Lexical の段落要素を sortable アイテムとして登録
    useEffect(() => {
        const el = editor.getElementByKey(nodeKey);
        if (!el)
            return;
        setNodeRef(el);
    }, [nodeKey, editor, setNodeRef]);
    // ドラッグ中のトランスフォームを Lexical 要素に直接適用
    useEffect(() => {
        const el = editor.getElementByKey(nodeKey);
        if (!el)
            return;
        const h = el;
        h.style.transform = CSS.Transform.toString(transform) ?? '';
        h.style.transition = transition ?? '';
        h.style.opacity = isDragging ? '0.4' : '';
        h.style.zIndex = isDragging ? '100' : '';
        h.style.position = isDragging ? 'relative' : '';
        return () => {
            h.style.transform = '';
            h.style.transition = '';
            h.style.opacity = '';
            h.style.zIndex = '';
            h.style.position = '';
        };
    }, [nodeKey, editor, transform, transition, isDragging]);
    const { top, left, width, height } = position;
    // 段落の左端から 28px 左側まで wrapper を伸ばし、
    // フレックスで先頭に置いたハンドルを垂直中央揃えにする。
    // wrapper は pointer-events: none で編集を妨げず、transform で DnD 追従。
    const wrapperStyle = {
        position: 'absolute',
        top,
        left: left - 28,
        width: width + 28,
        height,
        display: 'flex',
        alignItems: 'center',
        pointerEvents: 'none',
        transform: CSS.Transform.toString(transform) ?? undefined,
        transition: transition ?? undefined,
    };
    const handleStyle = {
        width: 20,
        flexShrink: 0,
        pointerEvents: 'auto',
    };
    return (_jsx("div", { style: wrapperStyle, children: _jsx("button", { ref: setActivatorNodeRef, style: handleStyle, className: "paragraph-drag-handle", type: "button", "aria-label": "\u6BB5\u843D\u3092\u30C9\u30E9\u30C3\u30B0\u3057\u3066\u4E26\u3073\u66FF\u3048", title: "\u30C9\u30E9\u30C3\u30B0\u3057\u3066\u4E26\u3073\u66FF\u3048", ...attributes, ...listeners, children: "\u22EE\u22EE" }) }));
}
export function DragHandlePlugin({ paragraphNodeKeys, containerRef }) {
    const [editor] = useLexicalComposerContext();
    const [positions, setPositions] = useState(new Map());
    useEffect(() => {
        const container = containerRef.current;
        if (!container)
            return;
        const update = () => {
            const containerRect = container.getBoundingClientRect();
            const next = new Map();
            paragraphNodeKeys.forEach((key) => {
                const el = editor.getElementByKey(key);
                if (el) {
                    const rect = el.getBoundingClientRect();
                    next.set(key, {
                        top: rect.top - containerRect.top + container.scrollTop,
                        left: rect.left - containerRect.left + container.scrollLeft,
                        width: rect.width,
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
    }, [editor, paragraphNodeKeys, containerRef]);
    useDndMonitor({
        onDragEnd({ active, over }) {
            if (!over || active.id === over.id)
                return;
            const activeKey = String(active.id);
            const overKey = String(over.id);
            editor.update(() => {
                const root = $getRoot();
                const children = root.getChildren().filter($isParagraphNode);
                const dragged = children.find((n) => n.getKey() === activeKey);
                const target = children.find((n) => n.getKey() === overKey);
                if (!dragged || !target)
                    return;
                const activeIndex = children.indexOf(dragged);
                const overIndex = children.indexOf(target);
                dragged.remove();
                if (activeIndex < overIndex) {
                    target.insertAfter(dragged);
                }
                else {
                    target.insertBefore(dragged);
                }
            });
        },
    });
    const container = containerRef.current;
    if (!container)
        return null;
    return createPortal(_jsx(_Fragment, { children: paragraphNodeKeys.map((key) => {
            const pos = positions.get(key);
            return pos !== undefined ? (_jsx(ParagraphSortableHandle, { nodeKey: key, position: pos, editor: editor }, key)) : null;
        }) }), container);
}
//# sourceMappingURL=DragHandlePlugin.js.map