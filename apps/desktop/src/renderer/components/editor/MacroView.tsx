import React from 'react';
import type { LiteLizardDocument } from '@litelizard/shared';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { ChapterCard } from './components/ChapterCard.js';

interface Props {
  document: LiteLizardDocument;
  onReorderChapters?: (orderedIds: string[]) => void;
}

export function MacroView({ document, onReorderChapters }: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const sortedChapters = [...document.chapters].sort((a, b) => a.order - b.order);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = sortedChapters.findIndex((c) => c.id === active.id);
    const newIndex = sortedChapters.findIndex((c) => c.id === over.id);
    const newOrder = arrayMove(sortedChapters, oldIndex, newIndex).map((c) => c.id);
    onReorderChapters?.(newOrder);
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={sortedChapters.map((c) => c.id)} strategy={verticalListSortingStrategy}>
        <div className="editor-macro-list">
          {sortedChapters.map((chapter, index) => {
            const paragraphs = document.paragraphs
              .filter((p) => p.chapterId === chapter.id)
              .sort((a, b) => a.order - b.order);
            return <ChapterCard key={chapter.id} chapter={chapter} index={index} paragraphs={paragraphs} />;
          })}
        </div>
      </SortableContext>
    </DndContext>
  );
}
