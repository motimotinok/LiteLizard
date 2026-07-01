import { DEFAULT_ANALYSIS_SETTINGS, type LiteLizardDocument } from '@litelizard/shared';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it } from 'vitest';
import { useAppStore } from '../store/useAppStore.js';
import { AnalysisPane } from './AnalysisPane.js';

const baseState = useAppStore.getState();

function createDocument(): LiteLizardDocument {
  return {
    version: 2,
    documentId: 'doc_linked_highlight',
    title: 'linked highlight draft',
    personaMode: 'general-reader',
    createdAt: '2026-05-06T00:00:00.000Z',
    updatedAt: '2026-05-06T00:00:00.000Z',
    source: { format: 'lzl-v1', originPath: '/projects/novel/linked-highlight.lzl' },
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

describe('AnalysisPane focused paragraph view', () => {
  beforeEach(() => {
    useAppStore.setState(baseState, true);
    useAppStore.setState({
      analysisSettings: structuredClone(DEFAULT_ANALYSIS_SETTINGS),
      agents: [],
      activeAgentId: null,
      agentsLoaded: true,
    });
  });

  it('未選択時は右パネルで段落詳細を出さず、本文横レーンからの選択を促す', () => {
    const html = renderToStaticMarkup(
      <AnalysisPane
        document={createDocument()}
        activeParagraphId={null}
      />,
    );

    expect(html).toContain('本文横の読みから段落を選ぶと詳細が表示されます。');
    expect(html).not.toContain('analysis-focus-card');
  });

  it('選択段落の詳細と段落限定質問の入口を表示する', () => {
    const html = renderToStaticMarkup(
      <AnalysisPane
        document={createDocument()}
        activeParagraphId="p1"
      />,
    );

    expect(html).toContain('data-analysis-paragraph-id="p1"');
    expect(html).toContain('analysis-focus-card');
    expect(html).toContain('この段落について聞く');
  });
});
