import React from 'react';

interface Props {
  onSelectFolder: () => void;
}

export function ProjectSetupScreen({ onSelectFolder }: Props) {
  return (
    <div className="project-launch-screen">
      <div className="project-launch-panel project-launch-panel-setup">
        <p className="project-launch-eyebrow">LiteLizard Project</p>
        <h1 className="project-launch-title">作業フォルダを選んで始める</h1>
        <p className="project-launch-description">
          LiteLizard は 1 フォルダを 1 プロジェクトとして扱います。選択したフォルダには
          <code> .litelizard/ </code>
          を自動作成し、分析結果や設定をそこに保存します。
        </p>
        <button className="project-launch-button" onClick={onSelectFolder}>
          フォルダを選択して始める
        </button>
      </div>
    </div>
  );
}
