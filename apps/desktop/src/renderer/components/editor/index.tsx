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
  onDeleteChapter?: (chapterId: string) => void;
  onCreateEssay: () => void;
  onOpenFolder: () => void;
}

export function EditorPane({
  document,
  viewScale,
  activeParagraphId,
  scrollRequest,
  setActiveParagraphId,
  onSetViewScale,
  onSyncStructure,
  onReorderParagraphs,
  onReorderChapters,
  onDeleteChapter,
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
    return <EditorEmptyState onCreateEssay={onCreateEssay} onOpenFolder={onOpenFolder} />;
  }

  return (
    <section className="editor-shell">
      <div className="editor-frame">
        <div className="editor-body" ref={setEditorBodyEl}>
          <header className="editor-title">
            <h1 className="editor-title-name">{document.title}</h1>
            <div className="editor-title-rule" />
          </header>
          {viewScale === 'macro' ? (
            <MacroView document={document} onReorderChapters={onReorderChapters} onDeleteChapter={onDeleteChapter} />
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
      </div>
    </section>
  );
}
