import { type LiteLizardDocument } from '@litelizard/shared';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it } from 'vitest';
import { useAppStore } from '../store/useAppStore.js';
import { buildSearchSnippet, SearchScreen } from './SearchScreen.js';

const baseState = useAppStore.getState();

function createDocument(): LiteLizardDocument {
  return {
    version: 2,
    documentId: 'doc_search_screen',
    title: '検索できる原稿',
    personaMode: 'general-reader',
    createdAt: '2026-05-07T00:00:00.000Z',
    updatedAt: '2026-05-07T00:00:00.000Z',
    source: { format: 'lzl-v1', originPath: '/projects/novel/search.lzl' },
    chapters: [{ id: 'c1', order: 1, title: '一章' }],
    paragraphs: [
      {
        id: 'p1',
        chapterId: 'c1',
        order: 1,
        light: { text: '風が吹く段落です。', charCount: 9 },
        lizard: { status: 'stale' },
      },
    ],
  };
}

describe('SearchScreen', () => {
  beforeEach(() => {
    useAppStore.setState(baseState, true);
  });

  it('ドキュメント未選択時の空状態を表示する', () => {
    useAppStore.setState({ document: null });

    const html = renderToStaticMarkup(<SearchScreen />);

    expect(html).toContain('ドキュメントを開いてから検索してください。');
    expect(html).toContain('ドキュメントを開くと検索できます');
  });

  it('本文一致のスニペットでは一致箇所を切り出す', () => {
    const document = createDocument();
    const hit = {
      paragraphId: 'p1',
      paragraphOrder: 1,
      chapterId: 'c1',
      chapterTitle: '一章',
      paragraphText: document.paragraphs[0].light.text,
      matchKind: 'paragraph' as const,
      matchStart: 0,
      matchEnd: 1,
    };

    expect(buildSearchSnippet(hit)).toMatchObject({
      leading: '',
      match: '風',
      trailing: 'が吹く段落です。',
    });
  });
});
