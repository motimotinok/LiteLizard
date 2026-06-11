import React from 'react';
import { LeftIconRail, type LeftIconRailPanel } from '../LeftIconRail.js';

interface Props {
  activePanel: LeftIconRailPanel;
  onSelectPanel: (panel: LeftIconRailPanel) => void;
  sidebar?: React.ReactNode;
  children: React.ReactNode;
  titlebar?: React.ReactNode;
}

/**
 * 補助画面 (Welcome / Settings / Agents) で共通の
 * 左 rail (44px) + サイドバー (232px) + メイン (1fr) の枠。
 */
export function AuxShell({ activePanel, onSelectPanel, sidebar, children, titlebar }: Props) {
  const hasSidebar = sidebar !== undefined && sidebar !== null;

  return (
    <div className={hasSidebar ? 'workspace-root' : 'workspace-root has-no-sidebar'}>
      <LeftIconRail activePanel={activePanel} onSelectPanel={onSelectPanel} />
      {hasSidebar ? <aside className="workspace-sidebar">{sidebar}</aside> : null}
      <main className="aux-main">
        {titlebar}
        {children}
      </main>
    </div>
  );
}
