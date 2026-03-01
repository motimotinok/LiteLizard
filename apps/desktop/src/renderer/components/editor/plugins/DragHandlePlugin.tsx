import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { $getRoot, $isParagraphNode, type LexicalEditor } from 'lexical';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useDndMonitor, type DragEndEvent } from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface HandleProps {
  nodeKey: string;
  top: number;
  editor: LexicalEditor;
}

// Lexical の段落 DOM 要素をソータブルアイテムとして登録し、
// ハンドルボタンをドラッグ起点にする。
// これにより dnd-kit の collision detection が行全体を基準に動作する。
function ParagraphSortableHandle({ nodeKey, top, editor }: HandleProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: nodeKey });

  // Lexical の段落要素を sortable アイテムとして登録
  useEffect(() => {
    const el = editor.getElementByKey(nodeKey);
    if (!el) return;
    setNodeRef(el as HTMLElement);
  }, [nodeKey, editor, setNodeRef]);

  // ドラッグ中のトランスフォームを Lexical 要素に直接適用
  useEffect(() => {
    const el = editor.getElementByKey(nodeKey);
    if (!el) return;
    const h = el as HTMLElement;
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

  const style: React.CSSProperties = {
    position: 'absolute',
    top,
    left: -28,
    width: 20,
  };

  return (
    <button
      ref={setActivatorNodeRef}
      style={style}
      className="paragraph-drag-handle"
      type="button"
      aria-label="段落をドラッグして並び替え"
      title="ドラッグして並び替え"
      {...attributes}
      {...listeners}
    >
      ⋮⋮
    </button>
  );
}

interface Props {
  paragraphNodeKeys: string[];
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export function DragHandlePlugin({ paragraphNodeKeys, containerRef }: Props) {
  const [editor] = useLexicalComposerContext();
  const [positions, setPositions] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const update = () => {
      const containerTop = container.getBoundingClientRect().top;
      const next = new Map<string, number>();
      paragraphNodeKeys.forEach((key) => {
        const el = editor.getElementByKey(key);
        if (el) {
          next.set(key, el.getBoundingClientRect().top - containerTop + container.scrollTop);
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
    onDragEnd({ active, over }: DragEndEvent) {
      if (!over || active.id === over.id) return;
      const activeKey = String(active.id);
      const overKey = String(over.id);

      editor.update(() => {
        const root = $getRoot();
        const children = root.getChildren().filter($isParagraphNode);
        const dragged = children.find((n) => n.getKey() === activeKey);
        const target = children.find((n) => n.getKey() === overKey);
        if (!dragged || !target) return;

        const activeIndex = children.indexOf(dragged);
        const overIndex = children.indexOf(target);
        dragged.remove();
        if (activeIndex < overIndex) {
          target.insertAfter(dragged);
        } else {
          target.insertBefore(dragged);
        }
      });
    },
  });

  const container = containerRef.current;
  if (!container) return null;

  return createPortal(
    <>
      {paragraphNodeKeys.map((key) => {
        const top = positions.get(key);
        return top !== undefined ? (
          <ParagraphSortableHandle key={key} nodeKey={key} top={top} editor={editor} />
        ) : null;
      })}
    </>,
    container,
  );
}
