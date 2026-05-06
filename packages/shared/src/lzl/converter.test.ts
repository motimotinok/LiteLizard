import { describe, expect, it } from 'vitest';
import { toLiteLizardDocument } from './converter.js';
import type { ParsedLzlDocument } from './types.js';

const parsedDocument: ParsedLzlDocument = {
  frontmatter: {
    documentId: 'd_a8f3k2m9x1',
    format: 'lzl-v1',
    title: '吾輩は猫である',
    chapters: 1,
    paragraphs: 1,
    created: '2026-03-20T00:00:00Z',
    updated: '2026-03-20T12:34:56Z',
  },
  chapters: [{ id: 'c_first00000', title: '第一章' }],
  paragraphs: [
    {
      id: 'p_first00000',
      chapterId: 'c_first00000',
      text: '一つ目',
    },
  ],
};

describe('toLiteLizardDocument', () => {
  it('uses general-reader as the compatibility personaMode for .lzl input', () => {
    const document = toLiteLizardDocument(parsedDocument);

    expect(document.personaMode).toBe('general-reader');
  });

  it('keeps chapter and paragraph order from the parsed .lzl structure', () => {
    const document = toLiteLizardDocument(parsedDocument);

    expect(document.chapters).toEqual([{ id: 'c_first00000', order: 1, title: '第一章' }]);
    expect(document.paragraphs).toMatchObject([
      {
        id: 'p_first00000',
        chapterId: 'c_first00000',
        order: 1,
        light: { text: '一つ目', charCount: 3 },
        lizard: { status: 'stale' },
      },
    ]);
  });
});
