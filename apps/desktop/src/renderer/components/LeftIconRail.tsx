import React from 'react';
import { IconAgent, IconFolder, IconSearch, IconSettings } from './ui/icons.js';

export type LeftIconRailPanel = 'editor' | 'agents' | 'settings';

interface LeftIconRailProps {
  activePanel: LeftIconRailPanel;
  onSelectPanel: (panel: LeftIconRailPanel) => void;
}

interface NavItem {
  id: LeftIconRailPanel;
  label: string;
  Icon: (props: { size?: number }) => React.ReactElement;
  disabled?: boolean;
}

const PRIMARY_NAV: NavItem[] = [
  { id: 'editor', label: 'エクスプローラー', Icon: IconFolder },
  { id: 'agents', label: '分析エージェント', Icon: IconAgent },
];

export function LeftIconRail({ activePanel, onSelectPanel }: LeftIconRailProps) {
  return (
    <nav className="left-icon-rail" aria-label="primary-navigation">
      {PRIMARY_NAV.map(({ id, label, Icon }) => {
        const active = activePanel === id;
        return (
          <button
            key={id}
            type="button"
            className={active ? 'rail-icon-button is-active' : 'rail-icon-button'}
            aria-label={label}
            title={label}
            onClick={() => onSelectPanel(id)}
          >
            <Icon size={17} />
          </button>
        );
      })}
      <button
        type="button"
        className="rail-icon-button"
        aria-label="検索"
        title="検索 (今後追加されます)"
        disabled
      >
        <IconSearch size={17} />
      </button>
      <span className="left-icon-rail-spacer" />
      <button
        type="button"
        className={
          activePanel === 'settings'
            ? 'rail-icon-button rail-icon-button-footer is-active'
            : 'rail-icon-button rail-icon-button-footer'
        }
        aria-label="設定"
        title="設定"
        onClick={() => onSelectPanel('settings')}
      >
        <IconSettings size={17} />
      </button>
    </nav>
  );
}
