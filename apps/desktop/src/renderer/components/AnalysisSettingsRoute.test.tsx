import { DEFAULT_ANALYSIS_SETTINGS, type LiteLizardDocument } from '@litelizard/shared';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it } from 'vitest';
import { useAppStore } from '../store/useAppStore.js';
import { AnalysisPane } from './AnalysisPane.js';
import { SettingsScreen } from './SettingsScreen.js';

const baseState = useAppStore.getState();

function createDocument(): LiteLizardDocument {
  return {
    version: 2,
    documentId: 'doc_settings_route',
    title: 'fresh draft',
    personaMode: 'general-reader',
    createdAt: '2026-05-06T00:00:00.000Z',
    updatedAt: '2026-05-06T00:00:00.000Z',
    source: { format: 'lzl-v1', originPath: '/projects/novel/fresh-draft.lzl' },
    chapters: [{ id: 'c1', order: 1, title: '一章' }],
    paragraphs: [
      {
        id: 'p1',
        chapterId: 'c1',
        order: 1,
        light: { text: '最初の段落です。', charCount: 8 },
        lizard: { status: 'stale' },
      },
    ],
  };
}

describe('analysis settings route', () => {
  beforeEach(() => {
    useAppStore.setState(baseState, true);
    useAppStore.setState({
      analysisSettings: structuredClone(DEFAULT_ANALYSIS_SETTINGS),
      agents: [
        {
          id: 'reader-quiet',
          name: '静かな読者',
          role: '余韻を読む',
          systemPrompt: '余韻を中心に読んでください。',
          model: null,
          temperature: 0.7,
          contextPolicy: { mode: 'whole-document' },
          createdAt: '2026-05-02T00:00:00.000Z',
          updatedAt: '2026-05-02T00:00:00.000Z',
          builtIn: true,
        },
      ],
      activeAgentId: 'reader-quiet',
      agentsLoaded: true,
    });
  });

  it('API キー未設定時に解析ペインから設定画面への導線を表示する', () => {
    const html = renderToStaticMarkup(
      <AnalysisPane document={createDocument()} activeParagraphId="p1" />,
    );

    expect(html).toContain('OpenAI API キーを設定すると解析を開始できます。');
    expect(html).toContain('設定を開く');
  });

  it('SettingsScreen でローカル LLM 入力欄の近くに保存導線を表示する', () => {
    const html = renderToStaticMarkup(<SettingsScreen />);

    expect(html).toContain('ローカル LLM 設定を保存');
  });

  it('SettingsScreen のエディタタブで Tweaks 保存導線を表示する', () => {
    const html = renderToStaticMarkup(<SettingsScreen initialTab="editor" />);

    expect(html).toContain('明朝');
    expect(html).toContain('ゴシック');
    expect(html).toContain('黄ばみ強度');
    expect(html).toContain('オーバーレイ');
    expect(html).toContain('エディタ設定を保存');
  });
});
