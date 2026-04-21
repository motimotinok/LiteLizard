import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { EditorEmptyState } from './EditorEmptyState.js';
import { MicroEditorView } from './MicroEditorView.js';
import { MacroView } from './MacroView.js';
export function EditorPane({ isExpanded, document, dirty, viewScale, activeParagraphId, scrollRequest, setActiveParagraphId, onSetViewScale, onSyncStructure, onReorderParagraphs, onReorderChapters, onDeleteChapter, onCreateEssay, onOpenFolder, }) {
    const [editorBodyEl, setEditorBodyEl] = useState(null);
    useEffect(() => {
        if (!editorBodyEl) {
            return;
        }
        const onWheel = (event) => {
            if (!(event.ctrlKey || event.metaKey)) {
                return;
            }
            event.preventDefault();
            onSetViewScale(event.deltaY > 0 ? 'macro' : 'micro');
        };
        editorBodyEl.addEventListener('wheel', onWheel, { passive: false });
        return () => {
            editorBodyEl.removeEventListener('wheel', onWheel);
        };
    }, [onSetViewScale, editorBodyEl]);
    if (!document) {
        return (_jsx(EditorEmptyState, { isExpanded: isExpanded, onCreateEssay: onCreateEssay, onOpenFolder: onOpenFolder }));
    }
    const charCount = document.paragraphs.reduce((sum, paragraph) => sum + paragraph.light.text.length, 0);
    return (_jsx("section", { className: isExpanded ? 'editor-shell editor-shell-expanded' : 'editor-shell', children: _jsxs("div", { className: "editor-frame", children: [_jsx("div", { className: "editor-body", ref: setEditorBodyEl, children: viewScale === 'macro' ? (_jsx(MacroView, { document: document, onReorderChapters: onReorderChapters, onDeleteChapter: onDeleteChapter })) : (_jsx(MicroEditorView, { document: document, activeParagraphId: activeParagraphId, scrollRequest: scrollRequest, setActiveParagraphId: setActiveParagraphId, onSyncStructure: onSyncStructure, onReorderParagraphs: onReorderParagraphs })) }), _jsx("footer", { className: "editor-footer", children: _jsx("div", { className: "editor-footer-left", children: _jsxs("span", { children: [charCount, " \u6587\u5B57"] }) }) })] }) }));
}
//# sourceMappingURL=index.js.map