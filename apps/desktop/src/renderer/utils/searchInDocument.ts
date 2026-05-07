import type { LiteLizardDocument } from '@litelizard/shared';

export type SearchMatchKind = 'paragraph' | 'chapter-title' | 'document-title';

export interface SearchHit {
  paragraphId: string;
  paragraphOrder: number;
  chapterId: string;
  chapterTitle: string | null;
  paragraphText: string;
  matchKind: SearchMatchKind;
  matchStart?: number;
  matchEnd?: number;
}

export function searchInDocument(
  document: LiteLizardDocument | null,
  query: string,
): SearchHit[] {
  if (!document) {
    return [];
  }
  const trimmed = query.trim();
  if (trimmed.length === 0) {
    return [];
  }

  const needle = trimmed.toLocaleLowerCase();
  const documentTitleMatches = document.title.toLocaleLowerCase().includes(needle);

  const chapterTitleById = new Map(
    document.chapters.map((chapter) => [chapter.id, chapter.title] as const),
  );
  const chapterTitleMatchSet = new Set<string>();
  for (const chapter of document.chapters) {
    if (chapter.title.toLocaleLowerCase().includes(needle)) {
      chapterTitleMatchSet.add(chapter.id);
    }
  }

  const hits: SearchHit[] = [];
  for (const paragraph of document.paragraphs) {
    const text = paragraph.light.text;
    const lowerText = text.toLocaleLowerCase();
    const paragraphMatchIndex = lowerText.indexOf(needle);
    const chapterTitle = chapterTitleById.get(paragraph.chapterId) ?? null;

    if (paragraphMatchIndex >= 0) {
      hits.push({
        paragraphId: paragraph.id,
        paragraphOrder: paragraph.order,
        chapterId: paragraph.chapterId,
        chapterTitle,
        paragraphText: text,
        matchKind: 'paragraph',
        matchStart: paragraphMatchIndex,
        matchEnd: paragraphMatchIndex + needle.length,
      });
      continue;
    }

    if (chapterTitleMatchSet.has(paragraph.chapterId)) {
      hits.push({
        paragraphId: paragraph.id,
        paragraphOrder: paragraph.order,
        chapterId: paragraph.chapterId,
        chapterTitle,
        paragraphText: text,
        matchKind: 'chapter-title',
      });
      continue;
    }

    if (documentTitleMatches) {
      hits.push({
        paragraphId: paragraph.id,
        paragraphOrder: paragraph.order,
        chapterId: paragraph.chapterId,
        chapterTitle,
        paragraphText: text,
        matchKind: 'document-title',
      });
    }
  }

  hits.sort((a, b) => a.paragraphOrder - b.paragraphOrder);
  return hits;
}
