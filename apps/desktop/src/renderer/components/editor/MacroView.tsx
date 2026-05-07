import React, { useEffect } from 'react';
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
import { useAppStore } from '../../store/useAppStore.js';
import type { UndoSnapshot } from '../../store/useAppStore.js';

interface Props {
  document: LiteLizardDocument;
  onReorderChapters?: (orderedIds: string[]) => void;
  onDeleteChapter?: (chapterId: string) => void;
}

export function MacroView({ document, onReorderChapters, onDeleteChapter }: Props) {
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

    // Macro view では Lexical エディタが mount されていないため document スナップショットのみ保存する。
    // Undo 復元時は documentSnapshot から Lexical を再構築する（UndoPlugin / initialConfig 共通）。
    useAppStore.getState().pushUndo({ documentSnapshot: document });
    onReorderChapters?.(newOrder);
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const modifier = event.metaKey || event.ctrlKey;
      if (!modifier) return;
      const key = event.key.toLowerCase();
      const isUndo = key === 'z' && !event.shiftKey;
      const isRedo = key === 'y' || (key === 'z' && event.shiftKey);
      if (!isUndo && !isRedo) return;

      // input / textarea / contentEditable 上の Ctrl+Z はネイティブ Undo を尊重する
      const active = document.activeElement;
      if (active instanceof HTMLElement) {
        const tag = active.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || active.isContentEditable) return;
      }

      const store = useAppStore.getState();
      const doc = store.document;
      if (!doc) return;
      const current: UndoSnapshot = { documentSnapshot: doc };
      const target = isUndo
        ? store.undoWithCurrentSnapshot(current)
        : store.redoWithCurrentSnapshot(current);
      if (!target) return;
      event.preventDefault();
      store.restoreSnapshot(target);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={sortedChapters.map((c) => c.id)} strategy={verticalListSortingStrategy}>
        <div className="editor-macro-list">
          {sortedChapters.map((chapter, index) => {
            const paragraphs = document.paragraphs
              .filter((p) => p.chapterId === chapter.id)
              .sort((a, b) => a.order - b.order);
            return (
              <ChapterCard
                key={chapter.id}
                chapter={chapter}
                index={index}
                paragraphs={paragraphs}
                onDelete={onDeleteChapter ? () => onDeleteChapter(chapter.id) : undefined}
              />
            );
          })}
        </div>
      </SortableContext>
    </DndContext>
  );
}
