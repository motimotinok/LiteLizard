import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { validateAndRepairLzl } from './validator.js';
import type { ParsedLzlDocument } from './types.js';

function baseDocument(): ParsedLzlDocument {
  return {
    frontmatter: {
      documentId: 'd_abcdefghij',
      format: 'lzl-v1',
      title: '題名',
      chapters: 1,
      paragraphs: 1,
      created: '2026-03-20T00:00:00Z',
      updated: '2026-03-20T00:00:00Z',
    },
    chapters: [{ id: 'c_abcdefghij', title: '第一章' }],
    paragraphs: [{ id: 'p_abcdefghij', chapterId: 'c_abcdefghij', chapterIndex: 0, text: '本文' }],
  };
}

describe('validateAndRepairLzl', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-21T00:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('repairs missing frontmatter fields without replacing a valid documentId', () => {
    const source = baseDocument();
    const result = validateAndRepairLzl({
      ...source,
      frontmatter: {
        ...source.frontmatter,
        format: '',
        title: '',
        updated: '',
      },
    });

    expect(result.issues.some((entry) => entry.code === 'FRONTMATTER_MISSING')).toBe(true);
    expect(result.document.frontmatter.documentId).toBe(source.frontmatter.documentId);
    expect(result.document.frontmatter.created).toBe(source.frontmatter.created);
    expect(result.document.frontmatter.updated).toBe('2026-03-21T00:00:00.000Z');
    expect(result.document.frontmatter.format).toBe('lzl-v1');
    expect(result.document.frontmatter.title).toBe('無題');
  });

  it('rebuilds missing frontmatter when all key fields are absent', () => {
    const result = validateAndRepairLzl({
      ...baseDocument(),
      frontmatter: {
        documentId: '',
        format: '',
        title: '',
        chapters: 0,
        paragraphs: 0,
        created: '',
        updated: '',
      },
    });

    expect(result.issues.some((entry) => entry.code === 'FRONTMATTER_MISSING')).toBe(true);
    expect(result.document.frontmatter.format).toBe('lzl-v1');
    expect(result.document.frontmatter.title).toBe('無題');
    expect(result.document.frontmatter.created).toBe('2026-03-21T00:00:00.000Z');
  });

  it('repairs mismatched chapter and paragraph counts', () => {
    const result = validateAndRepairLzl({
      ...baseDocument(),
      frontmatter: {
        ...baseDocument().frontmatter,
        chapters: 9,
        paragraphs: 9,
      },
    });

    expect(result.issues.some((entry) => entry.code === 'CHAPTER_COUNT_MISMATCH')).toBe(true);
    expect(result.issues.some((entry) => entry.code === 'PARAGRAPH_COUNT_MISMATCH')).toBe(true);
    expect(result.document.frontmatter.chapters).toBe(1);
    expect(result.document.frontmatter.paragraphs).toBe(1);
  });

  it('creates a default chapter when no chapter marker exists', () => {
    const result = validateAndRepairLzl({
      ...baseDocument(),
      chapters: [],
      paragraphs: [{ id: 'p_abcdefghij', chapterId: '', chapterIndex: 0, text: '本文' }],
    });

    expect(result.issues.some((entry) => entry.code === 'NO_CHAPTER_MARKER')).toBe(true);
    expect(result.document.chapters[0]?.title).toBe('第1章');
    expect(result.document.paragraphs[0]?.chapterId).toBe(result.document.chapters[0]?.id);
  });

  it('assigns ids to unmarked text paragraphs', () => {
    const result = validateAndRepairLzl({
      ...baseDocument(),
      paragraphs: [{ id: '', chapterId: 'c_abcdefghij', chapterIndex: 0, text: '本文' }],
    });

    expect(result.issues.some((entry) => entry.code === 'UNMARKED_TEXT')).toBe(true);
    expect(result.document.paragraphs[0]?.id).toMatch(/^p_[a-z0-9]{10}$/);
  });

  it('reassigns duplicate ids after the first occurrence', () => {
    const result = validateAndRepairLzl({
      ...baseDocument(),
      paragraphs: [
        { id: 'p_abcdefghij', chapterId: 'c_abcdefghij', chapterIndex: 0, text: '本文A' },
        { id: 'p_abcdefghij', chapterId: 'c_abcdefghij', chapterIndex: 0, text: '本文B' },
      ],
      frontmatter: {
        ...baseDocument().frontmatter,
        paragraphs: 2,
      },
    });

    expect(result.issues.some((entry) => entry.code === 'DUPLICATE_ID')).toBe(true);
    expect(result.document.paragraphs[0]?.id).toBe('p_abcdefghij');
    expect(result.document.paragraphs[1]?.id).not.toBe('p_abcdefghij');
  });

  it('adds an empty paragraph to empty chapters', () => {
    const result = validateAndRepairLzl({
      ...baseDocument(),
      chapters: [
        { id: 'c_abcdefghij', title: '第一章' },
        { id: 'c_bcdefghijk', title: '第二章' },
      ],
      paragraphs: [{ id: 'p_abcdefghij', chapterId: 'c_abcdefghij', chapterIndex: 0, text: '本文' }],
      frontmatter: {
        ...baseDocument().frontmatter,
        chapters: 2,
      },
    });

    expect(result.issues.some((entry) => entry.code === 'EMPTY_CHAPTER')).toBe(true);
    expect(result.document.paragraphs).toHaveLength(2);
    expect(result.document.paragraphs[1]).toEqual(
      expect.objectContaining({
        chapterId: 'c_bcdefghijk',
        chapterIndex: 1,
        text: '',
      }),
    );
  });

  it('keeps paragraph ownership when chapter ids are repaired', () => {
    const result = validateAndRepairLzl({
      ...baseDocument(),
      chapters: [
        { id: 'invalid', title: '第一章' },
        { id: 'invalid', title: '第二章' },
      ],
      paragraphs: [
        { id: 'p_abcdefghij', chapterId: 'invalid', chapterIndex: 0, text: '本文A' },
        { id: 'p_bcdefghijk', chapterId: 'invalid', chapterIndex: 1, text: '本文B' },
      ],
      frontmatter: {
        ...baseDocument().frontmatter,
        chapters: 2,
        paragraphs: 2,
      },
    });

    expect(result.document.chapters).toHaveLength(2);
    expect(result.document.paragraphs).toHaveLength(2);
    expect(result.document.paragraphs[0]?.chapterId).toBe(result.document.chapters[0]?.id);
    expect(result.document.paragraphs[1]?.chapterId).toBe(result.document.chapters[1]?.id);
    expect(result.issues.some((entry) => entry.code === 'EMPTY_CHAPTER')).toBe(false);
  });

  it('returns no issues for a valid document', () => {
    const result = validateAndRepairLzl(baseDocument());

    expect(result.issues).toEqual([]);
    expect(result.document).toEqual(baseDocument());
  });
});
