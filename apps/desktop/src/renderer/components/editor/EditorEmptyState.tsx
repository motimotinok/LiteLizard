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
          <h2 className="editor-empty-title">静かに、段落の手応えを</h2>
          <div className="editor-empty-rule" />
          <p className="editor-empty-description">
            段落ごとに、想定する読者がどう感じるかを書き手が見られるエディタです。
          </p>
          <div className="editor-empty-actions">
            <button type="button" className="button-primary" onClick={onCreateEssay}>
              <IconNewFile size={13} />
              新しいエッセイを書く
            </button>
            <button type="button" className="button-secondary" onClick={onOpenFolder}>
              <IconFolder size={13} />
              フォルダを開く
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
