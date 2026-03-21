import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
export function ChapterCard({ chapter, index, paragraphs }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: chapter.id });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };
    const previewText = paragraphs
        .slice()
        .sort((a, b) => a.order - b.order)
        .map((p) => p.light.text.trim())
        .join(' ');
    return (_jsxs("article", { ref: setNodeRef, style: style, className: isDragging ? 'editor-macro-card editor-macro-card-dragging' : 'editor-macro-card', children: [_jsxs("header", { className: "editor-macro-card-header", children: [_jsxs("span", { className: "editor-macro-card-index", children: ["C", String(index + 1).padStart(2, '0')] }), _jsx("h3", { className: "editor-macro-card-title", children: chapter.title }), _jsx("button", { className: "macro-card-drag-handle", type: "button", "aria-label": `${chapter.title} をドラッグして並び替え`, title: "\u30C9\u30E9\u30C3\u30B0\u3057\u3066\u4E26\u3073\u66FF\u3048", ...attributes, ...listeners, children: "\u22EE\u22EE" })] }), _jsx("p", { className: "editor-macro-card-preview macro-card-preview-dense", children: previewText || '（空の章）' }), _jsxs("footer", { className: "editor-macro-card-footer", children: [paragraphs.length, " \u6BB5\u843D"] })] }));
}
//# sourceMappingURL=ChapterCard.js.map