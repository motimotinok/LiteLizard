import React, { useEffect, useMemo, useState } from 'react';
import type {
  AnalysisPanelMode,
  AnalysisProviderId,
  EditorTypeface,
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
  { id: 'editor', label: 'エディタ' },
  { id: 'appearance', label: '外観', comingSoon: true },
  { id: 'keyboard', label: 'キーボード', comingSoon: true },
  { id: 'about', label: 'LiteLizard について' },
];

const PROVIDER_OPTIONS: Array<{ value: AnalysisProviderId; label: string }> = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'local-llm', label: 'Local LLM' },
];

interface SettingsScreenProps {
  initialTab?: SettingsTab['id'];
}

export function SettingsScreen({ initialTab = 'analysis' }: SettingsScreenProps = {}) {
  const openEditorPanel = useAppStore((s) => s.openEditorPanel);
  const openAgentsPanel = useAppStore((s) => s.openAgentsPanel);
  const openSettingsPanel = useAppStore((s) => s.openSettingsPanel);
  const openSearchPanel = useAppStore((s) => s.openSearchPanel);
  const analysisSettings = useAppStore((s) => s.analysisSettings);
  const saveProviderApiKey = useAppStore((s) => s.saveProviderApiKey);
  const clearProviderApiKey = useAppStore((s) => s.clearProviderApiKey);
  const saveAnalysisSettings = useAppStore((s) => s.saveAnalysisSettings);
  const testLocalLlmConnection = useAppStore((s) => s.testLocalLlmConnection);
  const appVersion = useAppStore((s) => s.appVersion);
  const updateCheck = useAppStore((s) => s.updateCheck);
  const checkForUpdates = useAppStore((s) => s.checkForUpdates);
  const openReleasesPage = useAppStore((s) => s.openReleasesPage);
  const downloadLatestRelease = useAppStore((s) => s.downloadLatestRelease);
  const consumeSettingsScreenIntent = useAppStore((s) => s.consumeSettingsScreenIntent);

  const [activeTab, setActiveTab] = useState<SettingsTab['id']>(initialTab);

  useEffect(() => {
    const intent = consumeSettingsScreenIntent();
    if (intent === 'update') {
      setActiveTab('about');
    }
  }, [consumeSettingsScreenIntent]);
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
    editorTypeface: analysisSettings.editorTweaks.typeface,
    editorBodyFontSize: analysisSettings.editorTweaks.bodyFontSize,
    editorLineHeight: analysisSettings.editorTweaks.lineHeight,
    editorPaperWarmth: analysisSettings.editorTweaks.paperWarmth,
    analysisPanelMode: analysisSettings.editorTweaks.analysisPanelMode,
  });
  const [localLlmStatus, setLocalLlmStatus] = useState<string>('未接続');

  useEffect(() => {
    setSettingsDraft({
      defaultProvider: analysisSettings.defaultProvider,
      openaiModel: analysisSettings.providers.openai.defaultModel,
      anthropicModel: analysisSettings.providers.anthropic.defaultModel,
      localEndpoint: analysisSettings.localLlm.endpoint,
      localModel: analysisSettings.localLlm.defaultModel,
      editorTypeface: analysisSettings.editorTweaks.typeface,
      editorBodyFontSize: analysisSettings.editorTweaks.bodyFontSize,
      editorLineHeight: analysisSettings.editorTweaks.lineHeight,
      editorPaperWarmth: analysisSettings.editorTweaks.paperWarmth,
      analysisPanelMode: analysisSettings.editorTweaks.analysisPanelMode,
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
    const editorBodyFontSize = Number.isFinite(settingsDraft.editorBodyFontSize)
      ? Math.min(Math.max(Math.trunc(settingsDraft.editorBodyFontSize), 15), 22)
      : analysisSettings.editorTweaks.bodyFontSize;
    const editorLineHeight = Number.isFinite(settingsDraft.editorLineHeight)
      ? Math.min(Math.max(settingsDraft.editorLineHeight, 1.4), 2.4)
      : analysisSettings.editorTweaks.lineHeight;
    const editorPaperWarmth = Number.isFinite(settingsDraft.editorPaperWarmth)
      ? Math.min(Math.max(Math.trunc(settingsDraft.editorPaperWarmth), 0), 100)
      : analysisSettings.editorTweaks.paperWarmth;
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
      editorTweaks: {
        typeface: settingsDraft.editorTypeface,
        bodyFontSize: editorBodyFontSize,
        lineHeight: editorLineHeight,
        paperWarmth: editorPaperWarmth,
        analysisPanelMode: settingsDraft.analysisPanelMode,
      },
    });
  };

  const handleSelectPanel = (panel: LeftIconRailPanel) => {
    if (panel === 'editor') openEditorPanel();
    else if (panel === 'agents') openAgentsPanel();
    else if (panel === 'settings') openSettingsPanel();
    else if (panel === 'search') openSearchPanel();
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
                  placeholder="claude-haiku-4-5-20251001"
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
              <div className="settings-actions-row">
                <span>ローカル LLM</span>
                <div className="settings-actions-buttons">
                  <button
                    type="button"
                    className="button-small button-small-primary"
                    onClick={() => void saveDraftSettings()}
                  >
                    ローカル LLM 設定を保存
                  </button>
                </div>
              </div>
            </Section>

          </>
        ) : activeTab === 'editor' ? (
          <>
            <CenteredHeader
              overline="settings"
              title="エディタの表示"
              subtitle={
                <>
                  本文の書き味に関わる表示だけを調整します。
                  <br />
                  変更は保存後、執筆画面へ反映されます。
                </>
              }
            />

            <Section label={toKanjiIndex(1)} title="本文">
              <Row label="書体">
                <div className="settings-radio-group">
                  <label className="settings-radio-option">
                    <input
                      type="radio"
                      name="editor-typeface"
                      value="serif"
                      checked={settingsDraft.editorTypeface === 'serif'}
                      onChange={() =>
                        setSettingsDraft((current) => ({
                          ...current,
                          editorTypeface: 'serif' as EditorTypeface,
                        }))
                      }
                    />
                    明朝
                  </label>
                  <label className="settings-radio-option">
                    <input
                      type="radio"
                      name="editor-typeface"
                      value="sans"
                      checked={settingsDraft.editorTypeface === 'sans'}
                      onChange={() =>
                        setSettingsDraft((current) => ({
                          ...current,
                          editorTypeface: 'sans' as EditorTypeface,
                        }))
                      }
                    />
                    ゴシック
                  </label>
                </div>
              </Row>
              <Row label="本文サイズ" hint="15〜22px">
                <input
                  type="range"
                  min={15}
                  max={22}
                  step={1}
                  className="settings-range"
                  value={settingsDraft.editorBodyFontSize}
                  onChange={(event) =>
                    setSettingsDraft((current) => ({
                      ...current,
                      editorBodyFontSize: Number.parseInt(event.target.value, 10),
                    }))
                  }
                />
                <span className="settings-range-value">
                  {settingsDraft.editorBodyFontSize}px
                </span>
              </Row>
              <Row label="行間" hint="1.4〜2.4">
                <input
                  type="range"
                  min={1.4}
                  max={2.4}
                  step={0.05}
                  className="settings-range"
                  value={settingsDraft.editorLineHeight}
                  onChange={(event) =>
                    setSettingsDraft((current) => ({
                      ...current,
                      editorLineHeight: Number.parseFloat(event.target.value),
                    }))
                  }
                />
                <span className="settings-range-value">
                  {settingsDraft.editorLineHeight.toFixed(2)}
                </span>
              </Row>
            </Section>

            <Section label={toKanjiIndex(2)} title="紙面">
              <Row label="黄ばみ強度" hint="0〜100">
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  className="settings-range"
                  value={settingsDraft.editorPaperWarmth}
                  onChange={(event) =>
                    setSettingsDraft((current) => ({
                      ...current,
                      editorPaperWarmth: Number.parseInt(event.target.value, 10),
                    }))
                  }
                />
                <span className="settings-range-value">
                  {settingsDraft.editorPaperWarmth}
                </span>
              </Row>
            </Section>

            <Section label={toKanjiIndex(3)} title="分析パネル">
              <Row label="表示方式">
                <div className="settings-radio-group">
                  <label className="settings-radio-option">
                    <input
                      type="radio"
                      name="analysis-panel-mode"
                      value="side"
                      checked={settingsDraft.analysisPanelMode === 'side'}
                      onChange={() =>
                        setSettingsDraft((current) => ({
                          ...current,
                          analysisPanelMode: 'side' as AnalysisPanelMode,
                        }))
                      }
                    />
                    横並び
                  </label>
                  <label className="settings-radio-option">
                    <input
                      type="radio"
                      name="analysis-panel-mode"
                      value="overlay"
                      checked={settingsDraft.analysisPanelMode === 'overlay'}
                      onChange={() =>
                        setSettingsDraft((current) => ({
                          ...current,
                          analysisPanelMode: 'overlay' as AnalysisPanelMode,
                        }))
                      }
                    />
                    オーバーレイ
                  </label>
                </div>
              </Row>
              <div className="settings-actions-row">
                <span>執筆表示</span>
                <div className="settings-actions-buttons">
                  <button
                    type="button"
                    className="button-small button-small-primary"
                    onClick={() => void saveDraftSettings()}
                  >
                    エディタ設定を保存
                  </button>
                </div>
              </div>
            </Section>
          </>
        ) : activeTab === 'about' ? (
          <>
            <CenteredHeader
              overline="settings"
              title="LiteLizard について"
              subtitle={
                <>
                  バージョン情報と、GitHub Releases からの手動更新導線です。
                  <br />
                  自動更新には未対応です。
                </>
              }
            />
            <Section label={toKanjiIndex(1)} title="バージョン">
              <Row label="現在のバージョン">
                <div className="settings-row-value">
                  {appVersion ? `v${appVersion}` : '取得中…'}
                </div>
              </Row>
              <Row label="最新版">
                <div className="settings-row-value">
                  {updateCheck
                    ? updateCheck.latestVersion
                      ? updateCheck.updateAvailable
                        ? `v${updateCheck.latestVersion} が公開されています`
                        : `v${updateCheck.latestVersion}（最新）`
                      : updateCheck.error
                        ? `確認できませんでした: ${updateCheck.error}`
                        : '取得できませんでした'
                    : '確認中…'}
                </div>
              </Row>
              <div className="settings-actions-row">
                <span>最新の .dmg をブラウザでダウンロードして、Applications に置き直してください。</span>
                <div className="settings-actions-buttons">
                  <button type="button" className="button-small" onClick={() => void checkForUpdates()}>
                    更新を確認
                  </button>
                  <button type="button" className="button-small" onClick={() => void openReleasesPage()}>
                    GitHub Releases を開く
                  </button>
                  <button
                    type="button"
                    className={
                      updateCheck?.updateAvailable
                        ? 'button-small button-small-primary'
                        : 'button-small'
                    }
                    onClick={() => void downloadLatestRelease()}
                  >
                    最新版 .dmg をダウンロード
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
