import React from 'react';

interface Props {
  isOpen: boolean;
  apiKeyConfigured: boolean;
  apiKeyInput: string;
  onApiKeyInputChange: (value: string) => void;
  onSaveApiKey: () => void;
  onClearApiKey: () => void;
  onClose: () => void;
}

export function SettingsDialog({
  isOpen,
  apiKeyConfigured,
  apiKeyInput,
  onApiKeyInputChange,
  onSaveApiKey,
  onClearApiKey,
  onClose,
}: Props) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="settings-overlay" role="dialog" aria-modal="true" aria-label="設定">
      <div className="settings-dialog">
        <div className="settings-dialog-header">
          <h2>設定</h2>
          <button className="icon-button" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="settings-dialog-body">
          <section className="settings-block">
            <h3>API 設定</h3>
            <p className="settings-caption">
              OpenAI API キーを保存すると、段落分析を実行できます。現在の状態: {apiKeyConfigured ? '設定済み' : '未設定'}
            </p>

            <div className="settings-actions">
              <input
                type="password"
                className="input-control"
                placeholder="sk-..."
                value={apiKeyInput}
                onChange={(event) => onApiKeyInputChange(event.target.value)}
              />
              <button className="action-button action-button-primary" onClick={onSaveApiKey} disabled={!apiKeyInput.trim()}>
                保存
              </button>
              <button className="action-button" onClick={onClearApiKey} disabled={!apiKeyConfigured}>
                削除
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
