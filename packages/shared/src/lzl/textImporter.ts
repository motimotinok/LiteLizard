import { createChapterId, createDocumentId, createParagraphId } from './ids.js';
import type { LiteLizardDocument } from '../types.js';

const HEADING_PATTERN = /^#{1,6}\s+(.+)$/;

export interface TextImportChapter {
  title: string;
  paragraphs: string[];
}

export interface TextImportResult {
  title: string;
  chapters: TextImportChapter[];
}

export function parseTextToImportResult(text: string, fileTitle: string): TextImportResult {
  const lines = text.replace(/\r\n/g, '\n').split('\n');

  const chapters: TextImportChapter[] = [];
  let currentChapterTitle: string | null = null;
  let currentParagraphs: string[] = [];
  let buffer: string[] = [];

  const flushParagraph = () => {
    const paragraph = buffer.join('\n').trim();
    buffer = [];
    if (paragraph.length === 0) return;
    currentParagraphs.push(paragraph);
  };

  const flushChapter = () => {
    flushParagraph();
    if (currentChapterTitle !== null) {
      chapters.push({ title: currentChapterTitle, paragraphs: currentParagraphs });
    } else if (currentParagraphs.length > 0) {
      // 見出し登場前の段落を保留リストに退避（後で先頭章に付ける）
      chapters.push({ title: fileTitle, paragraphs: currentParagraphs });
    }
    currentParagraphs = [];
    currentChapterTitle = null;
  };

  for (const line of lines) {
    const headingMatch = line.match(HEADING_PATTERN);
    if (headingMatch) {
      flushChapter();
      currentChapterTitle = headingMatch[1].trim();
      continue;
    }

    if (line.trim() === '') {
      flushParagraph();
      continue;
    }

    buffer.push(line);
  }

  // 最後の章をフラッシュ
  if (currentChapterTitle !== null) {
    flushParagraph();
    chapters.push({ title: currentChapterTitle, paragraphs: currentParagraphs });
  } else {
    // 見出しが一度もなかった場合
    flushParagraph();
    if (currentParagraphs.length > 0) {
      if (chapters.length === 0) {
        chapters.push({ title: fileTitle, paragraphs: currentParagraphs });
      } else {
        // 見出し登場前のフリー段落を最初の章の先頭に挿入（通常は発生しない）
        chapters[0] = {
          ...chapters[0],
          paragraphs: [...currentParagraphs, ...chapters[0].paragraphs],
        };
      }
    }
  }

  // 章が0個 → fileTitle の単一章を生成
  if (chapters.length === 0) {
    chapters.push({ title: fileTitle, paragraphs: [] });
  }

  return { title: fileTitle, chapters };
}

export function buildImportedDocument(
  result: TextImportResult,
  filePath: string,
): LiteLizardDocument {
  const now = new Date().toISOString();
  const documentId = createDocumentId();

  const lzlChapters: LiteLizardDocument['chapters'] = [];
  const lzlParagraphs: LiteLizardDocument['paragraphs'] = [];

  for (let chapterIndex = 0; chapterIndex < result.chapters.length; chapterIndex++) {
    const importChapter = result.chapters[chapterIndex];
    const chapterId = createChapterId();

    lzlChapters.push({
      id: chapterId,
      order: chapterIndex + 1,
      title: importChapter.title,
    });

    const paragraphTexts =
      importChapter.paragraphs.length > 0 ? importChapter.paragraphs : [''];

    for (let paragraphIndex = 0; paragraphIndex < paragraphTexts.length; paragraphIndex++) {
      const text = paragraphTexts[paragraphIndex];
      lzlParagraphs.push({
        id: createParagraphId(),
        chapterId,
        order: paragraphIndex + 1,
        light: {
          text,
          charCount: text.length,
        },
        lizard: {
          status: 'stale',
        },
      });
    }
  }

  return {
    version: 2,
    documentId,
    title: result.title,
    personaMode: 'general-reader',
    createdAt: now,
    updatedAt: now,
    source: {
      format: 'lzl-v1',
      originPath: filePath,
    },
    chapters: lzlChapters,
    paragraphs: lzlParagraphs,
  };
}
