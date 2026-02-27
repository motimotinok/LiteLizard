import type { Chapter, LiteLizardDocument } from '@litelizard/shared';
import type { ChapterStructureInput, DocumentStructureInput } from '../types/documentStructure.js';

export function updateParagraphInDocument(
  document: LiteLizardDocument,
  paragraphId: string,
  text: string,
): LiteLizardDocument {
  return {
    ...document,
    updatedAt: new Date().toISOString(),
    paragraphs: document.paragraphs.map((paragraph) =>
      paragraph.id === paragraphId
        ? {
            ...paragraph,
            light: {
              ...paragraph.light,
              text,
              charCount: text.length,
            },
            lizard: {
              ...paragraph.lizard,
              status: 'stale',
            },
          }
        : paragraph,
    ),
  };
}

export function reorderParagraphsInDocument(
  document: LiteLizardDocument,
  orderedIds: string[],
): LiteLizardDocument {
  const map = new Map(document.paragraphs.map((paragraph) => [paragraph.id, paragraph]));
  const paragraphs = orderedIds
    .map((id) => map.get(id))
    .filter((paragraph): paragraph is NonNullable<typeof paragraph> => Boolean(paragraph))
    .map((paragraph, index) => ({
      ...paragraph,
      order: index + 1,
    }));

  return {
    ...document,
    updatedAt: new Date().toISOString(),
    paragraphs,
  };
}

export function collectStaleParagraphs(document: LiteLizardDocument) {
  return document.paragraphs.filter((paragraph) => paragraph.lizard.status === 'stale');
}

function createParagraphId() {
  return `p_${Math.random().toString(36).slice(2, 10)}`;
}

function createChapterId() {
  return `c_${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeChapters(chapters: ChapterStructureInput[]): Chapter[] {
  const filtered = chapters
    .map((chapter) => ({ id: chapter.id, title: chapter.title.trim() }))
    .filter((chapter) => chapter.title.length > 0);

  if (filtered.length === 0) {
    return [
      {
        id: createChapterId(),
        order: 1,
        title: '章1',
      },
    ];
  }

  return filtered.map((chapter, index) => ({
    id: chapter.id ?? createChapterId(),
    order: index + 1,
    title: chapter.title,
  }));
}

export function replaceDocumentStructureInDocument(
  document: LiteLizardDocument,
  input: DocumentStructureInput,
): LiteLizardDocument {
  const chapters = normalizeChapters(input.chapters);
  const chapterIdSet = new Set(chapters.map((chapter) => chapter.id));
  const fallbackChapterId = chapters[0].id;

  const previousById = new Map(document.paragraphs.map((paragraph) => [paragraph.id, paragraph]));

  const normalizedParagraphs = (input.paragraphs.length > 0 ? input.paragraphs : [{ text: ' ', chapterId: fallbackChapterId }]).map(
    (paragraph, index) => {
      const nextText = paragraph.text.length > 0 ? paragraph.text : ' ';
      const paragraphId = paragraph.id ?? createParagraphId();
      const chapterId = paragraph.chapterId && chapterIdSet.has(paragraph.chapterId) ? paragraph.chapterId : fallbackChapterId;
      const previous = previousById.get(paragraphId);
      const changed = !previous || previous.light.text !== nextText || previous.chapterId !== chapterId;

      return {
        id: paragraphId,
        chapterId,
        order: index + 1,
        light: {
          text: nextText,
          charCount: nextText.length,
        },
        lizard: changed ? { status: 'stale' as const } : previous.lizard,
      };
    },
  );

  return {
    ...document,
    version: 2,
    updatedAt: new Date().toISOString(),
    chapters,
    paragraphs: normalizedParagraphs,
  };
}

export function replaceParagraphsInDocument(
  document: LiteLizardDocument,
  nextParagraphTexts: string[],
): LiteLizardDocument {
  const chapterId = document.chapters[0]?.id ?? createChapterId();

  return replaceDocumentStructureInDocument(document, {
    chapters: document.chapters.length > 0 ? document.chapters : [{ id: chapterId, title: '章1' }],
    paragraphs: (nextParagraphTexts.length > 0 ? nextParagraphTexts : [' ']).map((text, index) => ({
      id: document.paragraphs[index]?.id,
      chapterId: document.paragraphs[index]?.chapterId ?? chapterId,
      text,
    })),
  });
}
