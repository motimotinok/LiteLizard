import React from 'react';

interface Props {
  isExpanded: boolean;
  onCreateEssay: () => void;
  onOpenFolder: () => void;
}

export function EditorEmptyState({ isExpanded, onCreateEssay, onOpenFolder }: Props) {
  return (
    <section className={isExpanded ? 'editor-shell editor-shell-expanded' : 'editor-shell'}>
      <div className="editor-empty-state">
        <h2 className="editor-empty-title">構造を設計するための執筆エリア</h2>
        <p className="editor-empty-description">段落単位で思考できるように、まずは作品ファイルを用意してください。</p>
        <div className="editor-empty-actions">
          <button className="action-button action-button-primary" onClick={onCreateEssay}>
            ✍ 新しいエッセイを書く
          </button>
          <button className="action-button" onClick={onOpenFolder}>
            📂 フォルダを開く
          </button>
        </div>
      </div>
    </section>
  );
}
