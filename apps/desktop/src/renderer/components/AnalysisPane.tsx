import React, { useEffect, useMemo, useState } from 'react';
import type { LiteLizardDocument } from '@litelizard/shared';
import { reorderNodeKeys } from './EditorPane.js';

type AnalysisMode = 'structure' | 'reader';

interface Props {
  document: LiteLizardDocument | null;
  activeParagraphId: string | null;
  mode: AnalysisMode;
  onSetActiveParagraphId?: (id: string | null) => void;
  onReorderParagraphs?: (orderedIds: string[]) => void;
  onRequestScrollToParagraph?: (id: string) => void;
}

interface DummyResult {
  summary: string;
  generatedAt: string;
  tone: string;
}

function makeDummyResult(text: string, index: number): DummyResult {
  const normalized = text.trim();
  const preview = normalized.length > 0 ? normalized : '（空段落）';
  const sentence = preview.length > 90 ? `${preview.slice(0, 90)}…` : preview;
  const tones = ['内省的', '分析的', '説明的', '叙情的', '率直'];
  const tone = tones[index % tones.length];
  const generatedAt = new Date().toLocaleString('ja-JP', {
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

  return {
    tone,
    generatedAt,
    summary: `この段落は${tone}な調子で主題を進めています。要点: ${sentence}`,
  };
}

function roleByIndex(index: number, total: number) {
  if (total <= 1) {
    return '全体要約';
  }
  if (index === 0) {
    return '導入';
  }
  if (index === total - 1) {
    return '結び';
  }
  return '展開';
}

export function AnalysisPane({
  document,
  activeParagraphId,
  mode,
  onSetActiveParagraphId,
  onReorderParagraphs,
  onRequestScrollToParagraph,
}: Props) {
  const [dummyByParagraphId, setDummyByParagraphId] = useState<Map<string, DummyResult>>(new Map());
  const [expandedByParagraphId, setExpandedByParagraphId] = useState<Record<string, boolean>>({});
  const [draggingParagraphId, setDraggingParagraphId] = useState<string | null>(null);
  const [dropTargetParagraphId, setDropTargetParagraphId] = useState<string | null>(null);

  useEffect(() => {
    if (!document) {
      setDummyByParagraphId(new Map());
      setExpandedByParagraphId({});
      return;
    }

    const nextIds = new Set(document.paragraphs.map((paragraph) => paragraph.id));

    setDummyByParagraphId((current) => {
      const next = new Map(current);
      for (const paragraph of document.paragraphs) {
        if (!next.has(paragraph.id)) {
          next.set(paragraph.id, makeDummyResult(paragraph.light.text, paragraph.order - 1));
        }
      }

      for (const existingId of next.keys()) {
        if (!nextIds.has(existingId)) {
          next.delete(existingId);
        }
      }
      return next;
    });

    setExpandedByParagraphId((current) => {
      const next: Record<string, boolean> = {};
      Object.entries(current).forEach(([paragraphId, expanded]) => {
        if (nextIds.has(paragraphId)) {
          next[paragraphId] = expanded;
        }
      });
      return next;
    });
  }, [document]);

  const orderedParagraphIds = useMemo(() => {
    if (!document) {
      return [];
    }
    return document.paragraphs.map((paragraph) => paragraph.id);
  }, [document]);

  const modeLabel = mode === 'reader' ? '読み手視点の確認モード（Phase1は骨格）' : '構造推敲モード';

  const onDropReorder = (activeId: string, overId: string) => {
    if (!document || !onReorderParagraphs) {
      return;
    }
    const nextOrder = reorderNodeKeys(orderedParagraphIds, activeId, overId);
    if (nextOrder === orderedParagraphIds) {
      return;
    }
    onReorderParagraphs(nextOrder);
  };

  return (
    <section className="analysis-shell analysis-shell-chat">
      <header className="analysis-header">
        <div className="analysis-title-wrap">
          <span className="analysis-title-icon" aria-hidden>
            🧭
          </span>
          <div>
            <h2 className="analysis-title">段落生成結果</h2>
            <p className="analysis-subtitle">{modeLabel}</p>
          </div>
        </div>
      </header>

      {!document ? (
        <div className="analysis-empty">ドキュメントを開くと分析カードが表示されます。</div>
      ) : mode === 'reader' ? (
        <div className="analysis-reader-placeholder">
          <h3>読み手視点モード（準備中）</h3>
          <p>Phase1では骨格のみ実装しています。Phase3で段落折りたたみ、強調語、感情曲線を追加します。</p>
        </div>
      ) : (
        <div className="analysis-scroll">
          <div className="analysis-card-list">
            {document.paragraphs.map((paragraph, index) => {
              const result = dummyByParagraphId.get(paragraph.id) ?? makeDummyResult(paragraph.light.text, index);
              const expanded = Boolean(expandedByParagraphId[paragraph.id]);
              const active = paragraph.id === activeParagraphId;
              const isDragging = draggingParagraphId === paragraph.id;
              const isDropTarget = dropTargetParagraphId === paragraph.id;

              return (
                <article
                  key={paragraph.id}
                  className={[
                    'analysis-card',
                    active ? 'analysis-card-active' : '',
                    isDragging ? 'analysis-card-dragging' : '',
                    isDropTarget ? 'analysis-card-drop-target' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => {
                    onSetActiveParagraphId?.(paragraph.id);
                    onRequestScrollToParagraph?.(paragraph.id);
                  }}
                >
                  <header className="analysis-card-header">
                    <div className="analysis-card-heading">
                      <span className="analysis-card-index">P{String(index + 1).padStart(2, '0')}</span>
                      <span className="analysis-card-role">{roleByIndex(index, document.paragraphs.length)}</span>
                    </div>

                    <div className="analysis-card-actions">
                      <button
                        type="button"
                        className="analysis-card-toggle"
                        onClick={(event) => {
                          event.stopPropagation();
                          setExpandedByParagraphId((current) => ({
                            ...current,
                            [paragraph.id]: !current[paragraph.id],
                          }));
                        }}
                      >
                        {expanded ? '折りたたむ' : '全文'}
                      </button>

                      <button
                        type="button"
                        className="analysis-card-drag-handle"
                        draggable
                        onClick={(event) => event.stopPropagation()}
                        onDragStart={(event) => {
                          event.dataTransfer.setData('text/plain', paragraph.id);
                          event.dataTransfer.effectAllowed = 'move';
                          setDraggingParagraphId(paragraph.id);
                          setDropTargetParagraphId(null);
                        }}
                        onDragOver={(event) => {
                          event.preventDefault();
                          setDropTargetParagraphId(paragraph.id);
                        }}
                        onDrop={(event) => {
                          event.preventDefault();
                          const draggedId = event.dataTransfer.getData('text/plain');
                          if (!draggedId || draggedId === paragraph.id) {
                            setDraggingParagraphId(null);
                            setDropTargetParagraphId(null);
                            return;
                          }
                          onDropReorder(draggedId, paragraph.id);
                          setDraggingParagraphId(null);
                          setDropTargetParagraphId(null);
                        }}
                        onDragEnd={() => {
                          setDraggingParagraphId(null);
                          setDropTargetParagraphId(null);
                        }}
                        aria-label={`P${index + 1} をドラッグ`}
                        title="ドラッグして並び替え"
                      >
                        ⋮⋮
                      </button>
                    </div>
                  </header>

                  <div className="analysis-card-meta">
                    <span>{result.tone}</span>
                    <span>{result.generatedAt}</span>
                  </div>

                  <p className={expanded ? 'analysis-card-body analysis-card-body-expanded' : 'analysis-card-body'}>
                    {result.summary}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
