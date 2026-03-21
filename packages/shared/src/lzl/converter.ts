import type { LiteLizardDocument } from '../types.js';
import type { ParsedLzlDocument } from './types.js';

export function toLiteLizardDocument(parsed: ParsedLzlDocument): LiteLizardDocument {
  const chapters = parsed.chapters.map((chapter, index) => ({
    id: chapter.id,
    order: index + 1,
    title: chapter.title,
  }));

  const chapterParagraphCounts = new Map<string, number>();
  const paragraphs = parsed.paragraphs.map((paragraph) => {
    const order = (chapterParagraphCounts.get(paragraph.chapterId) ?? 0) + 1;
    chapterParagraphCounts.set(paragraph.chapterId, order);

    return {
      id: paragraph.id,
      chapterId: paragraph.chapterId,
      order,
      light: {
        text: paragraph.text,
        charCount: paragraph.text.length,
      },
      lizard: {
        status: 'stale' as const,
      },
    };
  });

  return {
    version: 2,
    documentId: parsed.frontmatter.documentId,
    title: parsed.frontmatter.title,
    personaMode: 'friendly',
    createdAt: parsed.frontmatter.created,
    updatedAt: parsed.frontmatter.updated,
    source: {
      format: 'lzl-v1',
    },
    chapters,
    paragraphs,
  };
}
