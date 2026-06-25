import React, { useEffect, useMemo, useState } from 'react';
import {
  DEFAULT_ANALYSIS_CONTEXT_POLICY,
  DEFAULT_READING_AGENT_TEMPERATURE,
  buildNewReadingAgentPrompt,
  getProviderModelOptions,
  isKnownProviderModel,
  type AnalysisResult,
  type AnalysisContextPolicy,
  type ReadingAgent,
  type ReadingAgentInput,
} from '@litelizard/shared';
import { useAppStore } from '../store/useAppStore.js';
import { AuxShell } from './ui/AuxShell.js';
import { CenteredHeader } from './ui/CenteredHeader.js';
import { toKanjiIndex } from './ui/kanji.js';
import { IconPlus, IconRefresh } from './ui/icons.js';
import type { LeftIconRailPanel } from './LeftIconRail.js';

interface AgentDraft {
  id?: string;
  name: string;
  role: string;
  systemPrompt: string;
  model: string;
  temperature: string;
  contextMode: AnalysisContextPolicy['mode'];
  contextRange: 'all' | 'lastN';
  contextLastN: string;
}

const DEFAULT_AGENT_MODEL_OPTION = '__default_agent_model__';
const CUSTOM_AGENT_MODEL_OPTION = '__custom_agent_model__';

function createNewDraft(): AgentDraft {
  const name = '新しいエージェント';
  const role = '指定した観点で文章を評価する';
  return {
    name,
    role,
    systemPrompt: buildNewReadingAgentPrompt(name, role),
    model: '',
    temperature: String(DEFAULT_READING_AGENT_TEMPERATURE),
    contextMode: DEFAULT_ANALYSIS_CONTEXT_POLICY.mode,
    contextRange: 'all',
    contextLastN: '10',
  };
}

function policyToDraft(policy: AnalysisContextPolicy) {
  if (policy.mode === 'preceding') {
    return {
      contextMode: policy.mode,
      contextRange: policy.range,
      contextLastN: policy.range === 'lastN' ? String(policy.lastN) : '10',
    };
  }
  return {
    contextMode: policy.mode,
    contextRange: 'all' as const,
    contextLastN: '10',
  };
}

function toDraft(agent: ReadingAgent): AgentDraft {
  const contextDraft = policyToDraft(agent.contextPolicy);
  return {
    id: agent.id,
    name: agent.name,
    role: agent.role,
    systemPrompt: agent.systemPrompt,
    model: agent.model ?? '',
    temperature: String(agent.temperature),
    ...contextDraft,
  };
}

function toContextPolicy(draft: AgentDraft): AnalysisContextPolicy {
  if (draft.contextMode === 'preceding') {
    if (draft.contextRange === 'lastN') {
      return {
        mode: 'preceding',
        range: 'lastN',
        lastN: Number(draft.contextLastN),
      };
    }
    return { mode: 'preceding', range: 'all' };
  }
  if (draft.contextMode === 'target-only') {
    return { mode: 'target-only' };
  }
  return { mode: 'whole-document' };
}

function toInput(draft: AgentDraft): ReadingAgentInput & { id?: string } {
  const temperature = Number(draft.temperature);
  return {
    id: draft.id,
    name: draft.name.trim(),
    role: draft.role.trim(),
    systemPrompt: draft.systemPrompt.trim(),
    model: draft.model.trim() || null,
    temperature,
    contextPolicy: toContextPolicy(draft),
  };
}

function validateDraft(draft: AgentDraft): string | null {
  if (!draft.name.trim()) return '名前を入力してください。';
  if (!draft.role.trim()) return '役割を入力してください。';
  if (!draft.systemPrompt.trim()) return 'プロンプトを入力してください。';
  const temperatureText = draft.temperature.trim();
  if (temperatureText === '') {
    return '温度を入力してください。';
  }
  const temperature = Number(temperatureText);
  if (!Number.isFinite(temperature) || temperature < 0 || temperature > 1) {
    return '温度は 0〜1 の範囲で入力してください。';
  }
  if (draft.contextMode === 'preceding' && draft.contextRange === 'lastN') {
    const lastN = Number(draft.contextLastN);
    if (!Number.isInteger(lastN) || lastN < 1 || lastN > 999) {
      return '参照段落数は 1〜999 の範囲で入力してください。';
    }
  }
  return null;
}

function sameDraft(a: AgentDraft, b: AgentDraft) {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function AgentsScreen() {
  const openEditorPanel = useAppStore((s) => s.openEditorPanel);
  const openAgentsPanel = useAppStore((s) => s.openAgentsPanel);
  const openSettingsPanel = useAppStore((s) => s.openSettingsPanel);
  const openSearchPanel = useAppStore((s) => s.openSearchPanel);
  const agents = useAppStore((s) => s.agents);
  const activeAgentId = useAppStore((s) => s.activeAgentId);
  const agentsLoaded = useAppStore((s) => s.agentsLoaded);
  const document = useAppStore((s) => s.document);
  const setActiveAgent = useAppStore((s) => s.setActiveAgent);
  const saveAgent = useAppStore((s) => s.saveAgent);
  const deleteAgent = useAppStore((s) => s.deleteAgent);
  const resetAgents = useAppStore((s) => s.resetAgents);
  const dryRunAgent = useAppStore((s) => s.dryRunAgent);
  const consumeAgentsScreenIntent = useAppStore((s) => s.consumeAgentsScreenIntent);

  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(activeAgentId);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [draft, setDraft] = useState<AgentDraft>(createNewDraft);
  const [baseDraft, setBaseDraft] = useState<AgentDraft>(createNewDraft);
  const [formError, setFormError] = useState<string | null>(null);
  const [preview, setPreview] = useState<AnalysisResult | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewRunning, setPreviewRunning] = useState(false);

  const selectedAgent = useMemo(
    () => agents.find((agent) => agent.id === selectedAgentId) ?? null,
    [agents, selectedAgentId],
  );
  const dirty = !sameDraft(draft, baseDraft);

  useEffect(() => {
    const intent = consumeAgentsScreenIntent();
    if (intent === 'new') {
      const nextDraft = createNewDraft();
      setSelectedAgentId(null);
      setIsCreatingNew(true);
      setDraft(nextDraft);
      setBaseDraft({ ...nextDraft, name: '' });
      setFormError(null);
      setPreview(null);
      setPreviewError(null);
    }
  }, [consumeAgentsScreenIntent]);

  useEffect(() => {
    if (isCreatingNew) return;
    if (!agentsLoaded || agents.length === 0) return;
    if (selectedAgentId && agents.some((agent) => agent.id === selectedAgentId)) return;
    setSelectedAgentId(activeAgentId && agents.some((agent) => agent.id === activeAgentId) ? activeAgentId : agents[0].id);
  }, [activeAgentId, agents, agentsLoaded, isCreatingNew, selectedAgentId]);

  useEffect(() => {
    if (!selectedAgent) return;
    const nextDraft = toDraft(selectedAgent);
    setDraft(nextDraft);
    setBaseDraft(nextDraft);
    setFormError(null);
    setPreview(null);
    setPreviewError(null);
  }, [selectedAgent]);

  const handleSelectPanel = (panel: LeftIconRailPanel) => {
    if (panel === 'editor') openEditorPanel();
    else if (panel === 'agents') openAgentsPanel();
    else if (panel === 'settings') openSettingsPanel();
    else if (panel === 'search') openSearchPanel();
  };

  const handleNew = () => {
    const nextDraft = createNewDraft();
    setSelectedAgentId(null);
    setIsCreatingNew(true);
    setDraft(nextDraft);
    setBaseDraft({ ...nextDraft, name: '' });
    setFormError(null);
    setPreview(null);
    setPreviewError(null);
  };

  const handleSave = async () => {
    const validation = validateDraft(draft);
    if (validation) {
      setFormError(validation);
      return;
    }
    try {
      const saved = await saveAgent(toInput(draft));
      const nextDraft = toDraft(saved);
      setIsCreatingNew(false);
      setSelectedAgentId(saved.id);
      setDraft(nextDraft);
      setBaseDraft(nextDraft);
      setFormError(null);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : '保存に失敗しました。');
    }
  };

  const handleDelete = async () => {
    if (!draft.id) return;
    if (!window.confirm(`${draft.name || 'このエージェント'}を削除しますか？`)) return;
    try {
      await deleteAgent(draft.id);
      setIsCreatingNew(false);
      setSelectedAgentId(null);
      setPreview(null);
      setPreviewError(null);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : '削除に失敗しました。');
    }
  };

  const handleDuplicate = () => {
    setSelectedAgentId(null);
    setIsCreatingNew(true);
    setDraft({
      ...draft,
      id: undefined,
      name: `${draft.name || '読者'} の複製`,
    });
    setBaseDraft({ ...draft, id: undefined, name: '' });
    setPreview(null);
    setPreviewError(null);
  };

  const handleReset = async () => {
    if (!window.confirm('分析エージェントを初期状態に戻しますか？')) return;
    try {
      const reset = await resetAgents();
      setIsCreatingNew(false);
      setSelectedAgentId(reset[0]?.id ?? null);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'リセットに失敗しました。');
    }
  };

  const handleSelectAgent = (id: string) => {
    setIsCreatingNew(false);
    setSelectedAgentId(id);
  };

  const handleDryRun = async () => {
    const validation = validateDraft(draft);
    if (validation) {
      setFormError(validation);
      return;
    }
    const paragraph = document?.paragraphs.find((entry) => entry.light.text.trim().length > 0);
    if (!paragraph) {
      setPreviewError('ドキュメントを開き、本文のある段落を用意してください。');
      return;
    }

    setPreviewRunning(true);
    setPreview(null);
    setPreviewError(null);
    try {
      const result = await dryRunAgent({
        agent: toInput(draft),
        paragraphId: paragraph.id,
        order: paragraph.order,
        text: paragraph.light.text,
      });
      setPreview(result);
    } catch (error) {
      setPreviewError(error instanceof Error ? error.message : 'サンプル実行に失敗しました。');
    } finally {
      setPreviewRunning(false);
    }
  };

  const sidebar = (
    <>
      <div className="sidebar-section-header">
        <span className="sidebar-section-label">Reading Agents</span>
        <div className="sidebar-section-actions">
          <button type="button" className="sidebar-icon-button" title="新規作成" aria-label="新規作成" onClick={handleNew}>
            <IconPlus size={13} />
          </button>
          <button type="button" className="sidebar-icon-button" title="リセット" aria-label="リセット" onClick={handleReset}>
            <IconRefresh size={13} />
          </button>
        </div>
      </div>
      <div style={{ padding: '0 8px', flex: 1, overflow: 'auto' }}>
        {!agentsLoaded ? <div className="agents-sidebar-empty">読み込み中</div> : null}
        {agents.map((entry, index) => (
          <button
            key={entry.id}
            type="button"
            className={
              selectedAgentId === entry.id ? 'agents-sidebar-item is-active' : 'agents-sidebar-item'
            }
            onClick={() => handleSelectAgent(entry.id)}
          >
            <div className="agents-sidebar-row">
              <span className="agents-sidebar-kanji">{toKanjiIndex(index + 1)}</span>
              <span className="agents-sidebar-name">{entry.name}</span>
              {activeAgentId === entry.id ? <span className="agents-sidebar-active">選択中</span> : null}
            </div>
            <div className="agents-sidebar-desc">{entry.role}</div>
          </button>
        ))}
      </div>
    </>
  );

  const titlebar = (
    <div className="workspace-titlebar" aria-hidden>
      <span className="workspace-titlebar-spacer" />
      <span className="workspace-titlebar-center">分析エージェント</span>
      <span className="workspace-titlebar-actions" />
    </div>
  );

  return (
    <AuxShell
      activePanel="agents"
      onSelectPanel={handleSelectPanel}
      sidebar={sidebar}
      titlebar={titlebar}
    >
      <div className="aux-content">
        <CenteredHeader overline="reading agent" title={draft.name || '新しいエージェント'} />

        <section className="settings-section">
          <div className="settings-section-heading">
            <span className="settings-section-kanji">{toKanjiIndex(1)}</span>
            <h2 className="settings-section-title">基本</h2>
            {dirty ? <span className="agents-dirty-badge">未保存</span> : null}
          </div>
          <div className="settings-row">
            <div>
              <div className="settings-row-label">名前</div>
            </div>
            <input
              type="text"
              className="settings-input"
              value={draft.name}
              onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
            />
          </div>
          <textarea
            className="settings-textarea"
            value={draft.role}
            onChange={(event) => setDraft((current) => ({ ...current, role: event.target.value }))}
            style={{ minHeight: 56 }}
          />
        </section>

        <section className="settings-section">
          <div className="settings-section-heading">
            <span className="settings-section-kanji">{toKanjiIndex(2)}</span>
            <h2 className="settings-section-title">プロンプト</h2>
          </div>
          <textarea
            className="settings-textarea settings-textarea-mono"
            value={draft.systemPrompt}
            onChange={(event) => setDraft((current) => ({ ...current, systemPrompt: event.target.value }))}
            style={{ minHeight: 280 }}
          />
          {formError ? <div className="agents-error">{formError}</div> : null}
          <div className="settings-actions-row">
            <span>{dirty ? '変更後は保存ボタンで適用されます。' : '保存済みです。'}</span>
            <div className="settings-actions-buttons">
              <button type="button" className="button-small" onClick={handleDryRun} disabled={previewRunning}>
                {previewRunning ? '実行中' : 'サンプルで試す'}
              </button>
              <button type="button" className="button-small" onClick={handleDuplicate}>
                複製
              </button>
              <button type="button" className="button-small" onClick={handleDelete} disabled={!draft.id || agents.length <= 1}>
                削除
              </button>
              <button type="button" className="button-small button-small-primary" onClick={() => void handleSave()} disabled={!dirty}>
                保存
              </button>
            </div>
          </div>
          {previewError ? <div className="agents-error">{previewError}</div> : null}
          {preview ? (
            <div className="agents-preview">
              <div className="agents-preview-row">
                <span>emotion</span>
                <strong>{preview.emotion.join(' / ') || 'なし'}</strong>
              </div>
              <div className="agents-preview-row">
                <span>theme</span>
                <strong>{preview.theme.join(' / ') || 'なし'}</strong>
              </div>
              <p>{preview.deepMeaning}</p>
              <div className="agents-preview-foot">
                <span>{preview.model}</span>
                <span>{Math.round(preview.confidence * 100)}%</span>
              </div>
            </div>
          ) : null}
        </section>

        <section className="settings-section">
          <div className="settings-section-heading">
            <span className="settings-section-kanji">{toKanjiIndex(3)}</span>
            <h2 className="settings-section-title">参照範囲</h2>
          </div>
          <div className="settings-row">
            <div>
              <div className="settings-row-label">読み方</div>
              <div className="settings-row-hint">分析対象を読むときに渡す本文</div>
            </div>
            <div className="settings-radio-group">
              <label className="settings-radio-option">
                <input
                  type="radio"
                  name="agent-context-mode"
                  value="whole-document"
                  checked={draft.contextMode === 'whole-document'}
                  onChange={() =>
                    setDraft((current) => ({ ...current, contextMode: 'whole-document' }))
                  }
                />
                全文参照
              </label>
              <label className="settings-radio-option">
                <input
                  type="radio"
                  name="agent-context-mode"
                  value="preceding"
                  checked={draft.contextMode === 'preceding'}
                  onChange={() =>
                    setDraft((current) => ({ ...current, contextMode: 'preceding' }))
                  }
                />
                先行文脈
              </label>
              <label className="settings-radio-option">
                <input
                  type="radio"
                  name="agent-context-mode"
                  value="target-only"
                  checked={draft.contextMode === 'target-only'}
                  onChange={() =>
                    setDraft((current) => ({ ...current, contextMode: 'target-only' }))
                  }
                />
                対象のみ
              </label>
            </div>
          </div>
          {draft.contextMode === 'preceding' ? (
            <>
              <div className="settings-row">
                <div>
                  <div className="settings-row-label">先行文脈</div>
                  <div className="settings-row-hint">対象より前をどこまで読むか</div>
                </div>
                <div className="settings-radio-group">
                  <label className="settings-radio-option">
                    <input
                      type="radio"
                      name="agent-context-range"
                      value="all"
                      checked={draft.contextRange === 'all'}
                      onChange={() =>
                        setDraft((current) => ({ ...current, contextRange: 'all' }))
                      }
                    />
                    先行全文
                  </label>
                  <label className="settings-radio-option">
                    <input
                      type="radio"
                      name="agent-context-range"
                      value="lastN"
                      checked={draft.contextRange === 'lastN'}
                      onChange={() =>
                        setDraft((current) => ({ ...current, contextRange: 'lastN' }))
                      }
                    />
                    直近N段落
                  </label>
                </div>
              </div>
              <div className="settings-row">
                <div>
                  <div className="settings-row-label">段落数</div>
                  <div className="settings-row-hint">直近N段落のときだけ使用</div>
                </div>
                <input
                  type="number"
                  className="settings-input"
                  value={draft.contextLastN}
                  min={1}
                  max={999}
                  step={1}
                  disabled={draft.contextRange !== 'lastN'}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, contextLastN: event.target.value }))
                  }
                />
              </div>
            </>
          ) : null}
        </section>

        <section className="settings-section">
          <div className="settings-section-heading">
            <span className="settings-section-kanji">{toKanjiIndex(4)}</span>
            <h2 className="settings-section-title">モデル設定</h2>
          </div>
          <div className="settings-row">
            <div>
              <div className="settings-row-label">使用モデル</div>
              <div className="settings-row-hint">既定 provider のモデルを上書きする場合だけ選択</div>
            </div>
            <AgentModelSelector
              value={draft.model}
              onChange={(model) => setDraft((current) => ({ ...current, model }))}
            />
          </div>
          <div className="settings-row">
            <div>
              <div className="settings-row-label">温度</div>
              <div className="settings-row-hint">0=決定的, 1=多様</div>
            </div>
            <input
              type="number"
              className="settings-input"
              value={draft.temperature}
              step={0.1}
              min={0}
              max={1}
              onChange={(event) => setDraft((current) => ({ ...current, temperature: event.target.value }))}
            />
          </div>
          {draft.id ? (
            <div className="settings-actions-row">
              <span>{activeAgentId === draft.id ? 'AnalysisPane で選択中です。' : 'この読者を解析に使えます。'}</span>
              <div className="settings-actions-buttons">
                <button
                  type="button"
                  className="button-small"
                  disabled={activeAgentId === draft.id}
                  onClick={() => void setActiveAgent(draft.id!)}
                >
                  解析に使う
                </button>
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </AuxShell>
  );
}

interface AgentModelSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

export function AgentModelSelector({ value, onChange }: AgentModelSelectorProps) {
  const trimmedValue = value.trim();
  const openAiOptions = getProviderModelOptions('openai');
  const anthropicOptions = getProviderModelOptions('anthropic');
  const knownProvider = isKnownProviderModel('openai', trimmedValue)
    ? 'openai'
    : isKnownProviderModel('anthropic', trimmedValue)
      ? 'anthropic'
      : null;
  const selectedValue = !trimmedValue
    ? DEFAULT_AGENT_MODEL_OPTION
    : knownProvider
      ? `${knownProvider}:${trimmedValue}`
      : CUSTOM_AGENT_MODEL_OPTION;

  return (
    <>
      <select
        className="settings-select"
        value={selectedValue}
        onChange={(event) => {
          const nextValue = event.target.value;
          if (nextValue === DEFAULT_AGENT_MODEL_OPTION) {
            onChange('');
            return;
          }
          if (nextValue === CUSTOM_AGENT_MODEL_OPTION) {
            onChange(knownProvider ? '' : value);
            return;
          }
          onChange(nextValue.slice(nextValue.indexOf(':') + 1));
        }}
      >
        <option value={DEFAULT_AGENT_MODEL_OPTION}>既定モデルを使う</option>
        <optgroup label="OpenAI">
          {openAiOptions.map((option) => (
            <option key={option.id} value={`openai:${option.id}`}>
              {option.label}
            </option>
          ))}
        </optgroup>
        <optgroup label="Anthropic">
          {anthropicOptions.map((option) => (
            <option key={option.id} value={`anthropic:${option.id}`}>
              {option.label}
            </option>
          ))}
        </optgroup>
        <option value={CUSTOM_AGENT_MODEL_OPTION}>カスタムモデルIDを入力</option>
      </select>
      {selectedValue === CUSTOM_AGENT_MODEL_OPTION ? (
        <input
          type="text"
          className="settings-input settings-input-mono"
          value={value}
          placeholder="provider のモデルID"
          onChange={(event) => onChange(event.target.value)}
          style={{ marginTop: 8 }}
        />
      ) : null}
    </>
  );
}
