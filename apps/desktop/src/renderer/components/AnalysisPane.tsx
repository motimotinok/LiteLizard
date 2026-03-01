import React, { useEffect, useMemo, useState } from 'react';
import type { LiteLizardDocument } from '@litelizard/shared';
import { reorderByKey } from '../utils/arrayUtils.js';

interface Props {
  document: LiteLizardDocument | null;
  activeParagraphId: string | null;
  onSetActiveParagraphId?: (id: string | null) => void;
  onReorderParagraphs?: (orderedIds: string[]) => void;
  onRequestScrollToParagraph?: (id: string) => void;
}

function statusLabel(document: LiteLizardDocument['paragraphs'][number]['lizard']['status']) {
  if (document === 'pending') {
    return '解析中です。完了後に生成結果が表示されます。';
  }
  if (document === 'failed') {
    return '解析に失敗しました。再実行してください。';
  }
  if (document === 'stale') {
    return '本文更新により再解析待ちです。';
  }
  return '生成結果はまだありません。';
}

function formatAnalyzedAt(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed.toLocaleString('ja-JP', {
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function AnalysisPane({
  document,
  activeParagraphId,
  onSetActiveParagraphId,
  onReorderParagraphs,
  onRequestScrollToParagraph,
}: Props) {
  const [expandedByParagraphId, setExpandedByParagraphId] = useState<Record<string, boolean>>({});
  const [draggingParagraphId, setDraggingParagraphId] = useState<string | null>(null);
  const [dropTargetParagraphId, setDropTargetParagraphId] = useState<string | null>(null);

  useEffect(() => {
    if (!document) {
      setExpandedByParagraphId({});
      return;
    }

    const nextIds = new Set(document.paragraphs.map((paragraph) => paragraph.id));

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

  const onDropReorder = (activeId: string, overId: string) => {
    if (!document || !onReorderParagraphs) {
      return;
    }
    const nextOrder = reorderByKey(orderedParagraphIds, activeId, overId);
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
            <p className="analysis-subtitle">保存済みの生成内容のみ表示</p>
          </div>
        </div>
      </header>

      {!document ? (
        <div className="analysis-empty">ドキュメントを開くと分析カードが表示されます。</div>
      ) : (
        <div className="analysis-scroll">
          <div className="analysis-card-list">
            {document.paragraphs.map((paragraph, index) => {
              const expanded = Boolean(expandedByParagraphId[paragraph.id]);
              const active = paragraph.id === activeParagraphId;
              const isDragging = draggingParagraphId === paragraph.id;
              const isDropTarget = dropTargetParagraphId === paragraph.id;
              const isComplete = paragraph.lizard.status === 'complete';
              const analyzedAt = paragraph.lizard.analyzedAt
                ? formatAnalyzedAt(paragraph.lizard.analyzedAt)
                : null;
              const confidence =
                typeof paragraph.lizard.confidence === 'number'
                  ? `${Math.round(paragraph.lizard.confidence * 100)}%`
                  : null;
              const statusText = statusLabel(paragraph.lizard.status);
              const tags = [
                ...(paragraph.lizard.theme ?? []).map((value) => ({ value, kind: 'theme' as const })),
                ...(paragraph.lizard.emotion ?? []).map((value) => ({ value, kind: 'emotion' as const })),
              ];

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

                  {isComplete ? (
                    <>
                      {tags.length > 0 ? (
                        <ul className="analysis-tag-list">
                          {tags.map((tag, tagIndex) => (
                            <li
                              key={`${paragraph.id}-${tag.kind}-${tag.value}-${tagIndex}`}
                              className={`analysis-tag analysis-tag-${tag.kind}`}
                            >
                              {tag.value}
                            </li>
                          ))}
                        </ul>
                      ) : null}

                      {confidence || analyzedAt ? (
                        <div className="analysis-card-meta">
                          {confidence ? <span>信頼度 {confidence}</span> : <span>信頼度 -</span>}
                          {analyzedAt ? <span>{analyzedAt}</span> : null}
                        </div>
                      ) : null}

                      <p className={expanded ? 'analysis-card-body analysis-card-body-expanded' : 'analysis-card-body'}>
                        {paragraph.lizard.deepMeaning?.trim() || '生成結果が空です。'}
                      </p>
                    </>
                  ) : (
                    <p className="analysis-card-status">
                      {statusText}
                      {paragraph.lizard.status === 'failed' && paragraph.lizard.error?.message
                        ? ` (${paragraph.lizard.error.message})`
                        : ''}
                    </p>
                  )}
                </article>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
