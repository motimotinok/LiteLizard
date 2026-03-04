import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { $getRoot, $isParagraphNode, type LexicalEditor } from 'lexical';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useDndMonitor, type DragEndEvent } from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Position {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface HandleProps {
  nodeKey: string;
  position: Position;
  editor: LexicalEditor;
}

// 段落と同じ位置・サイズの wrapper を `position: absolute` で重ねて配置する。
// wrapper に dnd-kit の transform を適用することで、DnD 中にハンドルも段落と一緒に追従する。
// wrapper は pointer-events: none で編集を妨げない。
function ParagraphSortableHandle({ nodeKey, position, editor }: HandleProps) {
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

  const { top, left, width, height } = position;

  // 段落の左端から 28px 左側まで wrapper を伸ばし、
  // フレックスで先頭に置いたハンドルを垂直中央揃えにする。
  // wrapper は pointer-events: none で編集を妨げず、transform で DnD 追従。
  const wrapperStyle: React.CSSProperties = {
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

  const handleStyle: React.CSSProperties = {
    width: 20,
    flexShrink: 0,
    pointerEvents: 'auto',
  };

  return (
    <div style={wrapperStyle}>
      <button
        ref={setActivatorNodeRef}
        style={handleStyle}
        className="paragraph-drag-handle"
        type="button"
        aria-label="段落をドラッグして並び替え"
        title="ドラッグして並び替え"
        {...attributes}
        {...listeners}
      >
        ⋮⋮
      </button>
    </div>
  );
}

interface Props {
  paragraphNodeKeys: string[];
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export function DragHandlePlugin({ paragraphNodeKeys, containerRef }: Props) {
  const [editor] = useLexicalComposerContext();
  const [positions, setPositions] = useState<Map<string, Position>>(new Map());

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const update = () => {
      const containerRect = container.getBoundingClientRect();
      const next = new Map<string, Position>();
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
        const pos = positions.get(key);
        return pos !== undefined ? (
          <ParagraphSortableHandle key={key} nodeKey={key} position={pos} editor={editor} />
        ) : null;
      })}
    </>,
    container,
  );
}
