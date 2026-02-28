export interface UiChapter {
  id: string;
  number: number;
  title: string;
}

export interface UiParagraph {
  id: string;
  chapterId: string;
  order: number;
  text: string;
}

export interface ChapterStructureInput {
  id?: string;
  title: string;
}

export interface ParagraphStructureInput {
  id?: string;
  chapterId?: string;
  text: string;
}

export interface DocumentStructureInput {
  chapters: ChapterStructureInput[];
  paragraphs: ParagraphStructureInput[];
}
