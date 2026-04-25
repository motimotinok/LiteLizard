import React from 'react';
import { CenteredHeader } from './ui/CenteredHeader.js';
import { IconFolder } from './ui/icons.js';
import { LeftIconRail } from './LeftIconRail.js';

interface Props {
  onSelectFolder: () => void;
}

export function ProjectSetupScreen({ onSelectFolder }: Props) {
  return (
    <div className="workspace-root has-no-sidebar">
      <LeftIconRail
        activePanel="editor"
        onSelectPanel={() => {
          // フォルダ未選択時はパネル切替不可
        }}
      />
      <main className="aux-main">
        <div className="workspace-titlebar" aria-hidden>
          <span className="workspace-titlebar-spacer" />
          <span className="workspace-titlebar-center" />
          <span className="workspace-titlebar-actions" />
        </div>
        <div className="welcome-screen">
          <div className="welcome-content">
            <CenteredHeader
              overline="LiteLizard"
              title="静かに、段落の手応えを"
              subtitle={
                <>
                  段落ごとに、想定する読者がどう感じるかを
                  <br />
                  書き手が見られるエディタです。
                </>
              }
            />
            <div className="welcome-actions">
              <button type="button" className="button-primary" onClick={onSelectFolder}>
                <IconFolder size={13} />
                フォルダを開く
              </button>
            </div>
            <p className="welcome-empty-message">
              作業フォルダを選ぶと、`.litelizard/` を自動作成し
              <br />
              分析結果や設定をそこに保存します。
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
