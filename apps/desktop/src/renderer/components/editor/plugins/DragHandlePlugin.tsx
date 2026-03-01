import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { $getRoot, $isParagraphNode } from 'lexical';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useDndMonitor, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface HandleProps {
  nodeKey: string;
  top: number;
}

function ParagraphHandle({ nodeKey, top }: HandleProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: nodeKey });

  const style: React.CSSProperties = {
    position: 'absolute',
    top,
    left: -28,
    width: 20,
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 100 : 1,
  };

  return (
    <button
      ref={setNodeRef}
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
    onDragEnd({ active, over }) {
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
        return top !== undefined ? <ParagraphHandle key={key} nodeKey={key} top={top} /> : null;
      })}
    </>,
    container,
  );
}
