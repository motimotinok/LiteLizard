import type { ParsedLzlDocument } from './types.js';

const CHAPTER_MARKER = /^<!--::\s*ch\s+([^\s|]+)\s*\|\s*(.+?)\s*::-->$/;
const PARAGRAPH_MARKER = /^<!--::\s*p\s+(\S+)\s*::-->$/;

function emptyFrontmatter(): ParsedLzlDocument['frontmatter'] {
  return {
    documentId: '',
    format: '',
    title: '',
    chapters: 0,
    paragraphs: 0,
    created: '',
    updated: '',
  };
}

function parseFrontmatterBlock(raw: string): ParsedLzlDocument['frontmatter'] {
  const frontmatter = emptyFrontmatter();

  for (const line of raw.split('\n')) {
    const match = line.match(/^(\w+):\s*(.+)$/);
    if (!match) {
      continue;
    }

    const [, key, rawValue] = match;
    const value = rawValue.trim();

    switch (key) {
      case 'documentId':
        frontmatter.documentId = value;
        break;
      case 'format':
        frontmatter.format = value;
        break;
      case 'title':
        frontmatter.title = value;
        break;
      case 'chapters':
        frontmatter.chapters = Number.parseInt(value, 10) || 0;
        break;
      case 'paragraphs':
        frontmatter.paragraphs = Number.parseInt(value, 10) || 0;
        break;
      case 'created':
        frontmatter.created = value;
        break;
      case 'updated':
        frontmatter.updated = value;
        break;
      default:
        break;
    }
  }

  return frontmatter;
}

export function parseLzl(content: string): ParsedLzlDocument {
  const normalized = content.replace(/\r\n/g, '\n');
  const frontmatterMatch = normalized.match(/^---\n([\s\S]*?)\n---\n?/);
  const frontmatter = frontmatterMatch ? parseFrontmatterBlock(frontmatterMatch[1]) : emptyFrontmatter();
  const body = frontmatterMatch ? normalized.slice(frontmatterMatch[0].length) : normalized;
  const lines = body.split('\n');
  const chapters: ParsedLzlDocument['chapters'] = [];
  const paragraphs: ParsedLzlDocument['paragraphs'] = [];

  let currentChapterId = '';
  let currentChapterIndex = -1;
  let currentParagraphId = '';
  let buffer: string[] = [];

  const flushParagraph = () => {
    if (buffer.length === 0 && currentParagraphId.length === 0) {
      return;
    }

    paragraphs.push({
      id: currentParagraphId,
      chapterId: currentChapterId,
      chapterIndex: currentChapterIndex,
      text: buffer.join('\n').trimEnd(),
    });

    currentParagraphId = '';
    buffer = [];
  };

  for (const line of lines) {
    const chapterMatch = line.match(CHAPTER_MARKER);
    if (chapterMatch) {
      flushParagraph();
      currentChapterId = chapterMatch[1];
      currentChapterIndex = chapters.length;
      chapters.push({
        id: chapterMatch[1],
        title: chapterMatch[2].trim(),
      });
      continue;
    }

    const paragraphMatch = line.match(PARAGRAPH_MARKER);
    if (paragraphMatch) {
      flushParagraph();
      currentParagraphId = paragraphMatch[1];
      continue;
    }

    if (line.trim().length === 0) {
      flushParagraph();
      continue;
    }

    buffer.push(line);
  }

  flushParagraph();

  return {
    frontmatter,
    chapters,
    paragraphs,
  };
}
