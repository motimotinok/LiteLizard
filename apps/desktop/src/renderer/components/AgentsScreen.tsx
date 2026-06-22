import React, { useEffect, useMemo, useState } from 'react';
import {
  DEFAULT_READING_AGENT_TEMPERATURE,
  buildNewReadingAgentPrompt,
  type AnalysisResult,
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
}

function createNewDraft(): AgentDraft {
  const name = '新しいエージェント';
  const role = '指定した観点で文章を評価する';
  return {
    name,
    role,
    systemPrompt: buildNewReadingAgentPrompt(name, role),
    model: '',
    temperature: String(DEFAULT_READING_AGENT_TEMPERATURE),
  };
}

function toDraft(agent: ReadingAgent): AgentDraft {
  return {
    id: agent.id,
    name: agent.name,
    role: agent.role,
    systemPrompt: agent.systemPrompt,
    model: agent.model ?? '',
    temperature: String(agent.temperature),
  };
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
            <h2 className="settings-section-title">モデル設定</h2>
          </div>
          <div className="settings-row">
            <div>
              <div className="settings-row-label">使用モデル</div>
              <div className="settings-row-hint">空欄なら既定</div>
            </div>
            <input
              type="text"
              className="settings-input"
              value={draft.model}
              placeholder="gpt-4o-mini"
              onChange={(event) => setDraft((current) => ({ ...current, model: event.target.value }))}
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
