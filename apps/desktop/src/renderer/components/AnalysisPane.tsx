import React, { useEffect, useMemo, useState } from 'react';
import type { AnalysisSettings, LiteLizardDocument, ReadingAgent } from '@litelizard/shared';
import type { AnalysisMode } from '../store/useAppStore.js';
import { ChapterSummaryList } from './ChapterSummaryList.js';
import { AnalysisRunConfirm } from './AnalysisRunConfirm.js';
import { useAppStore } from '../store/useAppStore.js';
import { aggregateChapterAnalyses } from '../utils/chapterAnalysisAggregation.js';
import { IconChevronDown, IconChevronRight, IconPlay, IconPlus, IconRefresh } from './ui/icons.js';

interface Props {
  document: LiteLizardDocument | null;
  activeParagraphId: string | null;
  onSetActiveParagraphId?: (id: string | null) => void;
  onRequestScrollToParagraph?: (id: string) => void;
}

interface ParagraphChatMessage {
  id: string;
  role: 'user' | 'assistant';
  body: string;
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
      missingTitle: 'OpenAI API キーを保存すると、この段落を読ませられます。',
      missingBody: '設定画面でキーを保存したあと、ここに戻って「段落を読ませる」を押してください。',
      disabledTitle: 'OpenAI API キーが未設定です',
    };
  }

  if (analysisSettings.defaultProvider === 'anthropic') {
    const configured = analysisSettings.providers.anthropic.apiKeyConfigured;
    return {
      label: 'Anthropic',
      configured,
      runnable: configured,
      missingTitle: 'Anthropic API キーを保存すると、この段落を読ませられます。',
      missingBody: '設定画面でキーを保存したあと、ここに戻って「段落を読ませる」を押してください。',
      disabledTitle: 'Anthropic API キーが未設定です',
    };
  }

  return {
    label: 'Local LLM',
    configured: analysisSettings.localLlm.configured,
    runnable: analysisSettings.localLlm.configured,
    missingTitle: 'ローカル LLM を保存すると、この段落を読ませられます。',
    missingBody: '設定画面でエンドポイントとモデル名を保存したあと、ここに戻って実行してください。',
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

const FOLLOWUP_SYSTEM_PROMPT_MAX_LENGTH = 8000;

function clampFollowupSystemPrompt(basePrompt: string, suffix: string) {
  const separator = '\n\n---\n';
  const baseBudget = FOLLOWUP_SYSTEM_PROMPT_MAX_LENGTH - separator.length - suffix.length;
  const safeBasePrompt =
    baseBudget > 0 ? basePrompt.trim().slice(0, baseBudget).trimEnd() : '';
  return `${safeBasePrompt}${separator}${suffix}`.slice(0, FOLLOWUP_SYSTEM_PROMPT_MAX_LENGTH);
}

function buildFollowupAgent(agent: ReadingAgent, question: string, previousAnalysis: string) {
  const analysisContext = previousAnalysis.trim()
    ? `既存分析:\n${previousAnalysis.trim()}`
    : '既存分析: まだ保存済みの分析結果はありません。';
  const followupPrompt = `LiteLizard 段落限定の追加質問:
対象はユーザーが現在フォーカスしている1段落だけです。本文を自動で書き換えず、既存分析を必要な範囲で参照し、次の質問に答えてください。

${analysisContext}

質問:
${question.trim()}`;

  return {
    name: agent.name,
    role: agent.role,
    model: agent.model,
    contextPolicy: { mode: 'target-only' as const },
    tagDefinitions: agent.tagDefinitions,
    systemPrompt: clampFollowupSystemPrompt(agent.systemPrompt, followupPrompt),
  };
}

function analysisResponseText(paragraph: LiteLizardDocument['paragraphs'][number]) {
  return paragraph.lizard.response?.trim() || paragraph.lizard.deepMeaning?.trim() || '';
}

function analysisTags(paragraph: LiteLizardDocument['paragraphs'][number]) {
  const explicitTags = paragraph.lizard.tags
    ? Object.values(paragraph.lizard.tags).flatMap((values) => values)
    : [];
  if (explicitTags.length > 0) {
    return explicitTags;
  }
  return [
    ...(paragraph.lizard.theme ?? []),
    ...(paragraph.lizard.emotion ?? []),
  ];
}

export function AnalysisPane({
  document,
  activeParagraphId,
  onSetActiveParagraphId,
  onRequestScrollToParagraph,
}: Props) {
  const requestAnalysisRun = useAppStore((s) => s.requestAnalysisRun);
  const confirmAnalysisRun = useAppStore((s) => s.confirmAnalysisRun);
  const cancelAnalysisRun = useAppStore((s) => s.cancelAnalysisRun);
  const pendingAnalysisRun = useAppStore((s) => s.pendingAnalysisRun);
  const runAnalysisFor = useAppStore((s) => s.runAnalysisFor);
  const openSettingsPanel = useAppStore((s) => s.openSettingsPanel);
  const openAgentsPanel = useAppStore((s) => s.openAgentsPanel);
  const analysisSettings = useAppStore((s) => s.analysisSettings);
  const analysisMode = useAppStore((s) => s.analysisMode);
  const setAnalysisMode = useAppStore((s) => s.setAnalysisMode);
  const analysisAdditionalInstruction = useAppStore((s) => s.analysisAdditionalInstruction);
  const setAnalysisAdditionalInstruction = useAppStore((s) => s.setAnalysisAdditionalInstruction);
  const analysisRunSummary = useAppStore((s) => s.analysisRunSummary);
  const agents = useAppStore((s) => s.agents);
  const activeAgentId = useAppStore((s) => s.activeAgentId);
  const agentsLoaded = useAppStore((s) => s.agentsLoaded);
  const setActiveAgent = useAppStore((s) => s.setActiveAgent);
  const dryRunAgent = useAppStore((s) => s.dryRunAgent);
  const viewScale = useAppStore((s) => s.viewScale);
  const providerUi = getAnalysisProviderUiState(analysisSettings);
  const chapterSummaries = useMemo(() => aggregateChapterAnalyses(document), [document]);

  const staleCount = document?.paragraphs.filter((p) => p.lizard.status === 'stale').length ?? 0;
  const hasPending = document?.paragraphs.some((p) => p.lizard.status === 'pending') ?? false;
  const selectedModeImplemented = analysisMode === 'paragraph';
  const generateAllDisabled =
    !selectedModeImplemented || staleCount === 0 || hasPending || !providerUi.runnable || !activeAgentId;

  const [agentMenuOpen, setAgentMenuOpen] = useState(false);
  const [draftByParagraphId, setDraftByParagraphId] = useState<Record<string, string>>({});
  const [messagesByParagraphId, setMessagesByParagraphId] = useState<Record<string, ParagraphChatMessage[]>>({});
  const [sendingParagraphId, setSendingParagraphId] = useState<string | null>(null);

  const activeAgent = useMemo(
    () => agents.find((agent) => agent.id === activeAgentId) ?? agents[0] ?? null,
    [activeAgentId, agents],
  );

  const focusedParagraph = useMemo(
    () => document?.paragraphs.find((paragraph) => paragraph.id === activeParagraphId) ?? null,
    [activeParagraphId, document],
  );

  const selectedMessages = focusedParagraph ? messagesByParagraphId[focusedParagraph.id] ?? [] : [];
  const draft = focusedParagraph ? draftByParagraphId[focusedParagraph.id] ?? '' : '';
  const previousAnalysis = focusedParagraph ? analysisResponseText(focusedParagraph) : '';
  const hasPreviousAnalysis = Boolean(focusedParagraph?.lizard.analyzedAt || previousAnalysis);
  const focusedStatusText = focusedParagraph
    ? statusLabel(focusedParagraph.lizard.status, hasPreviousAnalysis)
    : '';
  const tags = focusedParagraph ? analysisTags(focusedParagraph) : [];
  const canSendFollowup = Boolean(
    focusedParagraph &&
      activeAgent &&
      providerUi.runnable &&
      draft.trim() &&
      sendingParagraphId !== focusedParagraph.id,
  );

  useEffect(() => {
    const close = () => setAgentMenuOpen(false);
    if (agentMenuOpen) {
      window.addEventListener('click', close);
      return () => window.removeEventListener('click', close);
    }
    return undefined;
  }, [agentMenuOpen]);

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

  const submitFollowup = async () => {
    if (!focusedParagraph || !activeAgent || !draft.trim()) {
      return;
    }

    const question = draft.trim();
    const targetParagraph = focusedParagraph;
    const userMessage: ParagraphChatMessage = {
      id: `${targetParagraph.id}-u-${Date.now()}`,
      role: 'user',
      body: question,
    };

    setDraftByParagraphId((current) => ({ ...current, [targetParagraph.id]: '' }));
    setMessagesByParagraphId((current) => ({
      ...current,
      [targetParagraph.id]: [...(current[targetParagraph.id] ?? []), userMessage],
    }));
    setSendingParagraphId(targetParagraph.id);

    try {
      const result = await dryRunAgent({
        agent: buildFollowupAgent(activeAgent, question, analysisResponseText(targetParagraph)),
        paragraphId: targetParagraph.id,
        text: targetParagraph.light.text,
        order: targetParagraph.order,
      });
      const assistantMessage: ParagraphChatMessage = {
        id: `${targetParagraph.id}-a-${Date.now()}`,
        role: 'assistant',
        body: result.response.trim() || '応答が空でした。',
      };
      setMessagesByParagraphId((current) => ({
        ...current,
        [targetParagraph.id]: [...(current[targetParagraph.id] ?? []), assistantMessage],
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : '追加質問に失敗しました。';
      setMessagesByParagraphId((current) => ({
        ...current,
        [targetParagraph.id]: [
          ...(current[targetParagraph.id] ?? []),
          {
            id: `${targetParagraph.id}-e-${Date.now()}`,
            role: 'assistant',
            body: `追加質問に失敗しました: ${message}`,
          },
        ],
      }));
    } finally {
      setSendingParagraphId(null);
    }
  };

  return (
    <aside className="analysis-shell analysis-shell-focused" aria-label="analysis-panel">
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
                  className={agent.id === activeAgent?.id ? 'agent-select-option is-active' : 'agent-select-option'}
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
                  openAgentsPanel({ intent: 'new' });
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
              className={option.id === analysisMode ? 'analysis-mode-option is-active' : 'analysis-mode-option'}
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
          onClick={requestAnalysisRun}
          disabled={generateAllDisabled || pendingAnalysisRun !== null}
          title={runButtonTitle}
        >
          <IconPlay size={10} /> {analysisModeRunLabel(analysisMode)}
        </button>
        <label className="analysis-run-instruction">
          <span>今回だけの観点</span>
          <textarea
            value={analysisAdditionalInstruction}
            onChange={(event) => setAnalysisAdditionalInstruction(event.target.value)}
            rows={2}
            maxLength={2000}
            placeholder="例: 初見読者として引っかかる場所だけ見る"
          />
        </label>
        <div className="analysis-focus-actions">
          <button
            type="button"
            className="analysis-focus-link"
            onClick={() => onSetActiveParagraphId?.(null)}
          >
            全体へ戻る
          </button>
          {focusedParagraph ? (
            <button
              type="button"
              className="analysis-focus-link"
              onClick={() => onRequestScrollToParagraph?.(focusedParagraph.id)}
            >
              本文へ
            </button>
          ) : null}
        </div>
        {!pendingAnalysisRun && analysisRunSummary ? (
          <div className="analysis-run-summary" aria-label="解析実行結果">
            <span>対象 {analysisRunSummary.targetCount}</span>
            <span>成功 {analysisRunSummary.successCount}</span>
            <span>失敗 {analysisRunSummary.failureCount}</span>
          </div>
        ) : null}
      </header>
      {pendingAnalysisRun ? (
        <AnalysisRunConfirm
          estimate={pendingAnalysisRun.estimate}
          agentName={pendingAnalysisRun.agentName}
          targetScopeLabel={pendingAnalysisRun.targetScopeLabel}
          contextPolicyLabel={pendingAnalysisRun.contextPolicyLabel}
          referencedParagraphCount={pendingAnalysisRun.referencedParagraphCount}
          hasAdditionalInstruction={pendingAnalysisRun.hasAdditionalInstruction}
          onCancel={cancelAnalysisRun}
          onConfirm={() => {
            void confirmAnalysisRun();
          }}
        />
      ) : null}

      {!document || !focusedParagraph ? (
        <div className="analysis-empty">本文横の読みから段落を選ぶと詳細が表示されます。</div>
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
            <article className="analysis-focus-card" data-analysis-paragraph-id={focusedParagraph.id}>
              <header className="analysis-focus-card-header">
                <div className="analysis-focus-kicker">
                  <span>{focusedParagraph.order}</span>
                  <span>{activeAgent?.name ?? 'Reading Agent'}</span>
                </div>
                <button
                  type="button"
                  className="analysis-card-icon-button"
                  onClick={() => {
                    void runAnalysisFor(focusedParagraph.id);
                  }}
                  disabled={focusedParagraph.lizard.status === 'pending' || hasPending || !providerUi.runnable}
                  title="この段落だけ再解析"
                  aria-label={`${focusedParagraph.order} を再解析`}
                >
                  <IconRefresh size={11} />
                </button>
              </header>
              {tags.length > 0 ? (
                <ul className="analysis-tag-list">
                  {tags.map((tag, tagIndex) => (
                    <React.Fragment key={`${focusedParagraph.id}-${tag}-${tagIndex}`}>
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
              {focusedParagraph.lizard.status === 'complete' || previousAnalysis ? (
                <p className="analysis-focus-body">
                  {previousAnalysis || '生成結果が空です。'}
                </p>
              ) : (
                <p className="analysis-card-status">
                  {focusedStatusText}
                  {focusedParagraph.lizard.status === 'failed' && focusedParagraph.lizard.error?.message
                    ? ` (${focusedParagraph.lizard.error.message})`
                    : ''}
                </p>
              )}
              <form
                className="analysis-followup"
                onSubmit={(event) => {
                  event.preventDefault();
                  void submitFollowup();
                }}
              >
                {selectedMessages.length > 0 ? (
                  <div className="analysis-followup-log" aria-label={`${focusedParagraph.order} の追加質問`}>
                    {selectedMessages.map((message) => (
                      <p
                        key={message.id}
                        className={
                          message.role === 'user'
                            ? 'analysis-followup-message is-user'
                            : 'analysis-followup-message is-assistant'
                        }
                      >
                        {message.body}
                      </p>
                    ))}
                  </div>
                ) : null}
                <label className="analysis-followup-input">
                  <span>この段落について聞く</span>
                  <textarea
                    value={draft}
                    onChange={(event) => {
                      const nextValue = event.target.value;
                      setDraftByParagraphId((current) => ({
                        ...current,
                        [focusedParagraph.id]: nextValue,
                      }));
                    }}
                    rows={selectedMessages.length > 0 ? 3 : 2}
                    placeholder="なぜそう読まれたのか、この段落だけ直すならどこか、など"
                  />
                </label>
                <button type="submit" className="analysis-followup-send" disabled={!canSendFollowup}>
                  {sendingParagraphId === focusedParagraph.id ? '送信中' : '送信'}
                  <IconChevronRight size={12} />
                </button>
              </form>
            </article>
          )}
        </div>
      )}
    </aside>
  );
}
