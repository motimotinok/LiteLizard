import React from 'react';
import { IconFolder, IconNewFile } from '../ui/icons.js';

interface Props {
  onCreateEssay: () => void;
  onOpenFolder: () => void;
}

export function EditorEmptyState({ onCreateEssay, onOpenFolder }: Props) {
  return (
    <section className="editor-shell">
      <div className="editor-empty-state">
        <div className="editor-empty-inner">
          <div className="editor-empty-overline">LiteLizard</div>
          <h2 className="editor-empty-title">まず一文を置く</h2>
          <div className="editor-empty-rule" />
          <p className="editor-empty-description">
            新しい文書を作ると、本文の横に段落ごとの読みが並びます。APIキーやReading Agentは、書き始めたあとで設定できます。
          </p>
          <div className="editor-empty-actions">
            <button type="button" className="button-primary" onClick={onCreateEssay}>
              <IconNewFile size={13} />
              新しい文書を書く
            </button>
            <button type="button" className="button-secondary" onClick={onOpenFolder}>
              <IconFolder size={13} />
              別のフォルダを開く
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
