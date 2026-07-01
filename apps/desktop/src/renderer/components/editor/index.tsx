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
  linkedHighlightParagraphId: string | null;
  scrollRequest: { paragraphId: string; nonce: number } | null;
  setActiveParagraphId: (id: string | null) => void;
  onRequestScrollToAnalysis?: (id: string) => void;
  onPreviewParagraphLink?: (id: string | null) => void;
  analysisRailVisible?: boolean;
  onSelectAnalysisRailParagraph?: (id: string) => void;
  onSetViewScale: (viewScale: 'micro' | 'macro') => void;
  onSyncStructure: (input: DocumentStructureInput) => void;
  onReorderParagraphs?: (orderedIds: string[]) => void;
  onReorderChapters?: (orderedIds: string[]) => void;
  onDeleteChapter?: (chapterId: string) => void;
  onCreateEssay: () => void;
  onOpenFolder: () => void;
}

function analysisRailStatus(paragraph: LiteLizardDocument['paragraphs'][number]) {
  if (paragraph.lizard.status === 'complete') {
    return '分析済み';
  }
  if (paragraph.lizard.status === 'pending') {
    return '解析中';
  }
  if (paragraph.lizard.status === 'failed') {
    return '失敗';
  }
  if (paragraph.lizard.status === 'stale' && paragraph.lizard.analyzedAt) {
    return '要再解析';
  }
  return '未分析';
}

function analysisResponseText(paragraph: LiteLizardDocument['paragraphs'][number]) {
  return paragraph.lizard.response?.trim() || paragraph.lizard.deepMeaning?.trim() || '';
}

function analysisRailSummary(paragraph: LiteLizardDocument['paragraphs'][number]) {
  if (paragraph.lizard.status === 'complete') {
    return analysisResponseText(paragraph) || '生成結果が空です。';
  }
  if (paragraph.lizard.status === 'pending') {
    return '解析中です。完了後に読みが表示されます。';
  }
  if (paragraph.lizard.status === 'failed') {
    return paragraph.lizard.error?.message
      ? `解析に失敗しました。${paragraph.lizard.error.message}`
      : '解析に失敗しました。';
  }
  if (paragraph.lizard.status === 'stale' && paragraph.lizard.analyzedAt) {
    return analysisResponseText(paragraph) || '本文更新後の再解析が必要です。';
  }
  return 'まだ分析されていません。';
}

function AnalysisReadingRail({
  document,
  activeParagraphId,
  linkedHighlightParagraphId,
  onSelectParagraph,
  onPreviewParagraphLink,
}: {
  document: LiteLizardDocument;
  activeParagraphId: string | null;
  linkedHighlightParagraphId: string | null;
  onSelectParagraph?: (id: string) => void;
  onPreviewParagraphLink?: (id: string | null) => void;
}) {
  return (
    <aside className="editor-analysis-rail" aria-label="段落ごとの読み">
      {document.paragraphs.map((paragraph) => (
        <button
          key={paragraph.id}
          type="button"
          className={[
            'editor-analysis-rail-row',
            paragraph.id === activeParagraphId ? 'is-active' : '',
            paragraph.id === linkedHighlightParagraphId ? 'is-linked' : '',
            `is-${paragraph.lizard.status}`,
          ]
            .filter(Boolean)
            .join(' ')}
          onClick={() => onSelectParagraph?.(paragraph.id)}
          onMouseEnter={() => onPreviewParagraphLink?.(paragraph.id)}
          onMouseLeave={() => onPreviewParagraphLink?.(null)}
          onFocus={() => onPreviewParagraphLink?.(paragraph.id)}
          onBlur={() => onPreviewParagraphLink?.(null)}
        >
          <span className="editor-analysis-rail-index">{paragraph.order}</span>
          <span className="editor-analysis-rail-copy">{analysisRailSummary(paragraph)}</span>
          <span className="editor-analysis-rail-status">{analysisRailStatus(paragraph)}</span>
        </button>
      ))}
    </aside>
  );
}

export function EditorPane({
  document,
  viewScale,
  activeParagraphId,
  linkedHighlightParagraphId,
  scrollRequest,
  setActiveParagraphId,
  onRequestScrollToAnalysis,
  onPreviewParagraphLink,
  analysisRailVisible = false,
  onSelectAnalysisRailParagraph,
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
      <div className={analysisRailVisible ? 'editor-frame with-analysis-rail' : 'editor-frame'}>
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
              linkedHighlightParagraphId={linkedHighlightParagraphId}
              scrollRequest={scrollRequest}
              setActiveParagraphId={setActiveParagraphId}
              onRequestScrollToAnalysis={onRequestScrollToAnalysis}
              onPreviewParagraphLink={onPreviewParagraphLink}
              onSyncStructure={onSyncStructure}
              onReorderParagraphs={onReorderParagraphs}
            />
          )}
        </div>
        {analysisRailVisible && viewScale === 'micro' ? (
          <AnalysisReadingRail
            document={document}
            activeParagraphId={activeParagraphId}
            linkedHighlightParagraphId={linkedHighlightParagraphId}
            onSelectParagraph={onSelectAnalysisRailParagraph}
            onPreviewParagraphLink={onPreviewParagraphLink}
          />
        ) : null}
      </div>
    </section>
  );
}
