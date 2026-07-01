import type { LiteLizardDocument } from '@litelizard/shared';
import { describe, expect, it } from 'vitest';
import {
  collectStaleParagraphs,
  deleteChapterFromDocument,
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

function buildMultiChapterDoc(): LiteLizardDocument {
  return {
    version: 2 as const,
    documentId: 'doc_multi',
    title: 'multi',
    personaMode: 'general-reader' as const,
    createdAt: '2026-02-12T00:00:00.000Z',
    updatedAt: '2026-02-12T00:00:00.000Z',
    chapters: [
      { id: 'c_a', order: 1, title: '章A' },
      { id: 'c_b', order: 2, title: '章B' },
      { id: 'c_c', order: 3, title: '章C' },
    ],
    paragraphs: [
      {
        id: 'p_a1',
        chapterId: 'c_a',
        order: 1,
        light: { text: 'a1' },
        lizard: { status: 'complete' as const },
      },
      {
        id: 'p_a2',
        chapterId: 'c_a',
        order: 2,
        light: { text: 'a2' },
        lizard: { status: 'complete' as const },
      },
      {
        id: 'p_b1',
        chapterId: 'c_b',
        order: 3,
        light: { text: 'b1' },
        lizard: { status: 'complete' as const },
      },
      {
        id: 'p_b2',
        chapterId: 'c_b',
        order: 4,
        light: { text: 'b2' },
        lizard: { status: 'complete' as const },
      },
      {
        id: 'p_c1',
        chapterId: 'c_c',
        order: 5,
        light: { text: 'c1' },
        lizard: { status: 'complete' as const },
      },
    ],
  };
}

describe('deleteChapterFromDocument', () => {
  it('absorbs paragraphs into the previous chapter when a non-first chapter is deleted', () => {
    const next = deleteChapterFromDocument(buildMultiChapterDoc(), 'c_b');

    expect(next.chapters.map((chapter) => chapter.id)).toEqual(['c_a', 'c_c']);
    expect(next.chapters.map((chapter) => chapter.order)).toEqual([1, 2]);

    const chapterAParagraphs = next.paragraphs.filter((paragraph) => paragraph.chapterId === 'c_a');
    expect(chapterAParagraphs.map((paragraph) => paragraph.id)).toEqual([
      'p_a1',
      'p_a2',
      'p_b1',
      'p_b2',
    ]);
    expect(chapterAParagraphs.map((paragraph) => paragraph.order)).toEqual([1, 2, 3, 4]);

    const chapterCParagraphs = next.paragraphs.filter((paragraph) => paragraph.chapterId === 'c_c');
    expect(chapterCParagraphs.map((paragraph) => paragraph.id)).toEqual(['p_c1']);
    expect(chapterCParagraphs.map((paragraph) => paragraph.order)).toEqual([5]);
  });

  it('marks moved paragraphs stale because their chapter context changed', () => {
    const next = deleteChapterFromDocument(buildMultiChapterDoc(), 'c_b');

    const moved = next.paragraphs.filter((paragraph) =>
      ['p_b1', 'p_b2'].includes(paragraph.id),
    );
    expect(moved.every((paragraph) => paragraph.lizard.status === 'stale')).toBe(true);

    const untouched = next.paragraphs.filter((paragraph) =>
      ['p_a1', 'p_a2', 'p_c1'].includes(paragraph.id),
    );
    expect(untouched.every((paragraph) => paragraph.lizard.status === 'complete')).toBe(true);
  });

  it('keeps paragraphs under a fresh untitled chapter when the first non-empty chapter is deleted', () => {
    const next = deleteChapterFromDocument(buildMultiChapterDoc(), 'c_a');

    expect(next.chapters[0].title).toBe('');
    expect(next.chapters[0].order).toBe(1);
    expect(next.chapters[0].id).not.toBe('c_a');
    expect(next.chapters.slice(1).map((chapter) => chapter.id)).toEqual(['c_b', 'c_c']);

    const newChapterId = next.chapters[0].id;
    const movedParagraphs = next.paragraphs.filter(
      (paragraph) => paragraph.chapterId === newChapterId,
    );
    expect(movedParagraphs.map((paragraph) => paragraph.id)).toEqual(['p_a1', 'p_a2']);
    expect(movedParagraphs.every((paragraph) => paragraph.lizard.status === 'stale')).toBe(true);
  });

  it('treats deleting the only remaining chapter the same as deleting the first chapter', () => {
    const singleChapterDoc: LiteLizardDocument = {
      ...buildMultiChapterDoc(),
      chapters: [{ id: 'c_only', order: 1, title: '唯一章' }],
      paragraphs: [
        {
          id: 'p_only_1',
          chapterId: 'c_only',
          order: 1,
          light: { text: 'only-1' },
          lizard: { status: 'complete' as const },
        },
      ],
    };

    const next = deleteChapterFromDocument(singleChapterDoc, 'c_only');

    expect(next.chapters).toHaveLength(1);
    expect(next.chapters[0].title).toBe('');
    expect(next.chapters[0].id).not.toBe('c_only');

    const newChapterId = next.chapters[0].id;
    expect(next.paragraphs).toHaveLength(1);
    expect(next.paragraphs[0].chapterId).toBe(newChapterId);
    expect(next.paragraphs[0].lizard.status).toBe('stale');
  });

  it('removes an empty non-first chapter without touching other paragraphs', () => {
    const docWithEmptyMiddleChapter: LiteLizardDocument = {
      ...buildMultiChapterDoc(),
      paragraphs: buildMultiChapterDoc().paragraphs.filter(
        (paragraph) => paragraph.chapterId !== 'c_b',
      ),
    };

    const next = deleteChapterFromDocument(docWithEmptyMiddleChapter, 'c_b');

    expect(next.chapters.map((chapter) => chapter.id)).toEqual(['c_a', 'c_c']);
    expect(next.paragraphs.map((paragraph) => paragraph.id)).toEqual([
      'p_a1',
      'p_a2',
      'p_c1',
    ]);
    expect(next.paragraphs.every((paragraph) => paragraph.lizard.status === 'complete')).toBe(true);
    expect(next.paragraphs.map((paragraph) => paragraph.order)).toEqual([1, 2, 3]);
  });

  it('removes an empty first chapter and re-orders the rest', () => {
    const docWithEmptyFirstChapter: LiteLizardDocument = {
      ...buildMultiChapterDoc(),
      paragraphs: buildMultiChapterDoc().paragraphs.filter(
        (paragraph) => paragraph.chapterId !== 'c_a',
      ),
    };

    const next = deleteChapterFromDocument(docWithEmptyFirstChapter, 'c_a');

    expect(next.chapters.map((chapter) => chapter.id)).toEqual(['c_b', 'c_c']);
    expect(next.chapters.map((chapter) => chapter.order)).toEqual([1, 2]);
    expect(next.paragraphs.every((paragraph) => paragraph.chapterId !== 'c_a')).toBe(true);
    expect(next.paragraphs.every((paragraph) => paragraph.lizard.status === 'complete')).toBe(true);
  });

  it('replaces the only chapter with a fresh untitled empty chapter when it is empty', () => {
    const docWithEmptyOnlyChapter: LiteLizardDocument = {
      ...buildMultiChapterDoc(),
      chapters: [{ id: 'c_only', order: 1, title: '唯一章' }],
      paragraphs: [],
    };

    const next = deleteChapterFromDocument(docWithEmptyOnlyChapter, 'c_only');

    expect(next.chapters).toHaveLength(1);
    expect(next.chapters[0].title).toBe('');
    expect(next.chapters[0].id).not.toBe('c_only');
    expect(next.paragraphs).toEqual([]);
  });

  it('returns the document unchanged when the chapter id does not exist', () => {
    const baseline = buildMultiChapterDoc();
    const next = deleteChapterFromDocument(baseline, 'c_unknown');

    expect(next).toBe(baseline);
  });
});
