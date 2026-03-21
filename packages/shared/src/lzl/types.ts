export interface LzlFrontmatter {
  documentId: string;
  format: string;
  title: string;
  chapters: number;
  paragraphs: number;
  created: string;
  updated: string;
}

export interface LzlParsedChapter {
  id: string;
  title: string;
}

export interface LzlParsedParagraph {
  id: string;
  chapterId: string;
  chapterIndex: number;
  text: string;
}

export interface ParsedLzlDocument {
  frontmatter: LzlFrontmatter;
  chapters: LzlParsedChapter[];
  paragraphs: LzlParsedParagraph[];
}

export interface LzlValidationIssue {
  code:
    | 'FRONTMATTER_MISSING'
    | 'CHAPTER_COUNT_MISMATCH'
    | 'PARAGRAPH_COUNT_MISMATCH'
    | 'NO_CHAPTER_MARKER'
    | 'UNMARKED_TEXT'
    | 'DUPLICATE_ID'
    | 'EMPTY_CHAPTER';
  message: string;
  autoRepaired: boolean;
}

export interface LzlValidationResult {
  issues: LzlValidationIssue[];
  document: ParsedLzlDocument;
}
