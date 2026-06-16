import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { $getRoot, $isParagraphNode, type LexicalEditor } from 'lexical';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useDndMonitor, type DragEndEvent } from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useAppStore } from '../../../store/useAppStore.js';
import {
  buildParagraphGutterMeta,
  type ParagraphGutterMeta,
  type StructureSnapshot,
} from '../utils/structureBuilder.js';

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
  meta: ParagraphGutterMeta;
  visible: boolean;
}

// 段落と同じ位置・サイズの wrapper を `position: absolute` で重ねて配置する。
// wrapper に dnd-kit の transform を適用することで、DnD 中にハンドルも段落と一緒に追従する。
// wrapper は pointer-events: none で編集を妨げない。
function ParagraphSortableHandle({ nodeKey, position, editor, meta, visible }: HandleProps) {
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
    h.classList.toggle('editor-paragraph-row-dragging', isDragging);
    return () => {
      h.style.transform = '';
      h.style.transition = '';
      h.style.opacity = '';
      h.style.zIndex = '';
      h.style.position = '';
      h.classList.remove('editor-paragraph-row-dragging');
    };
  }, [nodeKey, editor, transform, transition, isDragging]);

  const { top, left, width, height } = position;

  // 左余白の構造ガターを段落と一緒に追従させる。
  // ハンドル本体だけ pointer-events を受け取り、本文編集は妨げない。
  const wrapperStyle: React.CSSProperties = {
    position: 'absolute',
    top,
    left: left - 82,
    width: width + 82,
    height,
    pointerEvents: 'none',
    transform: CSS.Transform.toString(transform) ?? undefined,
    transition: transition ?? undefined,
  };

  const handleStyle: React.CSSProperties = {
    pointerEvents: 'auto',
  };

  return (
    <div
      className={[
        'paragraph-drag-wrapper',
        `paragraph-drag-wrapper-chapter-${meta.chapterPosition}`,
        visible || isDragging ? 'paragraph-drag-wrapper-visible' : '',
        isDragging ? 'paragraph-drag-wrapper-dragging' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={wrapperStyle}
      data-paragraph-index={meta.paragraphIndex}
      data-chapter-index={meta.chapterIndex}
    >
      <span className="paragraph-chapter-rail" aria-hidden="true" />
      {(meta.chapterPosition === 'single' || meta.chapterPosition === 'start') && (
        <span className="paragraph-chapter-label" aria-hidden="true">
          {meta.chapterIndex}
        </span>
      )}
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
      <span className="paragraph-index" aria-hidden="true">
        {meta.paragraphIndex}
      </span>
    </div>
  );
}

interface Props {
  paragraphNodeKeys: string[];
  structureSnapshot: StructureSnapshot;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export function DragHandlePlugin({ paragraphNodeKeys, structureSnapshot, containerRef }: Props) {
  const [editor] = useLexicalComposerContext();
  const [positions, setPositions] = useState<Map<string, Position>>(new Map());
  const [visibleNodeKeys, setVisibleNodeKeys] = useState<Set<string>>(new Set());
  const paragraphGutterMeta = useMemo(() => buildParagraphGutterMeta(structureSnapshot), [structureSnapshot]);

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
    const cleanups: Array<() => void> = [];

    paragraphNodeKeys.forEach((key) => {
      const el = editor.getElementByKey(key);
      if (!el) return;

      const show = () => {
        setVisibleNodeKeys((current) => {
          const next = new Set(current);
          next.add(key);
          return next;
        });
      };
      const hide = () => {
        setVisibleNodeKeys((current) => {
          const next = new Set(current);
          next.delete(key);
          return next;
        });
      };

      el.addEventListener('mouseenter', show);
      el.addEventListener('mouseleave', hide);
      el.addEventListener('focusin', show);
      el.addEventListener('focusout', hide);
      cleanups.push(() => {
        el.removeEventListener('mouseenter', show);
        el.removeEventListener('mouseleave', hide);
        el.removeEventListener('focusin', show);
        el.removeEventListener('focusout', hide);
      });
    });

    return () => {
      observer.disconnect();
      container.removeEventListener('scroll', update);
      cleanups.forEach((cleanup) => cleanup());
    };
  }, [editor, paragraphNodeKeys, containerRef]);

  useDndMonitor({
    onDragEnd({ active, over }: DragEndEvent) {
      if (!over || active.id === over.id) return;
      const activeKey = String(active.id);
      const overKey = String(over.id);

      const store = useAppStore.getState();
      const doc = store.document;
      if (doc) {
        store.pushUndo({
          lexicalStateJson: JSON.stringify(editor.getEditorState().toJSON()),
          documentSnapshot: doc,
        });
      }

      editor.update(
        () => {
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
        },
        { tag: 'structural' },
      );
    },
  });

  const container = containerRef.current;
  if (!container) return null;

  return createPortal(
    <>
      {paragraphNodeKeys.map((key) => {
        const pos = positions.get(key);
        const index = paragraphNodeKeys.indexOf(key);
        const meta = paragraphGutterMeta[index];
        return pos !== undefined ? (
          <ParagraphSortableHandle
            key={key}
            nodeKey={key}
            position={pos}
            editor={editor}
            meta={meta ?? { paragraphIndex: index + 1, chapterIndex: 1, chapterPosition: 'single' }}
            visible={visibleNodeKeys.has(key)}
          />
        ) : null;
      })}
    </>,
    container,
  );
}
