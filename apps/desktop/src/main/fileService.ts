import fs from 'node:fs/promises';
import path from 'node:path';
import type { FileNode, LiteLizardAnalysisFile, LiteLizardDocument, Paragraph } from '@litelizard/shared';
import type { Dirent } from 'node:fs';

interface ParsedParagraph {
  id?: string;
  text: string;
}

function createDocumentId() {
  return `doc_${Math.random().toString(36).slice(2, 12)}`;
}

function createParagraphId() {
  return `p_${Math.random().toString(36).slice(2, 12)}`;
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

function parseParagraphMarker(line: string) {
  const match = line.match(/^\s*<!--\s*ll:id=(p_[A-Za-z0-9_-]+)\s*-->\s*$/);
  return match?.[1] ?? null;
}

function parseMarkdownParagraphs(markdown: string): ParsedParagraph[] {
  const normalized = markdown.replace(/\r\n/g, '\n');
  const lines = normalized.split('\n');
  const parsed: ParsedParagraph[] = [];

  let currentId: string | undefined;
  let buffer: string[] = [];

  const flush = () => {
    if (buffer.length === 0) {
      return;
    }

    const text = buffer.join('\n').trimEnd();
    if (text.trim().length > 0) {
      parsed.push({ id: currentId, text });
    }

    currentId = undefined;
    buffer = [];
  };

  for (const line of lines) {
    const markerId = parseParagraphMarker(line);
    if (markerId) {
      flush();
      currentId = markerId;
      continue;
    }

    if (line.trim().length === 0) {
      flush();
      continue;
    }

    buffer.push(line);
  }

  flush();

  return parsed;
}

function markdownFromDocument(document: LiteLizardDocument) {
  if (document.paragraphs.length === 0) {
    return '';
  }

  return document.paragraphs
    .map((paragraph) => {
      const text = paragraph.light.text.trimEnd();
      const safeText = text.length > 0 ? text : ' ';
      return `${paragraphMarker(paragraph.id)}\n${safeText}`;
    })
    .join('\n\n');
}

function analysisFromDocument(document: LiteLizardDocument): LiteLizardAnalysisFile {
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

function toParagraphs(parsed: ParsedParagraph[], analysis: LiteLizardAnalysisFile | null): Paragraph[] {
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
      order: 1,
      light: {
        text: emptyText,
        charCount: emptyText.length,
      },
      lizard: { status: 'stale' },
    },
  ];
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

async function writeDocumentFiles(markdownPath: string, document: LiteLizardDocument) {
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
      const parsedParagraphs = parseMarkdownParagraphs(markdownRaw);
      const analysis = await readAnalysisFile(filePath);
      const now = new Date().toISOString();

      const document: LiteLizardDocument = {
        version: 1,
        documentId: analysis?.documentId ?? createDocumentId(),
        title: analysis?.title ?? toDocumentTitle(filePath),
        personaMode: analysis?.personaMode ?? 'general-reader',
        createdAt: analysis?.createdAt ?? now,
        updatedAt: analysis?.updatedAt ?? now,
        source: {
          format: 'markdown-md',
          originPath: filePath,
        },
        paragraphs: toParagraphs(parsedParagraphs, analysis),
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

      await writeDocumentFiles(filePath, document);
      const next = current + 1;
      revisionMap.set(filePath, next);

      return {
        ok: true,
        revision: next,
      };
    },

    async createDocument(filePath: string, document: LiteLizardDocument) {
      await writeDocumentFiles(filePath, document);
      revisionMap.set(filePath, 0);
    },

    toAnalysisPath,
  };
}
