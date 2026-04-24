import fs from 'node:fs/promises';
import path from 'node:path';
import { createChapterId, createDocumentId, createParagraphId, parseLzl, serializeLzl, validateAndRepairLzl, toLiteLizardDocument, type Chapter, type FileNode, type LiteLizardAnalysisFile, type LiteLizardDocument, type Paragraph } from '@litelizard/shared';
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
  let pendingChapterTitleIndex: number | null = null;
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

  const appendChapter = (title: string): number => {
    const trimmedTitle = title.trim();
    const nextTitle = trimmedTitle.length > 0 ? trimmedTitle : `章${chapters.length + 1}`;
    const nextId = pendingChapterId ?? createChapterId();

    // Replace temporary default chapter if no paragraph was added yet.
    if (chapters.length === 1 && chapters[0].id === defaultChapterId && paragraphs.length === 0) {
      chapters[0] = { id: nextId, order: 1, title: nextTitle };
      currentChapterId = nextId;
      pendingChapterId = null;
      return 0;
    }

    chapters.push({ id: nextId, order: chapters.length + 1, title: nextTitle });
    currentChapterId = nextId;
    pendingChapterId = null;
    return chapters.length - 1;
  };

  for (const line of lines) {
    if (pendingChapterTitleIndex !== null) {
      const headingMatch = line.match(/^\s*##\s+(.+)\s*$/);
      if (headingMatch) {
        const title = headingMatch[1]?.trim();
        if (title) {
          chapters[pendingChapterTitleIndex].title = title;
        }
        pendingChapterTitleIndex = null;
        continue;
      }

      if (line.trim().length === 0) {
        continue;
      }

      pendingChapterTitleIndex = null;
    }

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
      pendingChapterTitleIndex = appendChapter('');
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

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function findProjectRoot(filePath: string): Promise<string | null> {
  let current = path.dirname(filePath);
  const root = path.parse(current).root;
  while (current !== root) {
    if (await pathExists(path.join(current, '.litelizard', 'config.json'))) {
      return current;
    }
    current = path.dirname(current);
  }
  return null;
}

async function extractLzlDocumentMetadata(filePath: string): Promise<{ documentId: string; paragraphIds: string[] } | null> {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    const match = raw.match(/^documentId:\s*(\S+)/m);
    const documentId = match?.[1];
    if (!documentId) return null;
    const paragraphIds = [...raw.matchAll(/^<!--:: p (p_[a-z0-9]{10}) ::-->/gm)].map((entry) => entry[1]);
    return { documentId, paragraphIds };
  } catch {
    return null;
  }
}

async function loadAnalysisParagraphIds(projectRoot: string, documentId: string): Promise<Set<string>> {
  const analysisDir = path.join(projectRoot, '.litelizard', 'analysis');
  let entries: string[];
  try {
    entries = await fs.readdir(analysisDir);
  } catch {
    return new Set();
  }

  const pattern = new RegExp(`^${escapeRegExp(documentId)}_\\d{3}\\.json$`);
  const paragraphIds = new Set<string>();
  for (const entry of entries) {
    if (!pattern.test(entry)) continue;
    try {
      const raw = await fs.readFile(path.join(analysisDir, entry), 'utf8');
      const parsed = JSON.parse(raw) as { paragraphs?: unknown };
      if (!parsed.paragraphs || typeof parsed.paragraphs !== 'object' || Array.isArray(parsed.paragraphs)) {
        continue;
      }
      Object.keys(parsed.paragraphs).forEach((paragraphId) => paragraphIds.add(paragraphId));
    } catch {
      // Ignore malformed analysis generations when choosing an owner.
    }
  }
  return paragraphIds;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function writeDocumentFiles(markdownPath: string, rawDocument: LiteLizardDocument) {
  const document = ensureDocumentChapters(rawDocument);
  const markdown = markdownFromDocument(document);
  const analysis = analysisFromDocument(document);
  const analysisPath = toAnalysisPath(markdownPath);

  await fs.writeFile(markdownPath, markdown, 'utf8');
  await fs.writeFile(analysisPath, JSON.stringify(analysis, null, 2), 'utf8');
}

async function writeInitialDocument(filePath: string, rawDocument: LiteLizardDocument) {
  const document = ensureDocumentChapters(rawDocument);

  if (path.extname(filePath).toLowerCase() === '.lzl') {
    await fs.writeFile(filePath, serializeLzl(document), 'utf8');
    return;
  }

  await writeDocumentFiles(filePath, document);
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
      if (entry.name === '.litelizard') continue;
      const children = await walk(absolutePath);
      nodes.push({
        path: absolutePath,
        name: entry.name,
        type: 'directory',
        children,
      });
      continue;
    }

    if (entry.isFile() && /\.(md|lzl)$/i.test(entry.name)) {
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
  const documentOwnersByRoot = new Map<string, Map<string, string>>();
  const documentIdsByPathByRoot = new Map<string, Map<string, string>>();
  const seededRoots = new Set<string>();

  function getDocumentOwners(root: string): Map<string, string> {
    let owners = documentOwnersByRoot.get(root);
    if (!owners) {
      owners = new Map();
      documentOwnersByRoot.set(root, owners);
    }
    return owners;
  }

  function getDocumentIdsByPath(root: string): Map<string, string> {
    let idsByPath = documentIdsByPathByRoot.get(root);
    if (!idsByPath) {
      idsByPath = new Map();
      documentIdsByPathByRoot.set(root, idsByPath);
    }
    return idsByPath;
  }

  function registerDocumentOwner(root: string, filePath: string, documentId: string) {
    const normalizedPath = path.resolve(filePath);
    const owners = getDocumentOwners(root);
    const idsByPath = getDocumentIdsByPath(root);
    const previousDocumentId = idsByPath.get(normalizedPath);
    if (previousDocumentId && owners.get(previousDocumentId) === normalizedPath) {
      owners.delete(previousDocumentId);
    }

    idsByPath.set(normalizedPath, documentId);
    owners.set(documentId, normalizedPath);
  }

  async function collectLzlOwners(
    root: string,
    projectRoot: string,
    analysisParagraphIdsByDocumentId: Map<string, Set<string>>,
  ): Promise<Array<{ filePath: string; documentId: string; analysisMatchCount: number }>> {
    let entries: Dirent[];
    try {
      entries = (await fs.readdir(root, { withFileTypes: true })) as Dirent[];
    } catch {
      return [];
    }

    const owners: Array<{ filePath: string; documentId: string; analysisMatchCount: number }> = [];
    for (const entry of entries) {
      const absolutePath = path.join(root, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === '.litelizard') continue;
        const childOwners = await collectLzlOwners(absolutePath, projectRoot, analysisParagraphIdsByDocumentId);
        owners.push(...childOwners);
        continue;
      }

      if (!entry.isFile() || !/\.lzl$/i.test(entry.name)) continue;
      const metadata = await extractLzlDocumentMetadata(absolutePath);
      if (!metadata) continue;
      let analysisParagraphIds = analysisParagraphIdsByDocumentId.get(metadata.documentId);
      if (!analysisParagraphIds) {
        analysisParagraphIds = await loadAnalysisParagraphIds(projectRoot, metadata.documentId);
        analysisParagraphIdsByDocumentId.set(metadata.documentId, analysisParagraphIds);
      }
      const analysisMatchCount = metadata.paragraphIds.filter((paragraphId) => analysisParagraphIds.has(paragraphId)).length;
      owners.push({
        filePath: path.resolve(absolutePath),
        documentId: metadata.documentId,
        analysisMatchCount,
      });
    }
    return owners;
  }

  async function seedDocumentOwners(filePath: string) {
    const root = path.resolve(await findProjectRoot(filePath) ?? path.dirname(filePath));
    if (seededRoots.has(root)) return root;

    const owners = await collectLzlOwners(root, root, new Map());
    owners.sort((left, right) => {
      if (left.documentId !== right.documentId) {
        return left.documentId.localeCompare(right.documentId);
      }
      if (left.analysisMatchCount !== right.analysisMatchCount) {
        return right.analysisMatchCount - left.analysisMatchCount;
      }
      return left.filePath.localeCompare(right.filePath);
    });

    for (const owner of owners) {
      const rootOwners = getDocumentOwners(root);
      if (!rootOwners.has(owner.documentId)) {
        registerDocumentOwner(root, owner.filePath, owner.documentId);
      }
    }
    seededRoots.add(root);
    return root;
  }

  async function ensureUniqueLzlDocumentId(filePath: string, document: LiteLizardDocument): Promise<LiteLizardDocument> {
    const normalizedPath = path.resolve(filePath);
    const root = await seedDocumentOwners(normalizedPath);
    const rootOwners = getDocumentOwners(root);
    const ownerPath = rootOwners.get(document.documentId);
    if (!ownerPath || ownerPath === normalizedPath) {
      registerDocumentOwner(root, normalizedPath, document.documentId);
      return document;
    }

    if (!(await pathExists(ownerPath))) {
      registerDocumentOwner(root, normalizedPath, document.documentId);
      return document;
    }

    let nextDocumentId = createDocumentId();
    while (rootOwners.has(nextDocumentId)) {
      nextDocumentId = createDocumentId();
    }

    const repairedDocument = {
      ...document,
      documentId: nextDocumentId,
      updatedAt: new Date().toISOString(),
    };
    await fs.writeFile(normalizedPath, serializeLzl(repairedDocument), 'utf8');
    registerDocumentOwner(root, normalizedPath, repairedDocument.documentId);
    console.warn(
      `[fileService] duplicate documentId repaired: ${document.documentId} (${ownerPath}) -> ${repairedDocument.documentId} (${normalizedPath})`,
    );
    return repairedDocument;
  }

  async function loadMarkdown(filePath: string): Promise<LiteLizardDocument> {
    const markdownRaw = await fs.readFile(filePath, 'utf8');
    const parsedMarkdown = parseMarkdownStructure(markdownRaw);
    const analysis = await readAnalysisFile(filePath);
    const now = new Date().toISOString();

    const defaultChapterId = parsedMarkdown.chapters[0]?.id ?? createChapterId();
    const paragraphs = toParagraphs(parsedMarkdown.paragraphs, analysis, defaultChapterId);
    const chapters = (parsedMarkdown.chapters.length > 0
      ? parsedMarkdown.chapters
      : [{ id: defaultChapterId, order: 1, title: '章1' }]
    )
      .map((chapter, index) => ({
        ...chapter,
        title: chapter.title.trim() || `章${index + 1}`,
        order: index + 1,
      }));

    const chapterIdSet = new Set(chapters.map((chapter) => chapter.id));

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
  }

  async function loadLzl(filePath: string): Promise<LiteLizardDocument> {
    const content = await fs.readFile(filePath, 'utf8');
    const parsed = parseLzl(content);
    const { issues, document: repairedDoc } = validateAndRepairLzl(parsed);
    if (issues.length > 0) {
      console.warn('[fileService] lzl validation issues:', issues.map((i) => i.message));
    }
    const doc = toLiteLizardDocument(repairedDoc);
    const result: LiteLizardDocument = {
      ...doc,
      source: {
        format: 'lzl-v1',
        originPath: filePath,
      },
      paragraphs: doc.paragraphs.map((paragraph, index) => ({
        ...paragraph,
        order: index + 1,
      })),
    };
    const uniqueResult = await ensureUniqueLzlDocumentId(filePath, result);
    if (!revisionMap.has(filePath)) {
      revisionMap.set(filePath, 0);
    }
    return uniqueResult;
  }

  return {
    async listTree(root: string) {
      return walk(root, true);
    },

    async load(filePath: string): Promise<LiteLizardDocument> {
      const ext = path.extname(filePath).toLowerCase();
      if (ext === '.lzl') {
        return loadLzl(filePath);
      }
      if (ext === '.md') {
        return loadMarkdown(filePath);
      }
      throw new Error(`UNSUPPORTED_FORMAT: ${ext}`);
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

      if (path.extname(filePath).toLowerCase() === '.lzl') {
        const content = serializeLzl(normalized);
        const tmpPath = `${filePath}.tmp`;
        await fs.writeFile(tmpPath, content, 'utf8');
        await fs.rename(tmpPath, filePath);
        const root = await seedDocumentOwners(filePath);
        registerDocumentOwner(root, filePath, normalized.documentId);
      } else {
        await writeDocumentFiles(filePath, normalized);
      }

      const next = current + 1;
      revisionMap.set(filePath, next);

      return {
        ok: true,
        revision: next,
      };
    },

    async createDocument(filePath: string, document: LiteLizardDocument) {
      await writeInitialDocument(filePath, document);
      if (path.extname(filePath).toLowerCase() === '.lzl') {
        const root = await seedDocumentOwners(filePath);
        registerDocumentOwner(root, filePath, document.documentId);
      }
      revisionMap.set(filePath, 0);
    },

    toAnalysisPath,
    readSidecarAnalysis: readAnalysisFile,
  };
}
