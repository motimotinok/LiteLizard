import React, { useEffect, useMemo, useState } from 'react';
import type { AnalysisSettings, LiteLizardDocument } from '@litelizard/shared';
import { reorderByKey } from '../utils/arrayUtils.js';
import { useAppStore } from '../store/useAppStore.js';
import {
  getVisiblePatternIndices,
  resolveDisplayedPatternIndex,
} from '../store/analysisHistory.js';

interface Props {
  document: LiteLizardDocument | null;
  activeParagraphId: string | null;
  onSetActiveParagraphId?: (id: string | null) => void;
  onReorderParagraphs?: (orderedIds: string[]) => void;
  onRequestScrollToParagraph?: (id: string) => void;
}

type TagStyle = { background: string; borderColor: string; color: string };

const EMOTION_COLOR_MAP: Record<string, TagStyle> = {
  '期待':   { background: '#fef9c3', borderColor: '#fde68a', color: '#713f12' },
  '安心':   { background: '#dcfce7', borderColor: '#86efac', color: '#14532d' },
  '孤独':   { background: '#dbeafe', borderColor: '#93c5fd', color: '#1e3a5f' },
  '後悔':   { background: '#ede9fe', borderColor: '#c4b5fd', color: '#4c1d95' },
  '焦り':   { background: '#fee2e2', borderColor: '#fca5a5', color: '#7f1d1d' },
  '内省':   { background: '#ccfbf1', borderColor: '#5eead4', color: '#134e4a' },
  '罪悪感': { background: '#fce7f3', borderColor: '#f9a8d4', color: '#831843' },
  '緊張':   { background: '#fff7ed', borderColor: '#fdba74', color: '#7c2d12' },
  '納得':   { background: '#ecfeff', borderColor: '#a5f3fc', color: '#164e63' },
  '集中':   { background: '#f0fdf4', borderColor: '#bbf7d0', color: '#166534' },
};

const FALLBACK_PALETTE: TagStyle[] = [
  { background: '#f3f4f6', borderColor: '#d1d5db', color: '#374151' },
  { background: '#fdf4ff', borderColor: '#e9d5ff', color: '#6b21a8' },
  { background: '#fff1f2', borderColor: '#fecdd3', color: '#881337' },
  { background: '#f0fdf4', borderColor: '#bbf7d0', color: '#166534' },
];

function hashString(s: string): number {
  let h = 0;
  for (const c of s) h = (Math.imul(31, h) + c.charCodeAt(0)) | 0;
  return Math.abs(h);
}

function getEmotionStyle(emotion: string): TagStyle {
  return EMOTION_COLOR_MAP[emotion] ?? FALLBACK_PALETTE[hashString(emotion) % FALLBACK_PALETTE.length];
}

function statusLabel(
  status: LiteLizardDocument['paragraphs'][number]['lizard']['status'],
  hasHistory: boolean,
) {
  if (status === 'pending') {
    return '解析中です。完了後に生成結果が表示されます。';
  }
  if (status === 'failed') {
    return '解析に失敗しました。再実行してください。';
  }
  if (status === 'stale') {
    return hasHistory
      ? '本文が更新されました。再解析してください。'
      : 'まだ解析されていません。';
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

function getAnalysisProviderUiState(analysisSettings: AnalysisSettings) {
  if (analysisSettings.defaultProvider === 'openai') {
    const configured = analysisSettings.providers.openai.apiKeyConfigured;
    return {
      label: 'OpenAI',
      configured,
      runnable: configured,
      missingTitle: 'OpenAI API キーを設定すると解析を開始できます。',
      missingBody: '歯車アイコンから設定画面を開き、OpenAI のキーを保存してください。',
      disabledTitle: 'OpenAI API キーが未設定です',
    };
  }

  if (analysisSettings.defaultProvider === 'anthropic') {
    const configured = analysisSettings.providers.anthropic.apiKeyConfigured;
    return {
      label: 'Anthropic',
      configured,
      runnable: configured,
      missingTitle: 'Anthropic API キーを設定すると解析を開始できます。',
      missingBody: '歯車アイコンから設定画面を開き、Anthropic のキーを保存してください。',
      disabledTitle: 'Anthropic API キーが未設定です',
    };
  }

  return {
    label: 'Local LLM',
    configured: false,
    runnable: false,
    missingTitle: 'ローカル LLM はまだ解析実行に対応していません。',
    missingBody: '現時点では OpenAI または Anthropic を既定 provider に選んでください。',
    disabledTitle: 'ローカル LLM は未対応です',
  };
}

export function AnalysisPane({
  document,
  activeParagraphId,
  onSetActiveParagraphId,
  onReorderParagraphs,
  onRequestScrollToParagraph,
}: Props) {
  const runAnalysis = useAppStore((s) => s.runAnalysis);
  const runAnalysisFor = useAppStore((s) => s.runAnalysisFor);
  const openSettingsPanel = useAppStore((s) => s.openSettingsPanel);
  const analysisSettings = useAppStore((s) => s.analysisSettings);
  const analysisHistoriesByParagraphId = useAppStore((s) => s.analysisHistoriesByParagraphId);
  const selectedPatternIndexByParagraphId = useAppStore((s) => s.selectedPatternIndexByParagraphId);
  const selectAnalysisPatternIndex = useAppStore((s) => s.selectAnalysisPatternIndex);
  const providerUi = getAnalysisProviderUiState(analysisSettings);

  const staleCount = document?.paragraphs.filter((p) => p.lizard.status === 'stale').length ?? 0;
  const hasPending = document?.paragraphs.some((p) => p.lizard.status === 'pending') ?? false;
  const generateAllDisabled = staleCount === 0 || hasPending || !providerUi.runnable;

  const [analysisMode, setAnalysisMode] = useState<'paragraph' | 'chapter-summary' | 'theme'>('paragraph');
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
            ¶
          </span>
          <div>
            <h2 className="analysis-title">段落解析</h2>
            <p className="analysis-subtitle">各段落の感情・テーマ・解釈</p>
          </div>
        </div>
        <button
          type="button"
          className="analysis-generate-btn"
          onClick={runAnalysis}
          disabled={generateAllDisabled}
          title={
            !providerUi.runnable
              ? providerUi.disabledTitle
              : hasPending
                ? '解析実行中です'
                : staleCount === 0
                  ? '再解析が必要な段落はありません'
                  : `${staleCount}件の段落を解析`
          }
        >
          生成
        </button>
        <select
          className="analysis-mode-select"
          value={analysisMode}
          onChange={(e) => setAnalysisMode(e.target.value as 'paragraph' | 'chapter-summary' | 'theme')}
        >
          <option value="paragraph">段落解析</option>
          <option value="chapter-summary">章サマリー</option>
          <option value="theme">テーマ分析</option>
        </select>
      </header>

      {!document ? (
        <div className="analysis-empty">ドキュメントを開くと分析カードが表示されます。</div>
      ) : (
        <div className="analysis-scroll">
          {!providerUi.runnable ? (
            <div className="analysis-settings-callout">
              <div>
                <strong>{providerUi.missingTitle}</strong>
                <p>{providerUi.missingBody}</p>
              </div>
              <button type="button" className="analysis-settings-link" onClick={() => openSettingsPanel()}>
                設定を開く
              </button>
            </div>
          ) : null}
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
              const history = analysisHistoriesByParagraphId[paragraph.id];
              const hasHistory = Array.isArray(history) && history.length > 0;
              const isStaleWithHistory = paragraph.lizard.status === 'stale' && hasHistory;
              const statusText = statusLabel(paragraph.lizard.status, hasHistory);
              const tags = [
                ...(paragraph.lizard.theme ?? []).map((value) => ({ value, kind: 'theme' as const })),
                ...(paragraph.lizard.emotion ?? []).map((value) => ({ value, kind: 'emotion' as const })),
              ];
              const visiblePatternIndices = getVisiblePatternIndices(history, paragraph.light.text);
              const activePatternIndex = resolveDisplayedPatternIndex(
                history,
                paragraph.light.text,
                selectedPatternIndexByParagraphId[paragraph.id],
              );
              const activePatternPosition =
                activePatternIndex === null ? 0 : visiblePatternIndices.indexOf(activePatternIndex) + 1;
              const canMoveToPreviousPattern = activePatternPosition > 1;
              const canMoveToNextPattern =
                activePatternIndex !== null && activePatternPosition < visiblePatternIndices.length;
              const showHistoryNavigation = visiblePatternIndices.length > 1;

              return (
                <article
                  key={paragraph.id}
                  className={[
                    'analysis-card',
                    active ? 'analysis-card-active' : '',
                    isDragging ? 'analysis-card-dragging' : '',
                    isDropTarget ? 'analysis-card-drop-target' : '',
                    isStaleWithHistory ? 'analysis-card-stale' : '',
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
                      {isStaleWithHistory ? (
                        <span
                          className="analysis-card-stale-badge"
                          title="本文が更新されました。再解析してください。"
                        >
                          要再解析
                        </span>
                      ) : null}
                    </div>

                    <div className="analysis-card-actions">
                      <button
                        type="button"
                        className="analysis-card-regen-btn"
                        onClick={(event) => {
                          event.stopPropagation();
                          runAnalysisFor(paragraph.id);
                        }}
                        disabled={paragraph.lizard.status === 'pending' || hasPending || !providerUi.runnable}
                        title="この段落だけ再解析"
                        aria-label={`P${index + 1} を再解析`}
                      >
                        ↺
                      </button>

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

                      {showHistoryNavigation ? (
                        <div
                          className="analysis-card-history-nav"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <button
                            type="button"
                            className="analysis-card-history-btn"
                            disabled={!canMoveToPreviousPattern}
                            onClick={() => {
                              if (!canMoveToPreviousPattern || activePatternIndex === null) {
                                return;
                              }
                              selectAnalysisPatternIndex(
                                paragraph.id,
                                visiblePatternIndices[activePatternPosition - 2],
                              );
                            }}
                            aria-label={`P${index + 1} の前の解析結果を表示`}
                          >
                            &lt;
                          </button>
                          <span className="analysis-card-history-index">
                            {activePatternPosition} / {visiblePatternIndices.length}
                          </span>
                          <button
                            type="button"
                            className="analysis-card-history-btn"
                            disabled={!canMoveToNextPattern}
                            onClick={() => {
                              if (!canMoveToNextPattern || activePatternIndex === null) {
                                return;
                              }
                              selectAnalysisPatternIndex(
                                paragraph.id,
                                visiblePatternIndices[activePatternPosition],
                              );
                            }}
                            aria-label={`P${index + 1} の次の解析結果を表示`}
                          >
                            &gt;
                          </button>
                        </div>
                      ) : null}

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
                              style={tag.kind === 'emotion' ? getEmotionStyle(tag.value) : undefined}
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
