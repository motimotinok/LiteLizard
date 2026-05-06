import React, { useEffect, useMemo, useState } from 'react';
import type { AnalysisSettings, LiteLizardDocument } from '@litelizard/shared';
import type { AnalysisMode } from '../store/useAppStore.js';
import { reorderByKey } from '../utils/arrayUtils.js';
import { aggregateChapterAnalyses } from '../utils/chapterAnalysisAggregation.js';
import { ChapterSummaryList } from './ChapterSummaryList.js';
import { useAppStore } from '../store/useAppStore.js';
import {
  getVisiblePatternIndices,
  resolveDisplayedPatternIndex,
} from '../store/analysisHistory.js';
import { toKanjiIndex } from './ui/kanji.js';
import { IconChevronDown, IconPlay, IconPlus, IconRefresh } from './ui/icons.js';

interface Props {
  document: LiteLizardDocument | null;
  activeParagraphId: string | null;
  linkedHighlightParagraphId?: string | null;
  onSetActiveParagraphId?: (id: string | null) => void;
  onPreviewParagraphLink?: (id: string | null) => void;
  onReorderParagraphs?: (orderedIds: string[]) => void;
  onRequestScrollToParagraph?: (id: string) => void;
}

function statusLabel(
  status: LiteLizardDocument['paragraphs'][number]['lizard']['status'],
  hasPreviousAnalysis: boolean,
) {
  if (status === 'pending') {
    return '解析中です。完了後に生成結果が表示されます。';
  }
  if (status === 'failed') {
    return '解析に失敗しました。再実行してください。';
  }
  if (status === 'stale') {
    return hasPreviousAnalysis
      ? '本文が更新されました。再解析してください。'
      : 'まだ解析されていません。';
  }
  return '生成結果はまだありません。';
}

function getAnalysisProviderUiState(analysisSettings: AnalysisSettings) {
  if (analysisSettings.defaultProvider === 'openai') {
    const configured = analysisSettings.providers.openai.apiKeyConfigured;
    return {
      label: 'OpenAI',
      configured,
      runnable: configured,
      missingTitle: 'OpenAI API キーを設定すると解析を開始できます。',
      missingBody: '設定画面で OpenAI のキーを保存してください。',
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
      missingBody: '設定画面で Anthropic のキーを保存してください。',
      disabledTitle: 'Anthropic API キーが未設定です',
    };
  }

  return {
    label: 'Local LLM',
    configured: analysisSettings.localLlm.configured,
    runnable: analysisSettings.localLlm.configured,
    missingTitle: 'ローカル LLM の設定が必要です。',
    missingBody: '設定画面でエンドポイントとモデル名を保存してください。',
    disabledTitle: 'ローカル LLM が未設定です',
  };
}

const analysisModeOptions: Array<{
  id: AnalysisMode;
  label: string;
  status: string;
}> = [
  { id: 'paragraph', label: '段落', status: '実行可' },
  { id: 'chapter', label: '章', status: '準備中' },
  { id: 'document', label: '全体', status: '準備中' },
];

function analysisModeRunLabel(mode: AnalysisMode) {
  if (mode === 'paragraph') {
    return '段落を読ませる';
  }
  if (mode === 'chapter') {
    return '章解析は準備中です';
  }
  return '全体解析は準備中です';
}

export function AnalysisPane({
  document,
  activeParagraphId,
  linkedHighlightParagraphId = null,
  onSetActiveParagraphId,
  onPreviewParagraphLink,
  onReorderParagraphs,
  onRequestScrollToParagraph,
}: Props) {
  const runAnalysis = useAppStore((s) => s.runAnalysis);
  const runAnalysisFor = useAppStore((s) => s.runAnalysisFor);
  const openSettingsPanel = useAppStore((s) => s.openSettingsPanel);
  const openAgentsPanel = useAppStore((s) => s.openAgentsPanel);
  const analysisSettings = useAppStore((s) => s.analysisSettings);
  const analysisMode = useAppStore((s) => s.analysisMode);
  const setAnalysisMode = useAppStore((s) => s.setAnalysisMode);
  const analysisRunSummary = useAppStore((s) => s.analysisRunSummary);
  const analysisHistoriesByParagraphId = useAppStore((s) => s.analysisHistoriesByParagraphId);
  const selectedPatternIndexByParagraphId = useAppStore((s) => s.selectedPatternIndexByParagraphId);
  const selectAnalysisPatternIndex = useAppStore((s) => s.selectAnalysisPatternIndex);
  const agents = useAppStore((s) => s.agents);
  const activeAgentId = useAppStore((s) => s.activeAgentId);
  const agentsLoaded = useAppStore((s) => s.agentsLoaded);
  const setActiveAgent = useAppStore((s) => s.setActiveAgent);
  const viewScale = useAppStore((s) => s.viewScale);
  const providerUi = getAnalysisProviderUiState(analysisSettings);
  const chapterSummaries = useMemo(() => aggregateChapterAnalyses(document), [document]);

  const staleCount = document?.paragraphs.filter((p) => p.lizard.status === 'stale').length ?? 0;
  const hasPending = document?.paragraphs.some((p) => p.lizard.status === 'pending') ?? false;
  const selectedModeImplemented = analysisMode === 'paragraph';
  const generateAllDisabled =
    !selectedModeImplemented || staleCount === 0 || hasPending || !providerUi.runnable || !activeAgentId;

  const [agentMenuOpen, setAgentMenuOpen] = useState(false);
  const [expandedByParagraphId, setExpandedByParagraphId] = useState<Record<string, boolean>>({});
  const [draggingParagraphId, setDraggingParagraphId] = useState<string | null>(null);
  const [dropTargetParagraphId, setDropTargetParagraphId] = useState<string | null>(null);

  const activeAgent = useMemo(
    () => agents.find((agent) => agent.id === activeAgentId) ?? agents[0] ?? null,
    [activeAgentId, agents],
  );

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

  useEffect(() => {
    const close = () => setAgentMenuOpen(false);
    if (agentMenuOpen) {
      window.addEventListener('click', close);
      return () => window.removeEventListener('click', close);
    }
    return undefined;
  }, [agentMenuOpen]);

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

  const runButtonTitle = !providerUi.runnable
    ? providerUi.disabledTitle
    : !selectedModeImplemented
      ? '章解析と全体解析は今後の実装対象です'
      : !activeAgentId
        ? '分析エージェントを選択してください'
        : hasPending
          ? '解析実行中です'
          : staleCount === 0
            ? '再解析が必要な段落はありません'
            : `${staleCount}件の段落を解析`;

  return (
    <aside className="analysis-shell" aria-label="analysis-panel">
      <header className="analysis-header">
        <div className="analysis-section-label">Reading Agent</div>
        <div className="agent-select" onClick={(event) => event.stopPropagation()}>
          <button
            type="button"
            className="agent-select-trigger"
            onClick={() => setAgentMenuOpen((value) => !value)}
            aria-haspopup="listbox"
            aria-expanded={agentMenuOpen}
          >
            <span className="agent-select-trigger-label">
              <span className="agent-select-trigger-dot" aria-hidden />
              <span className="agent-select-trigger-name">
                {activeAgent?.name ?? (agentsLoaded ? '未設定' : '読み込み中')}
              </span>
              <span className="agent-select-trigger-desc">
                {activeAgent?.role ?? '分析エージェント'}
              </span>
            </span>
            <IconChevronDown size={13} />
          </button>
          {agentMenuOpen ? (
            <div className="agent-select-menu" role="listbox">
              {agents.length > 0 ? agents.map((agent) => (
                <button
                  key={agent.id}
                  type="button"
                  className={
                    agent.id === activeAgent?.id
                      ? 'agent-select-option is-active'
                      : 'agent-select-option'
                  }
                  onClick={() => {
                    void setActiveAgent(agent.id);
                    setAgentMenuOpen(false);
                  }}
                >
                  <div className="agent-select-option-name">{agent.name}</div>
                  <div className="agent-select-option-desc">{agent.role}</div>
                </button>
              )) : (
                <div className="agent-select-option-name" style={{ padding: '10px 12px' }}>
                  分析エージェントがありません
                </div>
              )}
              <div className="agent-select-divider" />
              <button
                type="button"
                className="agent-select-create"
                onClick={() => {
                  setAgentMenuOpen(false);
                  openAgentsPanel();
                }}
              >
                <IconPlus size={12} /> 新しいエージェントを作成
              </button>
            </div>
          ) : null}
        </div>
        <div className="analysis-mode-control" role="radiogroup" aria-label="分析モード">
          {analysisModeOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              className={
                option.id === analysisMode
                  ? 'analysis-mode-option is-active'
                  : 'analysis-mode-option'
              }
              role="radio"
              aria-checked={option.id === analysisMode}
              onClick={() => setAnalysisMode(option.id)}
            >
              <span className="analysis-mode-option-label">{option.label}</span>
              <span className="analysis-mode-option-status">{option.status}</span>
            </button>
          ))}
        </div>
        <button
          type="button"
          className="analysis-run-button"
          onClick={runAnalysis}
          disabled={generateAllDisabled}
          title={runButtonTitle}
        >
          <IconPlay size={10} /> {analysisModeRunLabel(analysisMode)}
        </button>
        {analysisRunSummary ? (
          <div className="analysis-run-summary" aria-label="解析実行結果">
            <span>対象 {analysisRunSummary.targetCount}</span>
            <span>成功 {analysisRunSummary.successCount}</span>
            <span>失敗 {analysisRunSummary.failureCount}</span>
          </div>
        ) : null}
      </header>

      {!document ? (
        <div className="analysis-empty">ドキュメントを開くと分析カードが表示されます。</div>
      ) : (
        <div className="analysis-scroll">
          {!providerUi.runnable ? (
            <div className="analysis-settings-callout">
              <strong>{providerUi.missingTitle}</strong>
              <p>{providerUi.missingBody}</p>
              <button
                type="button"
                className="analysis-settings-link"
                onClick={() => openSettingsPanel()}
              >
                設定を開く
              </button>
            </div>
          ) : null}
          {viewScale === 'macro' ? (
            <ChapterSummaryList summaries={chapterSummaries} />
          ) : (
          <div className="analysis-card-list">
            {document.paragraphs.map((paragraph, index) => {
              const expanded = Boolean(expandedByParagraphId[paragraph.id]);
              const active = paragraph.id === activeParagraphId;
              const isLinkedHighlight = paragraph.id === linkedHighlightParagraphId;
              const isDragging = draggingParagraphId === paragraph.id;
              const isDropTarget = dropTargetParagraphId === paragraph.id;
              const isComplete = paragraph.lizard.status === 'complete';
              const confidence =
                typeof paragraph.lizard.confidence === 'number'
                  ? Math.round(paragraph.lizard.confidence * 100)
                  : null;
              const history = analysisHistoriesByParagraphId[paragraph.id];
              const hasHistory = Array.isArray(history) && history.length > 0;
              const hasPreviousAnalysis = hasHistory || Boolean(paragraph.lizard.analyzedAt);
              const isStaleWithPreviousAnalysis =
                paragraph.lizard.status === 'stale' && hasPreviousAnalysis;
              const statusText = statusLabel(paragraph.lizard.status, hasPreviousAnalysis);
              const tags = [
                ...(paragraph.lizard.theme ?? []),
                ...(paragraph.lizard.emotion ?? []),
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
                    isLinkedHighlight ? 'analysis-card-linked-highlight' : '',
                    isDragging ? 'analysis-card-dragging' : '',
                    isDropTarget ? 'analysis-card-drop-target' : '',
                    isStaleWithPreviousAnalysis ? 'analysis-card-stale' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => {
                    onSetActiveParagraphId?.(paragraph.id);
                    onRequestScrollToParagraph?.(paragraph.id);
                  }}
                  onMouseEnter={() => onPreviewParagraphLink?.(paragraph.id)}
                  onMouseLeave={() => onPreviewParagraphLink?.(null)}
                  onFocus={() => onPreviewParagraphLink?.(paragraph.id)}
                  onBlur={() => onPreviewParagraphLink?.(null)}
                >
                  <header className="analysis-card-header">
                    <div className="analysis-card-heading">
                      <span className="analysis-card-index">{toKanjiIndex(index + 1)}</span>
                      {isStaleWithPreviousAnalysis ? (
                        <span
                          className="analysis-card-stale-badge"
                          title="本文が更新されました。再解析してください。"
                        >
                          要再解析
                        </span>
                      ) : null}
                    </div>

                    <div className="analysis-card-actions">
                      {confidence !== null ? (
                        <span className="analysis-card-meta-confidence" title="解析の確度">
                          {confidence}
                        </span>
                      ) : null}

                      <button
                        type="button"
                        className="analysis-card-icon-button"
                        onClick={(event) => {
                          event.stopPropagation();
                          runAnalysisFor(paragraph.id);
                        }}
                        disabled={paragraph.lizard.status === 'pending' || hasPending || !providerUi.runnable}
                        title="この段落だけ再解析"
                        aria-label={`${toKanjiIndex(index + 1)} を再解析`}
                      >
                        <IconRefresh size={11} />
                      </button>

                      <button
                        type="button"
                        className="analysis-card-icon-button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setExpandedByParagraphId((current) => ({
                            ...current,
                            [paragraph.id]: !current[paragraph.id],
                          }));
                        }}
                        title={expanded ? '折りたたむ' : '全文を表示'}
                        aria-label={expanded ? '折りたたむ' : '全文を表示'}
                      >
                        {expanded ? '−' : '＋'}
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
                            aria-label="前の解析結果を表示"
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
                            aria-label="次の解析結果を表示"
                          >
                            &gt;
                          </button>
                        </div>
                      ) : null}

                      <button
                        type="button"
                        className="analysis-card-icon-button analysis-card-drag-handle"
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
                        aria-label="ドラッグして並び替え"
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
                            <React.Fragment key={`${paragraph.id}-${tag}-${tagIndex}`}>
                              {tagIndex > 0 ? (
                                <span className="analysis-tag-separator" aria-hidden>
                                  ·
                                </span>
                              ) : null}
                              <li className="analysis-tag">{tag}</li>
                            </React.Fragment>
                          ))}
                        </ul>
                      ) : null}

                      <p
                        className={
                          expanded ? 'analysis-card-body analysis-card-body-expanded' : 'analysis-card-body'
                        }
                      >
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
          )}
        </div>
      )}
    </aside>
  );
}

