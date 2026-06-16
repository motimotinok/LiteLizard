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

describe('AnalysisPane linked highlight', () => {
  beforeEach(() => {
    useAppStore.setState(baseState, true);
    useAppStore.setState({
      analysisSettings: structuredClone(DEFAULT_ANALYSIS_SETTINGS),
      agents: [],
      activeAgentId: null,
      agentsLoaded: true,
    });
  });

  it('対応ハイライト中の段落カードに専用 class を付ける', () => {
    const html = renderToStaticMarkup(
      <AnalysisPane
        document={createDocument()}
        activeParagraphId={null}
        linkedHighlightParagraphId="p1"
      />,
    );

    expect(html).toContain('analysis-card-linked-highlight');
  });

  it('本文側からのスクロール連動で対象にできる段落 ID をカードへ付ける', () => {
    const html = renderToStaticMarkup(
      <AnalysisPane
        document={createDocument()}
        activeParagraphId="p1"
        scrollRequest={{ paragraphId: 'p1', nonce: 1 }}
      />,
    );

    expect(html).toContain('data-analysis-paragraph-id="p1"');
    expect(html).toContain('analysis-card-active');
  });
});
