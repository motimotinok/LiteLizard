import { describe, expect, it } from 'vitest';
import {
  DEFAULT_READING_AGENT_PRESETS,
  buildNewReadingAgentPrompt,
  createDefaultReadingAgentsFromPresets,
} from './readingAgentDefaults.js';

describe('default Reading Agents', () => {
  it('目的が異なる4体を初見ユーザー向けの順序で提供する', () => {
    expect(DEFAULT_READING_AGENT_PRESETS.map((agent) => agent.name)).toEqual([
      '初見の読者',
      '感覚を読む読者',
      '構造編集者',
      '書き続ける伴走者',
    ]);
    expect(new Set(DEFAULT_READING_AGENT_PRESETS.map((agent) => agent.id)).size).toBe(4);
  });

  it('構造編集者は主題、反論、反対視点、機能している部分を評価する', () => {
    const editor = DEFAULT_READING_AGENT_PRESETS.find((agent) => agent.id === 'reader-structure-editor');

    expect(editor?.systemPrompt).toContain('主題');
    expect(editor?.systemPrompt).toContain('反論');
    expect(editor?.systemPrompt).toContain('反対視点');
    expect(editor?.systemPrompt).toContain('機能している部分');
    expect(editor?.systemPrompt).toContain('削除');
  });

  it('共通の助言禁止を持たず、Agentごとに応答方針を変える', () => {
    const firstReader = DEFAULT_READING_AGENT_PRESETS.find((agent) => agent.id === 'reader-first-impression');
    const editor = DEFAULT_READING_AGENT_PRESETS.find((agent) => agent.id === 'reader-structure-editor');
    const companion = DEFAULT_READING_AGENT_PRESETS.find((agent) => agent.id === 'reader-writing-companion');

    expect(firstReader?.systemPrompt).toContain('著者への助言は行わない');
    expect(editor?.systemPrompt).toContain('具体的な修正方向を提案する');
    expect(companion?.systemPrompt).toContain('積極的に肯定する');
  });

  it('永続化用のbuilt-in metadataを付ける', () => {
    const agents = createDefaultReadingAgentsFromPresets('2026-06-22T00:00:00.000Z');

    expect(agents).toHaveLength(4);
    expect(agents.every((agent) => agent.builtIn)).toBe(true);
    expect(agents.every((agent) => agent.createdAt === agent.updatedAt)).toBe(true);
  });

  it('ユーザー作成Agentには最小限の自由なテンプレートを提供する', () => {
    const prompt = buildNewReadingAgentPrompt('独自の読者', '比喩だけを読む');

    expect(prompt).toContain('独自の読者');
    expect(prompt).toContain('比喩だけを読む');
    expect(prompt).not.toContain('助言');
    expect(prompt).not.toContain('タグ');
    expect(prompt).not.toContain('確度');
  });
});
