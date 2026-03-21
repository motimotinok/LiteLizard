import type { LiteLizardDocument } from '../types.js';

export function serializeLzl(document: LiteLizardDocument): string {
  const chapters = document.chapters.slice().sort((left, right) => left.order - right.order);
  const paragraphsByChapterId = new Map<string, LiteLizardDocument['paragraphs']>();

  document.paragraphs.forEach((paragraph) => {
    const list = paragraphsByChapterId.get(paragraph.chapterId) ?? [];
    list.push(paragraph);
    paragraphsByChapterId.set(paragraph.chapterId, list);
  });

  const frontmatter = [
    '---',
    `documentId: ${document.documentId}`,
    'format: lzl-v1',
    `title: ${document.title}`,
    `chapters: ${chapters.length}`,
    `paragraphs: ${document.paragraphs.length}`,
    `created: ${document.createdAt}`,
    `updated: ${document.updatedAt}`,
    '---',
  ].join('\n');

  const blocks = chapters.map((chapter) => {
    const chapterLines = [`<!--:: ch ${chapter.id} | ${chapter.title} ::-->`, ''];
    const paragraphs = (paragraphsByChapterId.get(chapter.id) ?? []).slice().sort((left, right) => left.order - right.order);

    paragraphs.forEach((paragraph) => {
      chapterLines.push(`<!--:: p ${paragraph.id} ::-->`);

      const text = paragraph.light.text.trimEnd();
      if (text.length > 0) {
        chapterLines.push(text);
      }

      chapterLines.push('');
    });

    return chapterLines.join('\n');
  });

  return blocks.length > 0 ? `${frontmatter}\n\n${blocks.join('\n')}\n` : `${frontmatter}\n`;
}
