import type { LiteLizardDocument } from '../types.js';

function compareOrder(left: { order: number }, right: { order: number }) {
  return left.order - right.order;
}

export function exportDocumentToPlainText(document: LiteLizardDocument): string {
  const blocks: string[] = [];
  const title = document.title.trim();
  if (title) {
    blocks.push(title);
  }

  const sortedChapters = document.chapters.slice().sort(compareOrder);
  const chapterIds = new Set(sortedChapters.map((chapter) => chapter.id));
  const paragraphsByChapterId = new Map<string, LiteLizardDocument['paragraphs']>();
  const orphanParagraphs: LiteLizardDocument['paragraphs'] = [];

  document.paragraphs.forEach((paragraph) => {
    if (!chapterIds.has(paragraph.chapterId)) {
      orphanParagraphs.push(paragraph);
      return;
    }

    const list = paragraphsByChapterId.get(paragraph.chapterId) ?? [];
    list.push(paragraph);
    paragraphsByChapterId.set(paragraph.chapterId, list);
  });

  sortedChapters.forEach((chapter) => {
    const chapterBlocks: string[] = [];
    const chapterTitle = chapter.title.trim();
    if (chapterTitle) {
      chapterBlocks.push(chapterTitle);
    }

    const paragraphs = (paragraphsByChapterId.get(chapter.id) ?? []).slice().sort(compareOrder);
    paragraphs.forEach((paragraph) => {
      const text = paragraph.light.text.trimEnd();
      if (text) {
        chapterBlocks.push(text);
      }
    });

    if (chapterBlocks.length > 0) {
      blocks.push(chapterBlocks.join('\n\n'));
    }
  });

  orphanParagraphs
    .slice()
    .sort(compareOrder)
    .forEach((paragraph) => {
      const text = paragraph.light.text.trimEnd();
      if (text) {
        blocks.push(text);
      }
    });

  return blocks.length > 0 ? `${blocks.join('\n\n')}\n` : '';
}
