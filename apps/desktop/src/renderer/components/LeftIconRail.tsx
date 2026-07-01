import React from 'react';
import { useAppStore } from '../store/useAppStore.js';
import { IconAgent, IconFolder, IconSearch, IconSettings } from './ui/icons.js';

export type LeftIconRailPanel = 'editor' | 'agents' | 'settings' | 'search';

interface LeftIconRailProps {
  activePanel: LeftIconRailPanel;
  onSelectPanel: (panel: LeftIconRailPanel) => void;
  editorPanelExpanded?: boolean;
}

interface NavItem {
  id: LeftIconRailPanel;
  label: string;
  Icon: (props: { size?: number }) => React.ReactElement;
}

const PRIMARY_NAV: NavItem[] = [
  { id: 'editor', label: 'エクスプローラー', Icon: IconFolder },
  { id: 'agents', label: '分析エージェント', Icon: IconAgent },
  { id: 'search', label: '検索', Icon: IconSearch },
];

export function LeftIconRail({ activePanel, onSelectPanel, editorPanelExpanded }: LeftIconRailProps) {
  const updateAvailable = useAppStore((state) => state.updateCheck?.updateAvailable ?? false);
  const settingsLabel = updateAvailable ? '設定（新しいバージョンあり）' : '設定';

  return (
    <nav className="left-icon-rail" aria-label="primary-navigation">
      {PRIMARY_NAV.map(({ id, label, Icon }) => {
        const active = activePanel === id;
        const itemLabel =
          id === 'editor' && typeof editorPanelExpanded === 'boolean'
            ? editorPanelExpanded
              ? 'エクスプローラーを閉じる'
              : 'エクスプローラーを開く'
            : label;
        return (
          <button
            key={id}
            type="button"
            className={active ? 'rail-icon-button is-active' : 'rail-icon-button'}
            aria-label={itemLabel}
            aria-expanded={id === 'editor' && typeof editorPanelExpanded === 'boolean' ? editorPanelExpanded : undefined}
            title={itemLabel}
            onClick={() => onSelectPanel(id)}
          >
            <Icon size={17} />
          </button>
        );
      })}
      <span className="left-icon-rail-spacer" />
      <button
        type="button"
        className={
          activePanel === 'settings'
            ? 'rail-icon-button rail-icon-button-footer is-active'
            : 'rail-icon-button rail-icon-button-footer'
        }
        aria-label={settingsLabel}
        title={settingsLabel}
        onClick={() => onSelectPanel('settings')}
      >
        <IconSettings size={17} />
        {updateAvailable ? <span className="rail-icon-badge" aria-hidden="true" /> : null}
      </button>
    </nav>
  );
}
