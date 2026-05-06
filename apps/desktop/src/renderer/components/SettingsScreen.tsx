import React, { useEffect, useMemo, useState } from 'react';
import type {
  AnalysisContextLimitMode,
  AnalysisContextScope,
  AnalysisProviderId,
} from '@litelizard/shared';
import { useAppStore } from '../store/useAppStore.js';
import { AuxShell } from './ui/AuxShell.js';
import { CenteredHeader } from './ui/CenteredHeader.js';
import { toKanjiIndex } from './ui/kanji.js';
import type { LeftIconRailPanel } from './LeftIconRail.js';

interface SettingsTab {
  id: 'analysis' | 'agents' | 'editor' | 'appearance' | 'keyboard' | 'about';
  label: string;
  comingSoon?: boolean;
}

const TABS: SettingsTab[] = [
  { id: 'analysis', label: '分析エンジン' },
  { id: 'agents', label: 'エージェント', comingSoon: true },
  { id: 'editor', label: 'エディタ', comingSoon: true },
  { id: 'appearance', label: '外観', comingSoon: true },
  { id: 'keyboard', label: 'キーボード', comingSoon: true },
  { id: 'about', label: 'LiteLizard について', comingSoon: true },
];

const PROVIDER_OPTIONS: Array<{ value: AnalysisProviderId; label: string }> = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'local-llm', label: 'Local LLM' },
];

export function SettingsScreen() {
  const openEditorPanel = useAppStore((s) => s.openEditorPanel);
  const openAgentsPanel = useAppStore((s) => s.openAgentsPanel);
  const openSettingsPanel = useAppStore((s) => s.openSettingsPanel);
  const analysisSettings = useAppStore((s) => s.analysisSettings);
  const saveProviderApiKey = useAppStore((s) => s.saveProviderApiKey);
  const clearProviderApiKey = useAppStore((s) => s.clearProviderApiKey);
  const saveAnalysisSettings = useAppStore((s) => s.saveAnalysisSettings);
  const testLocalLlmConnection = useAppStore((s) => s.testLocalLlmConnection);

  const [activeTab, setActiveTab] = useState<SettingsTab['id']>('analysis');
  const [draftKeys, setDraftKeys] = useState<Record<'openai' | 'anthropic', string>>({
    openai: '',
    anthropic: '',
  });
  const [settingsDraft, setSettingsDraft] = useState({
    defaultProvider: analysisSettings.defaultProvider,
    openaiModel: analysisSettings.providers.openai.defaultModel,
    anthropicModel: analysisSettings.providers.anthropic.defaultModel,
    localEndpoint: analysisSettings.localLlm.endpoint,
    localModel: analysisSettings.localLlm.defaultModel,
    contextScope: analysisSettings.contextPolicy.scope,
    contextLimitMode: analysisSettings.contextPolicy.limitMode,
    contextLastN: analysisSettings.contextPolicy.lastN,
  });
  const [localLlmStatus, setLocalLlmStatus] = useState<string>('未接続');

  useEffect(() => {
    setSettingsDraft({
      defaultProvider: analysisSettings.defaultProvider,
      openaiModel: analysisSettings.providers.openai.defaultModel,
      anthropicModel: analysisSettings.providers.anthropic.defaultModel,
      localEndpoint: analysisSettings.localLlm.endpoint,
      localModel: analysisSettings.localLlm.defaultModel,
      contextScope: analysisSettings.contextPolicy.scope,
      contextLimitMode: analysisSettings.contextPolicy.limitMode,
      contextLastN: analysisSettings.contextPolicy.lastN,
    });
  }, [analysisSettings]);

  const providerStatus = useMemo(
    () => ({
      openai: analysisSettings.providers.openai.apiKeyConfigured ? '保存済み' : '未設定',
      anthropic: analysisSettings.providers.anthropic.apiKeyConfigured ? '保存済み' : '未設定',
    }),
    [analysisSettings],
  );

  const saveDraftSettings = async () => {
    const lastN = Number.isFinite(settingsDraft.contextLastN)
      ? Math.min(Math.max(Math.trunc(settingsDraft.contextLastN), 1), 999)
      : analysisSettings.contextPolicy.lastN;
    await saveAnalysisSettings({
      defaultProvider: settingsDraft.defaultProvider,
      providers: {
        openai: {
          defaultModel:
            settingsDraft.openaiModel.trim() || analysisSettings.providers.openai.defaultModel,
        },
        anthropic: {
          defaultModel:
            settingsDraft.anthropicModel.trim() ||
            analysisSettings.providers.anthropic.defaultModel,
        },
      },
      localLlm: {
        endpoint: settingsDraft.localEndpoint.trim(),
        defaultModel: settingsDraft.localModel.trim(),
      },
      contextPolicy: {
        scope: settingsDraft.contextScope,
        limitMode: settingsDraft.contextLimitMode,
        lastN,
      },
    });
  };

  const handleSelectPanel = (panel: LeftIconRailPanel) => {
    if (panel === 'editor') openEditorPanel();
    else if (panel === 'agents') openAgentsPanel();
    else if (panel === 'settings') openSettingsPanel();
  };

  const sidebar = (
    <>
      <div className="sidebar-section-header">
        <span className="sidebar-section-label">設定</span>
      </div>
      <div className="settings-sidebar-list">
        {TABS.map((tab, index) => (
          <button
            key={tab.id}
            type="button"
            className={
              activeTab === tab.id
                ? 'settings-sidebar-tab is-active'
                : 'settings-sidebar-tab'
            }
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="settings-sidebar-kanji">{toKanjiIndex(index + 1)}</span>
            {tab.label}
          </button>
        ))}
      </div>
    </>
  );

  const titlebar = (
    <div className="workspace-titlebar" aria-hidden>
      <span className="workspace-titlebar-spacer" />
      <span className="workspace-titlebar-center">設定</span>
      <span className="workspace-titlebar-actions" />
    </div>
  );

  return (
    <AuxShell
      activePanel="settings"
      onSelectPanel={handleSelectPanel}
      sidebar={sidebar}
      titlebar={titlebar}
    >
      <div className="aux-content">
        {activeTab === 'analysis' ? (
          <>
            <CenteredHeader
              overline="settings"
              title="分析エンジンの設定"
              subtitle={
                <>
                  API キー、既定モデル、ローカル LLM の接続をここで管理します。
                  <br />
                  キー本体は再表示せず、状態だけを保持します。
                </>
              }
            />

            <Section label={toKanjiIndex(1)} title="API キー">
              <Row
                label="OpenAI"
                status={providerStatus.openai}
                statusReady={analysisSettings.providers.openai.apiKeyConfigured}
              >
                <input
                  type="password"
                  className="settings-input"
                  value={draftKeys.openai}
                  placeholder="sk-..."
                  onChange={(event) =>
                    setDraftKeys((current) => ({ ...current, openai: event.target.value }))
                  }
                />
                <div className="settings-actions-buttons" style={{ marginTop: 8 }}>
                  <button
                    type="button"
                    className="button-small button-small-primary"
                    onClick={() => void saveProviderApiKey('openai', draftKeys.openai)}
                  >
                    保存
                  </button>
                  <button
                    type="button"
                    className="button-small"
                    onClick={() => {
                      setDraftKeys((current) => ({ ...current, openai: '' }));
                      void clearProviderApiKey('openai');
                    }}
                  >
                    削除
                  </button>
                </div>
              </Row>

              <Row
                label="Anthropic"
                status={providerStatus.anthropic}
                statusReady={analysisSettings.providers.anthropic.apiKeyConfigured}
              >
                <input
                  type="password"
                  className="settings-input"
                  value={draftKeys.anthropic}
                  placeholder="sk-ant-..."
                  onChange={(event) =>
                    setDraftKeys((current) => ({ ...current, anthropic: event.target.value }))
                  }
                />
                <div className="settings-actions-buttons" style={{ marginTop: 8 }}>
                  <button
                    type="button"
                    className="button-small button-small-primary"
                    onClick={() => void saveProviderApiKey('anthropic', draftKeys.anthropic)}
                  >
                    保存
                  </button>
                  <button
                    type="button"
                    className="button-small"
                    onClick={() => {
                      setDraftKeys((current) => ({ ...current, anthropic: '' }));
                      void clearProviderApiKey('anthropic');
                    }}
                  >
                    削除
                  </button>
                </div>
              </Row>
            </Section>

            <Section label={toKanjiIndex(2)} title="既定の分析モデル">
              <Row label="既定 provider">
                <select
                  className="settings-select"
                  value={settingsDraft.defaultProvider}
                  onChange={(event) =>
                    setSettingsDraft((current) => ({
                      ...current,
                      defaultProvider: event.target.value as AnalysisProviderId,
                    }))
                  }
                >
                  {PROVIDER_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Row>
              <Row label="OpenAI モデル">
                <input
                  type="text"
                  className="settings-input"
                  value={settingsDraft.openaiModel}
                  placeholder="gpt-4o-mini"
                  onChange={(event) =>
                    setSettingsDraft((current) => ({
                      ...current,
                      openaiModel: event.target.value,
                    }))
                  }
                />
              </Row>
              <Row label="Anthropic モデル">
                <input
                  type="text"
                  className="settings-input"
                  value={settingsDraft.anthropicModel}
                  placeholder="claude-haiku-4-5"
                  onChange={(event) =>
                    setSettingsDraft((current) => ({
                      ...current,
                      anthropicModel: event.target.value,
                    }))
                  }
                />
              </Row>
              <div className="settings-actions-row">
                <span>変更後は保存ボタンで適用されます。</span>
                <div className="settings-actions-buttons">
                  <button
                    type="button"
                    className="button-small button-small-primary"
                    onClick={() => void saveDraftSettings()}
                  >
                    設定を保存
                  </button>
                </div>
              </div>
            </Section>

            <Section label={toKanjiIndex(3)} title="ローカル LLM">
              <Row label="Endpoint URL" hint="Ollama 等">
                <input
                  type="url"
                  className="settings-input settings-input-mono"
                  value={settingsDraft.localEndpoint}
                  placeholder="http://127.0.0.1:11434"
                  onChange={(event) =>
                    setSettingsDraft((current) => ({
                      ...current,
                      localEndpoint: event.target.value,
                    }))
                  }
                />
              </Row>
              <Row label="既定モデル">
                <input
                  type="text"
                  className="settings-input"
                  value={settingsDraft.localModel}
                  placeholder="llama3.1:8b"
                  onChange={(event) =>
                    setSettingsDraft((current) => ({
                      ...current,
                      localModel: event.target.value,
                    }))
                  }
                />
              </Row>
              <div
                className="settings-status-card"
                style={{ marginTop: 16 }}
              >
                <span
                  className={
                    analysisSettings.localLlm.configured
                      ? 'settings-status-card-dot is-ready'
                      : 'settings-status-card-dot'
                  }
                />
                <span className="settings-status-card-text">{localLlmStatus}</span>
                <span className="settings-status-card-spacer" />
                <button
                  type="button"
                  className="button-small"
                  onClick={async () => {
                    const result = await testLocalLlmConnection({
                      endpoint: settingsDraft.localEndpoint,
                      model: settingsDraft.localModel,
                    });
                    setLocalLlmStatus(result.message);
                  }}
                >
                  接続を確認
                </button>
              </div>
            </Section>

            <Section label={toKanjiIndex(4)} title="分析コンテキスト">
              <Row label="範囲" hint="解析時に LLM へ渡す前段落の取得元">
                <div className="settings-radio-group">
                  <label className="settings-radio-option">
                    <input
                      type="radio"
                      name="context-scope"
                      value="document"
                      checked={settingsDraft.contextScope === 'document'}
                      onChange={() =>
                        setSettingsDraft((current) => ({
                          ...current,
                          contextScope: 'document' as AnalysisContextScope,
                        }))
                      }
                    />
                    文書全体
                  </label>
                  <label className="settings-radio-option">
                    <input
                      type="radio"
                      name="context-scope"
                      value="chapter"
                      checked={settingsDraft.contextScope === 'chapter'}
                      onChange={() =>
                        setSettingsDraft((current) => ({
                          ...current,
                          contextScope: 'chapter' as AnalysisContextScope,
                        }))
                      }
                    />
                    同じ章のみ
                  </label>
                </div>
              </Row>
              <Row label="上限" hint="前段落の件数を制限するか">
                <div className="settings-radio-group">
                  <label className="settings-radio-option">
                    <input
                      type="radio"
                      name="context-limit-mode"
                      value="lastN"
                      checked={settingsDraft.contextLimitMode === 'lastN'}
                      onChange={() =>
                        setSettingsDraft((current) => ({
                          ...current,
                          contextLimitMode: 'lastN' as AnalysisContextLimitMode,
                        }))
                      }
                    />
                    直近 N 件
                  </label>
                  <label className="settings-radio-option">
                    <input
                      type="radio"
                      name="context-limit-mode"
                      value="none"
                      checked={settingsDraft.contextLimitMode === 'none'}
                      onChange={() =>
                        setSettingsDraft((current) => ({
                          ...current,
                          contextLimitMode: 'none' as AnalysisContextLimitMode,
                        }))
                      }
                    />
                    上限なし
                  </label>
                </div>
              </Row>
              <Row label="件数 (N)" hint="直近 N 件のときに使う前段落数">
                <input
                  type="number"
                  min={1}
                  max={999}
                  step={1}
                  className="settings-input"
                  disabled={settingsDraft.contextLimitMode !== 'lastN'}
                  value={settingsDraft.contextLastN}
                  onChange={(event) => {
                    const next = Number.parseInt(event.target.value, 10);
                    setSettingsDraft((current) => ({
                      ...current,
                      contextLastN: Number.isFinite(next) ? next : current.contextLastN,
                    }));
                  }}
                />
              </Row>
              <div className="settings-actions-row">
                <span>変更は「設定を保存」で適用されます。</span>
                <div className="settings-actions-buttons">
                  <button
                    type="button"
                    className="button-small button-small-primary"
                    onClick={() => void saveDraftSettings()}
                  >
                    設定を保存
                  </button>
                </div>
              </div>
            </Section>
          </>
        ) : (
          <>
            <CenteredHeader
              overline="settings"
              title={TABS.find((tab) => tab.id === activeTab)?.label ?? '設定'}
            />
            <div className="settings-empty-tab">この項目は今後追加されます。</div>
          </>
        )}
      </div>
    </AuxShell>
  );
}

interface SectionProps {
  label: string;
  title: string;
  children: React.ReactNode;
}

function Section({ label, title, children }: SectionProps) {
  return (
    <section className="settings-section">
      <div className="settings-section-heading">
        <span className="settings-section-kanji">{label}</span>
        <h2 className="settings-section-title">{title}</h2>
      </div>
      {children}
    </section>
  );
}

interface RowProps {
  label: string;
  hint?: string;
  status?: string;
  statusReady?: boolean;
  children: React.ReactNode;
}

function Row({ label, hint, status, statusReady, children }: RowProps) {
  return (
    <div className="settings-row">
      <div>
        <div className="settings-row-label">
          {label}
          {status ? (
            <span
              className="settings-row-status"
              style={
                statusReady
                  ? undefined
                  : {
                      background: 'var(--paper-soft-strong)',
                      color: 'var(--ink-3)',
                    }
              }
            >
              {status}
            </span>
          ) : null}
        </div>
        {hint ? <div className="settings-row-hint">{hint}</div> : null}
      </div>
      <div>{children}</div>
    </div>
  );
}
