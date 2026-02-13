import React from 'react';
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { LiteLizardDocument } from '@litelizard/shared';

interface Props {
  document: LiteLizardDocument | null;
  onChangeParagraph: (paragraphId: string, text: string) => void;
  onReorder: (orderedIds: string[]) => void;
}

function SortableParagraphCard({
  id,
  text,
  status,
  onChange,
}: {
  id: string;
  text: string;
  status: string;
  onChange: (value: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });

  return (
    <article
      ref={setNodeRef}
      className="paragraph-card"
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      <div className="card-header">
        <button className="drag-handle" {...attributes} {...listeners}>
          Drag
        </button>
        <span className={`status status-${status}`}>{status}</span>
      </div>
      <textarea value={text} onChange={(event) => onChange(event.target.value)} rows={5} />
    </article>
  );
}

export function EditorPane({ document, onChangeParagraph, onReorder }: Props) {
  const sensors = useSensors(useSensor(PointerSensor));

  if (!document) {
    return (
      <section className="pane editor-pane">
        <h2>Editor</h2>
        <div className="empty">Select a document</div>
      </section>
    );
  }

  const ids = document.paragraphs.map((paragraph) => paragraph.id);

  const onDragEnd = (event: DragEndEvent) => {
    const activeId = String(event.active.id);
    const overId = event.over ? String(event.over.id) : null;
    if (!overId || activeId === overId) {
      return;
    }

    const oldIndex = ids.indexOf(activeId);
    const newIndex = ids.indexOf(overId);
    const next = arrayMove(ids, oldIndex, newIndex);
    onReorder(next);
  };

  return (
    <section className="pane editor-pane">
      <h2>{document.title}</h2>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          <div className="paragraph-list">
            {document.paragraphs.map((paragraph) => (
              <SortableParagraphCard
                key={paragraph.id}
                id={paragraph.id}
                text={paragraph.light.text}
                status={paragraph.lizard.status}
                onChange={(value) => onChangeParagraph(paragraph.id, value)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </section>
  );
}
