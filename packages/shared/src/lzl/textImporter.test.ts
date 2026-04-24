import { describe, expect, it, vi } from 'vitest';
import { parseLzl } from './parser.js';
import { buildImportedDocument, parseTextToImportResult } from './textImporter.js';
import { serializeLzl } from './serializer.js';

describe('textImporter', () => {
  it('imports plain text as one chapter using the file title', () => {
    const result = parseTextToImportResult('一段落目。\n\n二段落目。', 'draft');

    expect(result).toEqual({
      title: 'draft',
      chapters: [
        {
          title: 'draft',
          paragraphs: ['一段落目。', '二段落目。'],
        },
      ],
    });
  });

  it('imports markdown headings as chapters', () => {
    const result = parseTextToImportResult('# 第一章\n本文A\n\n本文B\n\n## 第二章\n本文C', 'novel');

    expect(result.title).toBe('novel');
    expect(result.chapters).toEqual([
      { title: '第一章', paragraphs: ['本文A', '本文B'] },
      { title: '第二章', paragraphs: ['本文C'] },
    ]);
  });

  it('creates an empty single-chapter import result for empty files', () => {
    const result = parseTextToImportResult('', 'empty');

    expect(result).toEqual({
      title: 'empty',
      chapters: [{ title: 'empty', paragraphs: [] }],
    });
  });

  it('builds a valid .lzl document with generated ids and an empty paragraph fallback', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-24T00:00:00.000Z'));

    try {
      const importResult = parseTextToImportResult('', 'empty');
      const document = buildImportedDocument(importResult, '/project/empty.lzl');

      expect(document.documentId).toMatch(/^d_[a-z0-9]{10}$/);
      expect(document.chapters).toHaveLength(1);
      expect(document.chapters[0]?.id).toMatch(/^c_[a-z0-9]{10}$/);
      expect(document.paragraphs).toHaveLength(1);
      expect(document.paragraphs[0]).toEqual(
        expect.objectContaining({
          chapterId: document.chapters[0]?.id,
          order: 1,
          light: { text: '', charCount: 0 },
          lizard: { status: 'stale' },
        }),
      );
      expect(document.createdAt).toBe('2026-04-24T00:00:00.000Z');

      const parsed = parseLzl(serializeLzl(document));
      expect(parsed.frontmatter.documentId).toBe(document.documentId);
      expect(parsed.chapters[0]?.title).toBe('empty');
      expect(parsed.paragraphs[0]?.text).toBe('');
    } finally {
      vi.useRealTimers();
    }
  });
});
