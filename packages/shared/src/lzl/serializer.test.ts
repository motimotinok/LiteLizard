import { describe, expect, it } from 'vitest';
import type { LiteLizardDocument } from '../types.js';
import { parseLzl } from './parser.js';
import { serializeLzl } from './serializer.js';

const sampleDocument: LiteLizardDocument = {
  version: 2,
  documentId: 'd_a8f3k2m9x1',
  title: '吾輩は猫である',
  personaMode: 'friendly',
  createdAt: '2026-03-20T00:00:00Z',
  updatedAt: '2026-03-20T12:34:56Z',
  source: {
    format: 'lzl-v1',
  },
  chapters: [
    { id: 'c_second0000', order: 2, title: '第二章' },
    { id: 'c_first00000', order: 1, title: '第一章' },
  ],
  paragraphs: [
    {
      id: 'p_first00000',
      chapterId: 'c_first00000',
      order: 2,
      light: { text: '二つ目', charCount: 3 },
      lizard: { status: 'stale' },
    },
    {
      id: 'p_second0000',
      chapterId: 'c_second0000',
      order: 1,
      light: { text: '', charCount: 0 },
      lizard: { status: 'stale' },
    },
    {
      id: 'p_first00001',
      chapterId: 'c_first00000',
      order: 1,
      light: { text: '一つ目', charCount: 3 },
      lizard: { status: 'stale' },
    },
  ],
};

describe('serializeLzl', () => {
  it('round-trips through parseLzl', () => {
    const serialized = serializeLzl(sampleDocument);
    const parsed = parseLzl(serialized);

    expect(parsed.frontmatter.documentId).toBe(sampleDocument.documentId);
    expect(parsed.chapters.map((chapter) => chapter.id)).toEqual(['c_first00000', 'c_second0000']);
    expect(parsed.paragraphs.map((paragraph) => paragraph.id)).toEqual(['p_first00001', 'p_first00000', 'p_second0000']);
  });

  it('serializes empty paragraphs as blank content after the marker', () => {
    const serialized = serializeLzl(sampleDocument);

    expect(serialized).toContain('<!--:: p p_second0000 ::-->\n\n');
  });

  it('serializes chapters in order', () => {
    const serialized = serializeLzl(sampleDocument);
    const firstChapterIndex = serialized.indexOf('<!--:: ch c_first00000 | 第一章 ::-->');
    const secondChapterIndex = serialized.indexOf('<!--:: ch c_second0000 | 第二章 ::-->');

    expect(firstChapterIndex).toBeGreaterThan(-1);
    expect(secondChapterIndex).toBeGreaterThan(firstChapterIndex);
  });

  it('writes accurate frontmatter counts', () => {
    const serialized = serializeLzl(sampleDocument);

    expect(serialized).toContain('chapters: 2');
    expect(serialized).toContain('paragraphs: 3');
    expect(serialized.endsWith('\n')).toBe(true);
  });
});

describe('serializeLzl - orphan paragraphs', () => {
  const baseDoc: LiteLizardDocument = {
    version: 2,
    documentId: 'd_abcdefghij',
    title: 'test',
    personaMode: 'friendly',
    createdAt: '2026-03-20T00:00:00Z',
    updatedAt: '2026-03-20T00:00:00Z',
    source: { format: 'lzl-v1' },
    chapters: [
      { id: 'c_first00000', order: 1, title: '第一章' },
      { id: 'c_second0000', order: 2, title: '第二章' },
    ],
    paragraphs: [],
  };

  it('appends orphan paragraph to the last chapter', () => {
    const doc: LiteLizardDocument = {
      ...baseDoc,
      paragraphs: [
        { id: 'p_normal0000', chapterId: 'c_first00000', order: 1, light: { text: '正常', charCount: 2 }, lizard: { status: 'stale' } },
        { id: 'p_orphan0000', chapterId: 'c_nonexistent', order: 1, light: { text: '孤立', charCount: 2 }, lizard: { status: 'stale' } },
      ],
    };

    const serialized = serializeLzl(doc);

    const secondChapterStart = serialized.indexOf('<!--:: ch c_second0000 | 第二章 ::-->');
    const orphanIndex = serialized.indexOf('<!--:: p p_orphan0000 ::-->');
    expect(orphanIndex).toBeGreaterThan(secondChapterStart);
    expect(serialized).toContain('孤立');
  });

  it('preserves paragraph count in round-trip when orphan exists', () => {
    const doc: LiteLizardDocument = {
      ...baseDoc,
      paragraphs: [
        { id: 'p_normal0000', chapterId: 'c_first00000', order: 1, light: { text: '正常', charCount: 2 }, lizard: { status: 'stale' } },
        { id: 'p_orphan0000', chapterId: 'c_nonexistent', order: 1, light: { text: '孤立', charCount: 2 }, lizard: { status: 'stale' } },
      ],
    };

    const serialized = serializeLzl(doc);
    const parsed = parseLzl(serialized);

    expect(parsed.paragraphs).toHaveLength(2);
    expect(parsed.paragraphs.find((p) => p.id === 'p_orphan0000')?.chapterId).toBe('c_second0000');
  });

  it('appends multiple orphan paragraphs with different invalid chapterIds to the last chapter', () => {
    const doc: LiteLizardDocument = {
      ...baseDoc,
      paragraphs: [
        { id: 'p_orphan0001', chapterId: 'c_ghost00001', order: 1, light: { text: '孤立A', charCount: 3 }, lizard: { status: 'stale' } },
        { id: 'p_orphan0002', chapterId: 'c_ghost00002', order: 2, light: { text: '孤立B', charCount: 3 }, lizard: { status: 'stale' } },
      ],
    };

    const serialized = serializeLzl(doc);
    const parsed = parseLzl(serialized);

    expect(parsed.paragraphs).toHaveLength(2);
    expect(parsed.paragraphs.every((p) => p.chapterId === 'c_second0000')).toBe(true);
  });
});
