import { describe, expect, it } from 'vitest';
import type { LiteLizardDocument, Paragraph } from '@litelizard/shared';
import { searchInDocument } from './searchInDocument.js';

function makeDocument(
  paragraphs: Paragraph[],
  overrides?: Partial<LiteLizardDocument>,
): LiteLizardDocument {
  return {
    version: 2,
    documentId: 'doc',
    title: '檸檬の話',
    personaMode: 'general-reader',
    createdAt: '2026-05-07T00:00:00.000Z',
    updatedAt: '2026-05-07T00:00:00.000Z',
    chapters: [
      { id: 'c1', order: 1, title: '序章' },
      { id: 'c2', order: 2, title: '二章 旅の続き' },
    ],
    paragraphs,
    ...overrides,
  };
}

function makeParagraph(
  overrides: Partial<Paragraph> & Pick<Paragraph, 'id' | 'chapterId' | 'order'>,
): Paragraph {
  return {
    light: { text: '本文' },
    lizard: { status: 'stale' },
    ...overrides,
  } as Paragraph;
}

describe('searchInDocument', () => {
  it('returns empty array when document is null', () => {
    expect(searchInDocument(null, 'foo')).toEqual([]);
  });

  it('returns empty array when query is empty or whitespace', () => {
    const doc = makeDocument([
      makeParagraph({ id: 'p1', chapterId: 'c1', order: 1, light: { text: 'hello world' } }),
    ]);
    expect(searchInDocument(doc, '')).toEqual([]);
    expect(searchInDocument(doc, '   ')).toEqual([]);
  });

  it('matches paragraph text and reports match position', () => {
    const doc = makeDocument([
      makeParagraph({ id: 'p1', chapterId: 'c1', order: 1, light: { text: '春の風が吹いた。' } }),
      makeParagraph({ id: 'p2', chapterId: 'c2', order: 2, light: { text: '秋の風がやんだ。' } }),
    ]);
    const hits = searchInDocument(doc, '風');
    expect(hits).toHaveLength(2);
    expect(hits[0]).toMatchObject({
      paragraphId: 'p1',
      matchKind: 'paragraph',
      matchStart: 2,
      matchEnd: 3,
    });
    expect(hits[1]).toMatchObject({ paragraphId: 'p2', matchKind: 'paragraph' });
  });

  it('is case-insensitive for ascii queries', () => {
    const doc = makeDocument([
      makeParagraph({ id: 'p1', chapterId: 'c1', order: 1, light: { text: 'Hello World' } }),
    ]);
    const hits = searchInDocument(doc, 'hello');
    expect(hits).toHaveLength(1);
    expect(hits[0]).toMatchObject({ matchStart: 0, matchEnd: 5 });
  });

  it('falls back to chapter-title match when paragraph text does not match', () => {
    const doc = makeDocument([
      makeParagraph({ id: 'p1', chapterId: 'c1', order: 1, light: { text: 'AAA' } }),
      makeParagraph({ id: 'p2', chapterId: 'c2', order: 2, light: { text: 'BBB' } }),
      makeParagraph({ id: 'p3', chapterId: 'c2', order: 3, light: { text: 'CCC' } }),
    ]);
    const hits = searchInDocument(doc, '旅');
    expect(hits.map((h) => h.paragraphId)).toEqual(['p2', 'p3']);
    expect(hits.every((h) => h.matchKind === 'chapter-title')).toBe(true);
  });

  it('falls back to document-title match for any paragraph when nothing else matches', () => {
    const doc = makeDocument([
      makeParagraph({ id: 'p1', chapterId: 'c1', order: 1, light: { text: 'AAA' } }),
      makeParagraph({ id: 'p2', chapterId: 'c2', order: 2, light: { text: 'BBB' } }),
    ]);
    const hits = searchInDocument(doc, '檸檬');
    expect(hits).toHaveLength(2);
    expect(hits.every((h) => h.matchKind === 'document-title')).toBe(true);
  });

  it('prefers paragraph match over chapter-title match for the same paragraph', () => {
    const doc = makeDocument([
      makeParagraph({ id: 'p1', chapterId: 'c2', order: 1, light: { text: '旅の朝' } }),
    ]);
    const hits = searchInDocument(doc, '旅');
    expect(hits).toHaveLength(1);
    expect(hits[0].matchKind).toBe('paragraph');
  });

  it('returns hits sorted by paragraph order', () => {
    const doc = makeDocument([
      makeParagraph({ id: 'p2', chapterId: 'c1', order: 2, light: { text: 'foo' } }),
      makeParagraph({ id: 'p1', chapterId: 'c1', order: 1, light: { text: 'foo' } }),
      makeParagraph({ id: 'p3', chapterId: 'c1', order: 3, light: { text: 'foo' } }),
    ]);
    const hits = searchInDocument(doc, 'foo');
    expect(hits.map((h) => h.paragraphId)).toEqual(['p1', 'p2', 'p3']);
  });

  it('returns empty array when document has no paragraphs', () => {
    const doc = makeDocument([]);
    expect(searchInDocument(doc, '檸檬')).toEqual([]);
  });

  it('exposes chapter title (or null) on each hit', () => {
    const doc = makeDocument([
      makeParagraph({ id: 'p1', chapterId: 'c1', order: 1, light: { text: 'foo' } }),
      makeParagraph({ id: 'pX', chapterId: 'unknown', order: 2, light: { text: 'foo' } }),
    ]);
    const hits = searchInDocument(doc, 'foo');
    expect(hits[0].chapterTitle).toBe('序章');
    expect(hits[1].chapterTitle).toBeNull();
  });
});
