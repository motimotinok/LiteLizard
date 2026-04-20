import React, { useMemo, useState } from 'react';
import type { AnalysisProviderId } from '@litelizard/shared';
import { useAppStore } from '../store/useAppStore.js';

const PROVIDER_META: Array<{
  id: 'openai' | 'anthropic';
  label: string;
  description: string;
  placeholder: string;
}> = [
  {
    id: 'openai',
    label: 'OpenAI',
    description: '既存の解析実行は現時点では OpenAI 接続を使用します。',
    placeholder: 'sk-...',
  },
  {
    id: 'anthropic',
    label: 'Anthropic',
    description: '次段の provider 切替実装に備えてキーとモデルを保持します。',
    placeholder: 'sk-ant-...',
  },
];

const PROVIDER_OPTIONS: Array<{ value: AnalysisProviderId; label: string; hint: string }> = [
  { value: 'openai', label: 'OpenAI', hint: '現行の解析実行に使用' },
  { value: 'anthropic', label: 'Anthropic', hint: '次段で接続予定' },
  { value: 'local-llm', label: 'Local LLM', hint: 'Ollama 接続を保持' },
];

export function SettingsScreen() {
  const analysisSettings = useAppStore((s) => s.analysisSettings);
  const saveProviderApiKey = useAppStore((s) => s.saveProviderApiKey);
  const clearProviderApiKey = useAppStore((s) => s.clearProviderApiKey);
  const saveAnalysisSettings = useAppStore((s) => s.saveAnalysisSettings);
  const testLocalLlmConnection = useAppStore((s) => s.testLocalLlmConnection);

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
  });
  const [localLlmStatus, setLocalLlmStatus] = useState<string>('未接続');

  React.useEffect(() => {
    setSettingsDraft({
      defaultProvider: analysisSettings.defaultProvider,
      openaiModel: analysisSettings.providers.openai.defaultModel,
      anthropicModel: analysisSettings.providers.anthropic.defaultModel,
      localEndpoint: analysisSettings.localLlm.endpoint,
      localModel: analysisSettings.localLlm.defaultModel,
    });
  }, [analysisSettings]);

  const providerStatus = useMemo(() => {
    return {
      openai: analysisSettings.providers.openai.apiKeyConfigured ? '保存済み' : '未設定',
      anthropic: analysisSettings.providers.anthropic.apiKeyConfigured ? '保存済み' : '未設定',
    };
  }, [analysisSettings]);

  const saveDraftSettings = async () => {
    await saveAnalysisSettings({
      defaultProvider: settingsDraft.defaultProvider,
      providers: {
        openai: { defaultModel: settingsDraft.openaiModel.trim() || analysisSettings.providers.openai.defaultModel },
        anthropic: {
          defaultModel: settingsDraft.anthropicModel.trim() || analysisSettings.providers.anthropic.defaultModel,
        },
      },
      localLlm: {
        endpoint: settingsDraft.localEndpoint.trim(),
        defaultModel: settingsDraft.localModel.trim(),
      },
    });
  };

  return (
    <section className="settings-screen">
      <header className="settings-hero">
        <div>
          <p className="settings-eyebrow">Workspace Settings</p>
          <h1 className="settings-title">分析エンジンの設定</h1>
        </div>
        <p className="settings-lead">
          API キー、既定モデル、ローカル LLM 接続をここで管理します。キー本体は再表示せず、状態だけを保持します。
        </p>
      </header>

      <div className="settings-grid">
        <section className="settings-section">
          <div className="settings-section-heading">
            <div>
              <p className="settings-section-kicker">Secrets</p>
              <h2>API キー設定</h2>
            </div>
            <p>保存済み 여부のみ表示します。更新時は新しいキーを入力してください。</p>
          </div>

          <div className="settings-provider-list">
            {PROVIDER_META.map((provider) => (
              <article key={provider.id} className="settings-provider-row">
                <div className="settings-provider-copy">
                  <div className="settings-provider-title-row">
                    <h3>{provider.label}</h3>
                    <span
                      className={
                        analysisSettings.providers[provider.id].apiKeyConfigured
                          ? 'settings-status-chip is-ready'
                          : 'settings-status-chip'
                      }
                    >
                      {providerStatus[provider.id]}
                    </span>
                  </div>
                  <p>{provider.description}</p>
                </div>

                <div className="settings-provider-actions">
                  <label className="settings-field">
                    <span>API キー</span>
                    <input
                      type="password"
                      value={draftKeys[provider.id]}
                      placeholder={provider.placeholder}
                      onChange={(event) =>
                        setDraftKeys((current) => ({
                          ...current,
                          [provider.id]: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <div className="settings-inline-actions">
                    <button
                      type="button"
                      className="settings-primary-button"
                      onClick={() => saveProviderApiKey(provider.id, draftKeys[provider.id])}
                    >
                      保存
                    </button>
                    <button
                      type="button"
                      className="settings-secondary-button"
                      onClick={() => {
                        setDraftKeys((current) => ({ ...current, [provider.id]: '' }));
                        void clearProviderApiKey(provider.id);
                      }}
                    >
                      削除
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="settings-section">
          <div className="settings-section-heading">
            <div>
              <p className="settings-section-kicker">Defaults</p>
              <h2>分析モデル設定</h2>
            </div>
            <p>初回は設定だけ先行します。実際の provider 切替は次段で接続します。</p>
          </div>

          <div className="settings-stack">
            <label className="settings-field">
              <span>既定 provider</span>
              <select
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
            </label>

            <div className="settings-provider-pills">
              {PROVIDER_OPTIONS.map((option) => (
                <div
                  key={option.value}
                  className={
                    settingsDraft.defaultProvider === option.value
                      ? 'settings-provider-pill is-selected'
                      : 'settings-provider-pill'
                  }
                >
                  <strong>{option.label}</strong>
                  <span>{option.hint}</span>
                </div>
              ))}
            </div>

            <div className="settings-two-column">
              <label className="settings-field">
                <span>OpenAI 既定モデル</span>
                <input
                  type="text"
                  value={settingsDraft.openaiModel}
                  placeholder="gpt-4o-mini"
                  onChange={(event) =>
                    setSettingsDraft((current) => ({
                      ...current,
                      openaiModel: event.target.value,
                    }))
                  }
                />
              </label>

              <label className="settings-field">
                <span>Anthropic 既定モデル</span>
                <input
                  type="text"
                  value={settingsDraft.anthropicModel}
                  placeholder="claude-3-5-sonnet-latest"
                  onChange={(event) =>
                    setSettingsDraft((current) => ({
                      ...current,
                      anthropicModel: event.target.value,
                    }))
                  }
                />
              </label>
            </div>
          </div>
        </section>

        <section className="settings-section settings-section-wide">
          <div className="settings-section-heading">
            <div>
              <p className="settings-section-kicker">Local Runtime</p>
              <h2>ローカル LLM</h2>
            </div>
            <p>Ollama を別途インストールし、接続先と既定モデルを登録します。モデルの pull や起動はアプリ外で行います。</p>
          </div>

          <div className="settings-local-grid">
            <div className="settings-stack">
              <label className="settings-field">
                <span>Endpoint URL</span>
                <input
                  type="url"
                  value={settingsDraft.localEndpoint}
                  placeholder="http://127.0.0.1:11434"
                  onChange={(event) =>
                    setSettingsDraft((current) => ({
                      ...current,
                      localEndpoint: event.target.value,
                    }))
                  }
                />
              </label>

              <label className="settings-field">
                <span>既定モデル</span>
                <input
                  type="text"
                  value={settingsDraft.localModel}
                  placeholder="llama3.1:8b"
                  onChange={(event) =>
                    setSettingsDraft((current) => ({
                      ...current,
                      localModel: event.target.value,
                    }))
                  }
                />
              </label>

              <div className="settings-inline-actions">
                <button
                  type="button"
                  className="settings-primary-button"
                  onClick={async () => {
                    const result = await testLocalLlmConnection({
                      endpoint: settingsDraft.localEndpoint,
                      model: settingsDraft.localModel,
                    });
                    setLocalLlmStatus(result.message);
                  }}
                >
                  接続テスト
                </button>
                <button
                  type="button"
                  className="settings-secondary-button"
                  onClick={() => {
                    void saveDraftSettings();
                    setLocalLlmStatus('設定を保存しました');
                  }}
                >
                  ローカル設定を保存
                </button>
              </div>
            </div>

            <div className="settings-local-aside">
              <div className="settings-local-card">
                <span className={analysisSettings.localLlm.configured ? 'settings-status-dot is-ready' : 'settings-status-dot'} />
                <div>
                  <strong>現在の状態</strong>
                  <p>{localLlmStatus}</p>
                </div>
              </div>
              <ol className="settings-setup-list">
                <li>Ollama をインストールしてバックグラウンドで起動する</li>
                <li>使用したいモデルを `ollama pull` で取得する</li>
                <li>ここで URL とモデル名を保存し、接続テストを行う</li>
              </ol>
            </div>
          </div>
        </section>
      </div>

      <footer className="settings-footer">
        <p>既定 provider とモデル設定は先に保存され、解析実行の分岐は次段の provider 抽象化で接続します。</p>
        <button type="button" className="settings-primary-button" onClick={() => void saveDraftSettings()}>
          全体設定を保存
        </button>
      </footer>
    </section>
  );
}
