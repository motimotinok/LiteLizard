import React, { useEffect, useState } from 'react';
import type { LiteLizardDocument } from '@litelizard/shared';
import type { DocumentStructureInput } from '../../types/documentStructure.js';
import { EditorEmptyState } from './EditorEmptyState.js';
import { MicroEditorView } from './MicroEditorView.js';
import { MacroView } from './MacroView.js';

interface Props {
  isExpanded: boolean;
  document: LiteLizardDocument | null;
  dirty: boolean;
  viewScale: 'micro' | 'macro';
  activeParagraphId: string | null;
  scrollRequest: { paragraphId: string; nonce: number } | null;
  setActiveParagraphId: (id: string | null) => void;
  onSetViewScale: (viewScale: 'micro' | 'macro') => void;
  onSyncStructure: (input: DocumentStructureInput) => void;
  onReorderParagraphs?: (orderedIds: string[]) => void;
  onReorderChapters?: (orderedIds: string[]) => void;
  onCreateEssay: () => void;
  onOpenFolder: () => void;
}

export function EditorPane({
  isExpanded,
  document,
  dirty,
  viewScale,
  activeParagraphId,
  scrollRequest,
  setActiveParagraphId,
  onSetViewScale,
  onSyncStructure,
  onReorderParagraphs,
  onReorderChapters,
  onCreateEssay,
  onOpenFolder,
}: Props) {
  const [editorBodyEl, setEditorBodyEl] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!editorBodyEl) {
      return;
    }

    const onWheel = (event: WheelEvent) => {
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
    return (
      <EditorEmptyState
        isExpanded={isExpanded}
        onCreateEssay={onCreateEssay}
        onOpenFolder={onOpenFolder}
      />
    );
  }

  const charCount = document.paragraphs.reduce((sum, paragraph) => sum + paragraph.light.text.length, 0);

  return (
    <section className={isExpanded ? 'editor-shell editor-shell-expanded' : 'editor-shell'}>
      <div className="editor-frame">
        <div className="editor-body" ref={setEditorBodyEl}>
          {viewScale === 'macro' ? (
            <MacroView document={document} onReorderChapters={onReorderChapters} />
          ) : (
            <MicroEditorView
              document={document}
              activeParagraphId={activeParagraphId}
              scrollRequest={scrollRequest}
              setActiveParagraphId={setActiveParagraphId}
              onSyncStructure={onSyncStructure}
              onReorderParagraphs={onReorderParagraphs}
            />
          )}
        </div>

        <footer className="editor-footer">
          <div className="editor-footer-left">
            <span>{charCount} 文字</span>
          </div>
        </footer>
      </div>
    </section>
  );
}
