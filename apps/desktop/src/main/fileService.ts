import fs from 'node:fs/promises';
import path from 'node:path';
import type { Chapter, FileNode, LiteLizardAnalysisFile, LiteLizardDocument, Paragraph } from '@litelizard/shared';
import type { Dirent } from 'node:fs';

interface ParsedParagraph {
  id?: string;
  chapterId: string;
  text: string;
}

interface ParsedMarkdown {
  chapters: Chapter[];
  paragraphs: ParsedParagraph[];
}

function createDocumentId() {
  return `doc_${Math.random().toString(36).slice(2, 12)}`;
}

function createParagraphId() {
  return `p_${Math.random().toString(36).slice(2, 12)}`;
}

function createChapterId() {
  return `c_${Math.random().toString(36).slice(2, 12)}`;
}

function toAnalysisPath(markdownPath: string) {
  if (/\.md$/i.test(markdownPath)) {
    return `${markdownPath.slice(0, -3)}.litelizard.analysis.json`;
  }
  return `${markdownPath}.litelizard.analysis.json`;
}

function toDocumentTitle(filePath: string) {
  return path.basename(filePath, path.extname(filePath));
}

function paragraphMarker(id: string) {
  return `<!-- ll:id=${id} -->`;
}

function chapterMarker(id: string) {
  return `<!-- ll:chapter=${id} -->`;
}

function parseParagraphMarker(line: string) {
  const match = line.match(/^\s*<!--\s*ll:id=(p_[A-Za-z0-9_-]+)\s*-->\s*$/);
  return match?.[1] ?? null;
}

function parseChapterMarker(line: string) {
  const match = line.match(/^\s*<!--\s*ll:chapter=(c_[A-Za-z0-9_-]+)\s*-->\s*$/);
  return match?.[1] ?? null;
}

function parseMarkdownStructure(markdown: string): ParsedMarkdown {
  const normalized = markdown.replace(/\r\n/g, '\n');
  const lines = normalized.split('\n');

  const defaultChapterId = createChapterId();
  const chapters: Chapter[] = [{ id: defaultChapterId, order: 1, title: '章1' }];
  const paragraphs: ParsedParagraph[] = [];

  let currentChapterId = defaultChapterId;
  let pendingChapterId: string | null = null;
  let currentParagraphId: string | undefined;
  let buffer: string[] = [];

  const flushParagraph = () => {
    if (buffer.length === 0) {
      return;
    }

    const text = buffer.join('\n').trimEnd();
    if (text.trim().length > 0) {
      paragraphs.push({
        id: currentParagraphId,
        chapterId: currentChapterId,
        text,
      });
    }

    currentParagraphId = undefined;
    buffer = [];
  };

  const appendChapter = (title: string) => {
    const trimmedTitle = title.trim();
    const nextTitle = trimmedTitle.length > 0 ? trimmedTitle : `章${chapters.length + 1}`;
    const nextId = pendingChapterId ?? createChapterId();

    // Replace temporary default chapter if no paragraph was added yet.
    if (chapters.length === 1 && chapters[0].id === defaultChapterId && paragraphs.length === 0) {
      chapters[0] = { id: nextId, order: 1, title: nextTitle };
      currentChapterId = nextId;
      pendingChapterId = null;
      return;
    }

    chapters.push({ id: nextId, order: chapters.length + 1, title: nextTitle });
    currentChapterId = nextId;
    pendingChapterId = null;
  };

  for (const line of lines) {
    const paragraphId = parseParagraphMarker(line);
    if (paragraphId) {
      flushParagraph();
      currentParagraphId = paragraphId;
      continue;
    }

    const chapterId = parseChapterMarker(line);
    if (chapterId) {
      flushParagraph();
      pendingChapterId = chapterId;
      continue;
    }

    const headingMatch = line.match(/^\s*##\s+(.+)\s*$/);
    if (headingMatch) {
      flushParagraph();
      appendChapter(headingMatch[1] ?? '');
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
    chapters: chapters.map((chapter, index) => ({ ...chapter, order: index + 1 })),
    paragraphs,
  };
}

function toParagraphs(
  parsed: ParsedParagraph[],
  analysis: LiteLizardAnalysisFile | null,
  defaultChapterId: string,
): Paragraph[] {
  const byId = new Map<string, LiteLizardAnalysisFile['paragraphs'][number]>();
  const byOrder = new Map<number, LiteLizardAnalysisFile['paragraphs'][number]>();
  const usedIds = new Set<string>();

  for (const entry of analysis?.paragraphs ?? []) {
    byId.set(entry.paragraphId, entry);
    byOrder.set(entry.order, entry);
  }

  const paragraphs = parsed.map((chunk, index) => {
    const order = index + 1;
    let id = chunk.id;

    if (!id && byOrder.has(order)) {
      const ordered = byOrder.get(order);
      if (ordered && !usedIds.has(ordered.paragraphId)) {
        id = ordered.paragraphId;
      }
    }

    if (!id) {
      id = createParagraphId();
    }

    usedIds.add(id);
    const analyzed = byId.get(id);

    return {
      id,
      chapterId: chunk.chapterId,
      order,
      light: {
        text: chunk.text,
        charCount: chunk.text.length,
      },
      lizard: analyzed?.lizard ?? { status: 'stale' },
    };
  });

  if (paragraphs.length > 0) {
    return paragraphs;
  }

  const emptyText = ' ';
  return [
    {
      id: createParagraphId(),
      chapterId: defaultChapterId,
      order: 1,
      light: {
        text: emptyText,
        charCount: emptyText.length,
      },
      lizard: { status: 'stale' },
    },
  ];
}

function ensureDocumentChapters(document: LiteLizardDocument): LiteLizardDocument {
  const currentChapters = document.chapters ?? [];
  if (currentChapters.length > 0 && document.paragraphs.every((paragraph) => Boolean(paragraph.chapterId))) {
    const chapterIdSet = new Set(currentChapters.map((chapter) => chapter.id));
    const fallbackChapterId = currentChapters[0].id;
    return {
      ...document,
      version: 2,
      chapters: currentChapters.map((chapter, index) => ({ ...chapter, order: index + 1 })),
      paragraphs: document.paragraphs.map((paragraph, index) => ({
        ...paragraph,
        chapterId: chapterIdSet.has(paragraph.chapterId) ? paragraph.chapterId : fallbackChapterId,
        order: index + 1,
      })),
    };
  }

  const chapterId = createChapterId();
  return {
    ...document,
    version: 2,
    chapters: [
      {
        id: chapterId,
        order: 1,
        title: '章1',
      },
    ],
    paragraphs: document.paragraphs.map((paragraph, index) => ({
      ...paragraph,
      chapterId,
      order: index + 1,
    })),
  };
}

function markdownFromDocument(rawDocument: LiteLizardDocument) {
  const document = ensureDocumentChapters(rawDocument);
  if (document.paragraphs.length === 0) {
    return '';
  }

  const paragraphsByChapterId = new Map<string, Paragraph[]>();
  document.paragraphs.forEach((paragraph) => {
    const list = paragraphsByChapterId.get(paragraph.chapterId) ?? [];
    list.push(paragraph);
    paragraphsByChapterId.set(paragraph.chapterId, list);
  });

  const chapterBlocks = document.chapters
    .slice()
    .sort((left, right) => left.order - right.order)
    .map((chapter) => {
      const chapterParagraphs = (paragraphsByChapterId.get(chapter.id) ?? []).slice().sort((left, right) => left.order - right.order);
      const paragraphBlocks = chapterParagraphs.map((paragraph) => {
        const text = paragraph.light.text.trimEnd();
        const safeText = text.length > 0 ? text : ' ';
        return `${paragraphMarker(paragraph.id)}\n${safeText}`;
      });

      const chapterHeader = `${chapterMarker(chapter.id)}\n## ${chapter.title}`;
      return paragraphBlocks.length > 0 ? `${chapterHeader}\n\n${paragraphBlocks.join('\n\n')}` : chapterHeader;
    });

  return chapterBlocks.join('\n\n');
}

function analysisFromDocument(rawDocument: LiteLizardDocument): LiteLizardAnalysisFile {
  const document = ensureDocumentChapters(rawDocument);
  return {
    version: 1,
    documentId: document.documentId,
    title: document.title,
    personaMode: document.personaMode,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
    paragraphs: document.paragraphs.map((paragraph) => ({
      paragraphId: paragraph.id,
      order: paragraph.order,
      lizard: paragraph.lizard,
    })),
  };
}

async function readAnalysisFile(markdownPath: string): Promise<LiteLizardAnalysisFile | null> {
  const analysisPath = toAnalysisPath(markdownPath);

  try {
    const raw = await fs.readFile(analysisPath, 'utf8');
    const parsed = JSON.parse(raw) as LiteLizardAnalysisFile;

    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.paragraphs)) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

async function writeDocumentFiles(markdownPath: string, rawDocument: LiteLizardDocument) {
  const document = ensureDocumentChapters(rawDocument);
  const markdown = markdownFromDocument(document);
  const analysis = analysisFromDocument(document);
  const analysisPath = toAnalysisPath(markdownPath);

  await fs.writeFile(markdownPath, markdown, 'utf8');
  await fs.writeFile(analysisPath, JSON.stringify(analysis, null, 2), 'utf8');
}

async function walk(root: string, isRoot = false): Promise<FileNode[]> {
  let entries: Dirent[];
  try {
    entries = (await fs.readdir(root, { withFileTypes: true })) as Dirent[];
  } catch (error) {
    if (isRoot) {
      throw error;
    }
    return [];
  }

  const nodes: FileNode[] = [];

  for (const entry of entries) {
    const absolutePath = path.join(root, entry.name);

    if (entry.isDirectory()) {
      const children = await walk(absolutePath);
      nodes.push({
        path: absolutePath,
        name: entry.name,
        type: 'directory',
        children,
      });
      continue;
    }

    if (entry.isFile() && /\.md$/i.test(entry.name)) {
      nodes.push({
        path: absolutePath,
        name: entry.name,
        type: 'file',
      });
    }
  }

  return nodes.sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === 'directory' ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });
}

export function createFileService() {
  const revisionMap = new Map<string, number>();

  return {
    async listTree(root: string) {
      return walk(root, true);
    },

    async load(filePath: string): Promise<LiteLizardDocument> {
      const markdownRaw = await fs.readFile(filePath, 'utf8');
      const parsedMarkdown = parseMarkdownStructure(markdownRaw);
      const analysis = await readAnalysisFile(filePath);
      const now = new Date().toISOString();

      const defaultChapterId = parsedMarkdown.chapters[0]?.id ?? createChapterId();
      const paragraphs = toParagraphs(parsedMarkdown.paragraphs, analysis, defaultChapterId);
      const chapterIdSet = new Set(paragraphs.map((paragraph) => paragraph.chapterId));

      const chapters = (parsedMarkdown.chapters.length > 0
        ? parsedMarkdown.chapters
        : [{ id: defaultChapterId, order: 1, title: '章1' }]
      )
        .filter((chapter) => chapterIdSet.has(chapter.id))
        .map((chapter, index) => ({
          ...chapter,
          title: chapter.title.trim() || `章${index + 1}`,
          order: index + 1,
        }));

      const fallbackChapterId = chapters[0]?.id ?? defaultChapterId;

      const document: LiteLizardDocument = {
        version: 2,
        documentId: analysis?.documentId ?? createDocumentId(),
        title: analysis?.title ?? toDocumentTitle(filePath),
        personaMode: analysis?.personaMode ?? 'general-reader',
        createdAt: analysis?.createdAt ?? now,
        updatedAt: analysis?.updatedAt ?? now,
        source: {
          format: 'markdown-md',
          originPath: filePath,
        },
        chapters: chapters.length > 0 ? chapters : [{ id: fallbackChapterId, order: 1, title: '章1' }],
        paragraphs: paragraphs.map((paragraph, index) => ({
          ...paragraph,
          chapterId: chapterIdSet.has(paragraph.chapterId) ? paragraph.chapterId : fallbackChapterId,
          order: index + 1,
        })),
      };

      if (!revisionMap.has(filePath)) {
        revisionMap.set(filePath, 0);
      }

      return document;
    },

    async save(filePath: string, document: LiteLizardDocument, expectedRevision: number) {
      const current = revisionMap.get(filePath) ?? 0;
      if (current !== expectedRevision) {
        return {
          ok: false,
          code: 'REVISION_MISMATCH' as const,
          revision: current,
        };
      }

      const normalized = ensureDocumentChapters(document);
      await writeDocumentFiles(filePath, normalized);
      const next = current + 1;
      revisionMap.set(filePath, next);

      return {
        ok: true,
        revision: next,
      };
    },

    async createDocument(filePath: string, document: LiteLizardDocument) {
      const normalized = ensureDocumentChapters(document);
      await writeDocumentFiles(filePath, normalized);
      revisionMap.set(filePath, 0);
    },

    toAnalysisPath,
  };
}
