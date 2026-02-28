import { describe, expect, it } from 'vitest';
import {
  collectStaleParagraphs,
  reorderParagraphsInDocument,
  replaceDocumentStructureInDocument,
  replaceParagraphsInDocument,
  updateParagraphInDocument,
} from './documentOps.js';

const doc = {
  version: 2 as const,
  documentId: 'doc_abc123',
  title: 'test',
  personaMode: 'general-reader' as const,
  createdAt: '2026-02-12T00:00:00.000Z',
  updatedAt: '2026-02-12T00:00:00.000Z',
  chapters: [
    {
      id: 'c_aaaaaa',
      order: 1,
      title: '章1',
    },
  ],
  paragraphs: [
    {
      id: 'p_aaaaaa',
      chapterId: 'c_aaaaaa',
      order: 1,
      light: { text: 'a' },
      lizard: { status: 'complete' as const },
    },
    {
      id: 'p_bbbbbb',
      chapterId: 'c_aaaaaa',
      order: 2,
      light: { text: 'b' },
      lizard: { status: 'stale' as const },
    },
  ],
};

describe('document operations', () => {
  it('marks edited paragraph as stale', () => {
    const next = updateParagraphInDocument(doc, 'p_aaaaaa', 'changed');
    const p = next.paragraphs.find((paragraph) => paragraph.id === 'p_aaaaaa');

    expect(p?.light.text).toBe('changed');
    expect(p?.lizard.status).toBe('stale');
  });

  it('reorders paragraphs while keeping ids', () => {
    const next = reorderParagraphsInDocument(doc, ['p_bbbbbb', 'p_aaaaaa']);
    expect(next.paragraphs[0].id).toBe('p_bbbbbb');
    expect(next.paragraphs[0].order).toBe(1);
    expect(next.paragraphs[1].id).toBe('p_aaaaaa');
    expect(next.paragraphs[1].order).toBe(2);
  });

  it('collects only stale paragraphs', () => {
    const stale = collectStaleParagraphs(doc);
    expect(stale).toHaveLength(1);
    expect(stale[0].id).toBe('p_bbbbbb');
  });

  it('replaces paragraphs and keeps unchanged lizard data', () => {
    const next = replaceParagraphsInDocument(doc, ['a', 'new b', 'new c']);
    expect(next.paragraphs).toHaveLength(3);
    expect(next.paragraphs[0].id).toBe('p_aaaaaa');
    expect(next.paragraphs[0].lizard.status).toBe('complete');
    expect(next.paragraphs[1].id).toBe('p_bbbbbb');
    expect(next.paragraphs[1].lizard.status).toBe('stale');
    expect(next.paragraphs[2].id.startsWith('p_')).toBe(true);
    expect(next.paragraphs[2].lizard.status).toBe('stale');
  });

  it('replaces full chapter + paragraph structure', () => {
    const next = replaceDocumentStructureInDocument(doc, {
      chapters: [
        { id: 'c_aaaaaa', title: '章1' },
        { title: '章2' },
      ],
      paragraphs: [
        { id: 'p_aaaaaa', chapterId: 'c_aaaaaa', text: 'a' },
        { text: 'chapter2 text' },
      ],
    });

    expect(next.version).toBe(2);
    expect(next.chapters).toHaveLength(2);
    expect(next.paragraphs[0].lizard.status).toBe('complete');
    expect(next.paragraphs[1].chapterId).toBe(next.chapters[0].id);
  });
});
