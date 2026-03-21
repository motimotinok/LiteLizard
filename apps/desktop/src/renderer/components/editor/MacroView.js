import { jsx as _jsx } from "react/jsx-runtime";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, arrayMove, } from '@dnd-kit/sortable';
import { ChapterCard } from './components/ChapterCard.js';
export function MacroView({ document, onReorderChapters }) {
    const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
    const sortedChapters = [...document.chapters].sort((a, b) => a.order - b.order);
    function handleDragEnd(event) {
        const { active, over } = event;
        if (!over || active.id === over.id)
            return;
        const oldIndex = sortedChapters.findIndex((c) => c.id === active.id);
        const newIndex = sortedChapters.findIndex((c) => c.id === over.id);
        const newOrder = arrayMove(sortedChapters, oldIndex, newIndex).map((c) => c.id);
        onReorderChapters?.(newOrder);
    }
    return (_jsx(DndContext, { sensors: sensors, collisionDetection: closestCenter, onDragEnd: handleDragEnd, children: _jsx(SortableContext, { items: sortedChapters.map((c) => c.id), strategy: verticalListSortingStrategy, children: _jsx("div", { className: "editor-macro-list", children: sortedChapters.map((chapter, index) => {
                    const paragraphs = document.paragraphs
                        .filter((p) => p.chapterId === chapter.id)
                        .sort((a, b) => a.order - b.order);
                    return _jsx(ChapterCard, { chapter: chapter, index: index, paragraphs: paragraphs }, chapter.id);
                }) }) }) }));
}
//# sourceMappingURL=MacroView.js.map