import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { $getRoot, $isParagraphNode, type ParagraphNode } from 'lexical';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { deleteChapterNodeInLexical } from './ChapterCommandPlugin.js';

interface Position {
  top: number;
  height: number;
}

interface DeleteButtonProps {
  nodeKey: string;
  position: Position;
  chapterNodeKeySetRef: React.MutableRefObject<Set<string>>;
  onDelete: (nodeKey: string) => void;
}

function ChapterDeleteButton({ nodeKey, position, onDelete }: DeleteButtonProps) {
  const { top, height } = position;

  const wrapperStyle: React.CSSProperties = {
    position: 'absolute',
    top,
    right: 0,
    height,
    display: 'flex',
    alignItems: 'center',
    pointerEvents: 'none',
  };

  const buttonStyle: React.CSSProperties = {
    pointerEvents: 'auto',
  };

  function handleMouseDown(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    onDelete(nodeKey);
  }

  return (
    <div style={wrapperStyle}>
      <button
        type="button"
        style={buttonStyle}
        className="chapter-delete-btn"
        aria-label="章を削除"
        title="章を削除"
        onMouseDown={handleMouseDown}
      >
        ×
      </button>
    </div>
  );
}

interface Props {
  chapterNodeKeys: string[];
  chapterNodeKeySetRef: React.MutableRefObject<Set<string>>;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export function ChapterDeletePlugin({ chapterNodeKeys, chapterNodeKeySetRef, containerRef }: Props) {
  const [editor] = useLexicalComposerContext();
  const [positions, setPositions] = useState<Map<string, Position>>(new Map());

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const update = () => {
      const containerRect = container.getBoundingClientRect();
      const next = new Map<string, Position>();
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

  function handleDelete(nodeKey: string) {
    editor.update(() => {
      const children = $getRoot().getChildren();
      const node = children.find(
        (n): n is ParagraphNode => $isParagraphNode(n) && n.getKey() === nodeKey,
      );
      if (node) {
        deleteChapterNodeInLexical(node, chapterNodeKeySetRef);
      }
    });
  }

  const container = containerRef.current;
  if (!container) return null;

  return createPortal(
    <>
      {chapterNodeKeys.map((key) => {
        const pos = positions.get(key);
        return pos !== undefined ? (
          <ChapterDeleteButton
            key={key}
            nodeKey={key}
            position={pos}
            chapterNodeKeySetRef={chapterNodeKeySetRef}
            onDelete={handleDelete}
          />
        ) : null;
      })}
    </>,
    container,
  );
}
