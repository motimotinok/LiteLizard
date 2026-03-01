import React from 'react';
import type { LiteLizardDocument } from '@litelizard/shared';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

type Chapter = LiteLizardDocument['chapters'][number];
type Paragraph = LiteLizardDocument['paragraphs'][number];

interface Props {
  chapter: Chapter;
  index: number;
  paragraphs: Paragraph[];
}

export function ChapterCard({ chapter, index, paragraphs }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: chapter.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const previewText = paragraphs
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((p) => p.light.text.trim())
    .join(' ');

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={isDragging ? 'editor-macro-card editor-macro-card-dragging' : 'editor-macro-card'}
    >
      <header className="editor-macro-card-header">
        <span className="editor-macro-card-index">C{String(index + 1).padStart(2, '0')}</span>
        <h3 className="editor-macro-card-title">{chapter.title}</h3>
        <button
          className="macro-card-drag-handle"
          type="button"
          aria-label={`${chapter.title} をドラッグして並び替え`}
          title="ドラッグして並び替え"
          {...attributes}
          {...listeners}
        >
          ⋮⋮
        </button>
      </header>
      <p className="editor-macro-card-preview macro-card-preview-dense">{previewText || '（空の章）'}</p>
      <footer className="editor-macro-card-footer">{paragraphs.length} 段落</footer>
    </article>
  );
}
