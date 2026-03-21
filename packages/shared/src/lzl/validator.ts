import { createChapterId, createDocumentId, createParagraphId, isValidChapterId, isValidDocumentId, isValidParagraphId } from './ids.js';
import type { LzlValidationIssue, LzlValidationResult, ParsedLzlDocument } from './types.js';

function cloneDocument(parsed: ParsedLzlDocument): ParsedLzlDocument {
  return {
    frontmatter: { ...parsed.frontmatter },
    chapters: parsed.chapters.map((chapter) => ({ ...chapter })),
    paragraphs: parsed.paragraphs.map((paragraph) => ({ ...paragraph })),
  };
}

function issue(code: LzlValidationIssue['code'], message: string): LzlValidationIssue {
  return { code, message, autoRepaired: true };
}

export function validateAndRepairLzl(parsed: ParsedLzlDocument): LzlValidationResult {
  const document = cloneDocument(parsed);
  const issues: LzlValidationIssue[] = [];
  const now = new Date().toISOString();

  let repairedFrontmatter = false;

  if (!isValidDocumentId(document.frontmatter.documentId)) {
    document.frontmatter.documentId = createDocumentId();
    repairedFrontmatter = true;
  }

  if (document.frontmatter.title.trim().length === 0) {
    document.frontmatter.title = '無題';
    repairedFrontmatter = true;
  }

  if (document.frontmatter.created.length === 0) {
    document.frontmatter.created = now;
    repairedFrontmatter = true;
  }

  if (document.frontmatter.updated.length === 0) {
    document.frontmatter.updated = now;
    repairedFrontmatter = true;
  }

  if (document.frontmatter.format !== 'lzl-v1') {
    document.frontmatter.format = 'lzl-v1';
    repairedFrontmatter = true;
  }

  if (repairedFrontmatter) {
    issues.push(issue('FRONTMATTER_MISSING', 'フロントマターを再生成しました。'));
  }

  if (document.chapters.length === 0) {
    const chapterId = createChapterId();
    document.chapters = [
      {
        id: chapterId,
        title: '第1章',
      },
    ];
    document.paragraphs = document.paragraphs.map((paragraph) => ({
      ...paragraph,
      chapterId,
    }));
    issues.push(issue('NO_CHAPTER_MARKER', '章マーカーがないためデフォルト章を生成しました。'));
  }

  let sawUnmarkedText = false;
  document.paragraphs = document.paragraphs.map((paragraph) => {
    let nextId = paragraph.id;

    if (!isValidParagraphId(nextId)) {
      nextId = createParagraphId();
      sawUnmarkedText = true;
    }

    return {
      ...paragraph,
      id: nextId,
    };
  });

  if (sawUnmarkedText) {
    issues.push(issue('UNMARKED_TEXT', 'マーカーのないテキストに paragraphId を割り当てました。'));
  }

  const chapterIds = new Set<string>();
  const repairedChapterIdsByIndex = new Map<number, string>();

  document.chapters = document.chapters.map((chapter, chapterIndex) => {
    let nextId = chapter.id;

    if (!isValidChapterId(nextId) || chapterIds.has(nextId)) {
      nextId = createChapterId();
      issues.push(issue('DUPLICATE_ID', '重複または不正な chapterId を再採番しました。'));
    }

    chapterIds.add(nextId);
    repairedChapterIdsByIndex.set(chapterIndex, nextId);

    return {
      ...chapter,
      id: nextId,
      title: chapter.title.trim() || '第1章',
    };
  });

  const validChapterIdSet = new Set(document.chapters.map((chapter) => chapter.id));
  const fallbackChapterId = document.chapters[0].id;
  const paragraphIds = new Set<string>();

  document.paragraphs = document.paragraphs.map((paragraph) => {
    let nextId = paragraph.id;
    if (paragraphIds.has(nextId)) {
      nextId = createParagraphId();
      issues.push(issue('DUPLICATE_ID', '重複した paragraphId を再採番しました。'));
    }

    paragraphIds.add(nextId);

    return {
      ...paragraph,
      id: nextId,
      chapterId:
        repairedChapterIdsByIndex.get(paragraph.chapterIndex) ??
        (validChapterIdSet.has(paragraph.chapterId) ? paragraph.chapterId : fallbackChapterId),
    };
  });

  const paragraphsByChapterId = new Map<string, ParsedLzlDocument['paragraphs']>();
  document.paragraphs.forEach((paragraph) => {
    const list = paragraphsByChapterId.get(paragraph.chapterId) ?? [];
    list.push(paragraph);
    paragraphsByChapterId.set(paragraph.chapterId, list);
  });

  document.chapters.forEach((chapter, chapterIndex) => {
    if ((paragraphsByChapterId.get(chapter.id) ?? []).length === 0) {
      document.paragraphs.push({
        id: createParagraphId(),
        chapterId: chapter.id,
        chapterIndex,
        text: '',
      });
      issues.push(issue('EMPTY_CHAPTER', '空の章に空段落を追加しました。'));
    }
  });

  if (document.frontmatter.chapters !== document.chapters.length) {
    document.frontmatter.chapters = document.chapters.length;
    issues.push(issue('CHAPTER_COUNT_MISMATCH', 'フロントマターの章数を修正しました。'));
  }

  if (document.frontmatter.paragraphs !== document.paragraphs.length) {
    document.frontmatter.paragraphs = document.paragraphs.length;
    issues.push(issue('PARAGRAPH_COUNT_MISMATCH', 'フロントマターの段落数を修正しました。'));
  }

  if (!isValidDocumentId(document.frontmatter.documentId)) {
    document.frontmatter.documentId = createDocumentId();
    issues.push(issue('DUPLICATE_ID', '不正な documentId を再採番しました。'));
  }

  document.frontmatter.format = 'lzl-v1';

  return {
    issues,
    document,
  };
}
