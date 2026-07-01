import { DEFAULT_ANALYSIS_SETTINGS, listDefaultReadingAgentTemplates, type LiteLizardDocument } from '@litelizard/shared';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it } from 'vitest';
import { useAppStore } from '../store/useAppStore.js';
import { AnalysisPane } from './AnalysisPane.js';
import { AgentModelSelector, AgentTemplateList } from './AgentsScreen.js';
import { ProviderModelSelector, SettingsScreen } from './SettingsScreen.js';

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

    expect(html).toContain('OpenAI API キーを保存すると、この段落を読ませられます。');
    expect(html).toContain('ここに戻って「段落を読ませる」を押してください。');
    expect(html).toContain('設定を開く');
  });

  it('SettingsScreen でローカル LLM 入力欄の近くに保存導線を表示する', () => {
    const html = renderToStaticMarkup(<SettingsScreen />);

    expect(html).toContain('ローカル LLM 設定を保存');
  });

  it('SettingsScreen で provider モデル候補とカスタム入力メニューを表示する', () => {
    const html = renderToStaticMarkup(<SettingsScreen />);

    expect(html).toContain('GPT-5.4');
    expect(html).toContain('Claude Sonnet 4.6');
    expect(html).toContain('カスタムモデルIDを入力');
    expect(html).not.toContain('Claude Fable');
  });

  it('候補外の provider モデル値はカスタム入力として表示する', () => {
    const html = renderToStaticMarkup(
      <ProviderModelSelector
        providerId="openai"
        value="gpt-future-preview"
        customPlaceholder="gpt-5.4"
        onChange={() => undefined}
      />,
    );

    expect(html).toContain('カスタムモデルIDを入力');
    expect(html).toContain('gpt-future-preview');
  });

  it('Reading Agent の使用モデルでも provider 候補と既定モデル選択を表示する', () => {
    const html = renderToStaticMarkup(
      <AgentModelSelector value="" onChange={() => undefined} />,
    );

    expect(html).toContain('既定モデルを使う');
    expect(html).toContain('GPT-5.4');
    expect(html).toContain('Claude Sonnet 4.6');
    expect(html).toContain('カスタムモデルIDを入力');
    expect(html).not.toContain('Claude Fable');
  });

  it('候補外の Reading Agent 使用モデルはカスタム入力として表示する', () => {
    const html = renderToStaticMarkup(
      <AgentModelSelector value="custom-agent-model" onChange={() => undefined} />,
    );

    expect(html).toContain('custom-agent-model');
  });

  it('AgentsScreen のテンプレート一覧は Agent 0 件でも追加導線を表示する', () => {
    const html = renderToStaticMarkup(
      <AgentTemplateList
        agents={[]}
        agentsLoaded
        agentTemplates={listDefaultReadingAgentTemplates()}
        onAddTemplate={() => undefined}
      />,
    );

    expect(html).toContain('未追加');
    expect(html).toContain('Templates');
    expect(html).toContain('初見の読者');
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
