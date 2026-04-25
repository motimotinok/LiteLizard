import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore.js';
import { AuxShell } from './ui/AuxShell.js';
import { CenteredHeader } from './ui/CenteredHeader.js';
import { READING_AGENTS } from './ui/agents.js';
import { toKanjiIndex } from './ui/kanji.js';
import { IconPlus } from './ui/icons.js';
import type { LeftIconRailPanel } from './LeftIconRail.js';

const PROVIDER_OPTIONS = [
  { value: 'default', label: '既定 (gpt-4o-mini)' },
  { value: 'claude-haiku', label: 'claude-haiku-4-5' },
  { value: 'local-llm', label: 'Local LLM' },
];

/**
 * 分析エージェント管理画面 (モック)。
 * 永続化・プロンプト適用は別タスク。
 */
export function AgentsScreen() {
  const openEditorPanel = useAppStore((s) => s.openEditorPanel);
  const openAgentsPanel = useAppStore((s) => s.openAgentsPanel);
  const openSettingsPanel = useAppStore((s) => s.openSettingsPanel);

  const [selectedIndex, setSelectedIndex] = useState(0);
  const agent = READING_AGENTS[selectedIndex];
  const samplePrompt = `あなたは『${agent.name}』として、エッセイの一段落を読んだ感想を書きます。

## 視点
${agent.desc}。読み手の身体感覚に近い、率直な反応を優先してください。

## 出力
- 100〜200字
- タグを4つ（情緒・印象を表すもの）
- 0〜100の確度

## 禁則
- 文章の良し悪しの断定
- 著者への助言
- 修正案の提示`;

  const handleSelectPanel = (panel: LeftIconRailPanel) => {
    if (panel === 'editor') openEditorPanel();
    else if (panel === 'agents') openAgentsPanel();
    else if (panel === 'settings') openSettingsPanel();
  };

  const sidebar = (
    <>
      <div className="sidebar-section-header">
        <span className="sidebar-section-label">Reading Agents</span>
        <div className="sidebar-section-actions">
          <button
            type="button"
            className="sidebar-icon-button"
            title="新しいエージェント (今後追加されます)"
            aria-label="新しいエージェント"
            disabled
          >
            <IconPlus size={13} />
          </button>
        </div>
      </div>
      <div style={{ padding: '0 8px', flex: 1, overflow: 'auto' }}>
        {READING_AGENTS.map((entry, index) => (
          <button
            key={entry.id}
            type="button"
            className={
              selectedIndex === index ? 'agents-sidebar-item is-active' : 'agents-sidebar-item'
            }
            onClick={() => setSelectedIndex(index)}
          >
            <div className="agents-sidebar-row">
              <span className="agents-sidebar-kanji">{toKanjiIndex(index + 1)}</span>
              <span className="agents-sidebar-name">{entry.name}</span>
            </div>
            <div className="agents-sidebar-desc">{entry.desc}</div>
          </button>
        ))}
      </div>
    </>
  );

  const titlebar = (
    <div className="workspace-titlebar" aria-hidden>
      <span className="workspace-titlebar-spacer" />
      <span className="workspace-titlebar-center">分析エージェント</span>
      <span className="workspace-titlebar-actions" />
    </div>
  );

  return (
    <AuxShell
      activePanel="agents"
      onSelectPanel={handleSelectPanel}
      sidebar={sidebar}
      titlebar={titlebar}
    >
      <div className="aux-content">
        <CenteredHeader overline="reading agent" title={agent.name} />

        <section className="settings-section">
          <div className="settings-section-heading">
            <span className="settings-section-kanji">{toKanjiIndex(1)}</span>
            <h2 className="settings-section-title">役割</h2>
          </div>
          <textarea
            key={`role-${agent.id}`}
            className="settings-textarea"
            defaultValue={`${agent.desc}。情緒や余韻を中心に短く。`}
            style={{ minHeight: 56 }}
          />
        </section>

        <section className="settings-section">
          <div className="settings-section-heading">
            <span className="settings-section-kanji">{toKanjiIndex(2)}</span>
            <h2 className="settings-section-title">プロンプト</h2>
          </div>
          <textarea
            key={`prompt-${agent.id}`}
            className="settings-textarea settings-textarea-mono"
            defaultValue={samplePrompt}
            style={{ minHeight: 280 }}
          />
          <div className="settings-actions-row">
            <span>※ プロンプトの永続化・実行への反映は今後追加されます。</span>
            <div className="settings-actions-buttons">
              <button type="button" className="button-small" disabled>
                サンプルで試す
              </button>
              <button type="button" className="button-small button-small-primary" disabled>
                保存
              </button>
            </div>
          </div>
        </section>

        <section className="settings-section">
          <div className="settings-section-heading">
            <span className="settings-section-kanji">{toKanjiIndex(3)}</span>
            <h2 className="settings-section-title">モデル設定</h2>
          </div>
          <div className="settings-row">
            <div>
              <div className="settings-row-label">使用モデル</div>
            </div>
            <select className="settings-select" defaultValue="default" disabled>
              {PROVIDER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="settings-row">
            <div>
              <div className="settings-row-label">温度</div>
              <div className="settings-row-hint">0=決定的, 1=多様</div>
            </div>
            <input
              type="number"
              className="settings-input"
              defaultValue={0.7}
              step={0.1}
              min={0}
              max={1}
              disabled
            />
          </div>
        </section>
      </div>
    </AuxShell>
  );
}
