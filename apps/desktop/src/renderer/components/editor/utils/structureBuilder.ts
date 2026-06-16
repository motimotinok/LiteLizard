import type { LiteLizardDocument } from '@litelizard/shared';
import type { ParagraphStructureInput } from '../../../types/documentStructure.js';
import { createChapterId, createParagraphId } from './ids.js';

export interface StructureSnapshot {
  chapters: Array<{ nodeKey: string; title: string }>;
  paragraphs: Array<{ nodeKey: string; chapterNodeKey: string | null; text: string }>;
}

export interface ParagraphGutterMeta {
  paragraphIndex: number;
  chapterIndex: number;
  chapterPosition: 'single' | 'start' | 'middle' | 'end';
}

export interface TopLevelParagraphSnapshot {
  nodeKey: string;
  text: string;
}

export function deriveStructureSnapshotFromTopLevelParagraphs({
  topLevelParagraphs,
  existingChapterNodeKeys,
  fallbackChapterNodeIndexes,
}: {
  topLevelParagraphs: TopLevelParagraphSnapshot[];
  existingChapterNodeKeys: ReadonlySet<string>;
  fallbackChapterNodeIndexes: number[];
}): {
  snapshot: StructureSnapshot;
  emptyParagraphNodeKeys: Set<string>;
  chapterNodeKeySet: Set<string>;
} {
  const chapterNodeKeySet = new Set<string>();

  topLevelParagraphs.forEach((node) => {
    if (existingChapterNodeKeys.has(node.nodeKey)) {
      chapterNodeKeySet.add(node.nodeKey);
    }
  });

  // On editor remount (e.g. macro -> micro), node keys are regenerated.
  // Recover chapter nodes by deterministic top-level positions from the current document snapshot.
  if (chapterNodeKeySet.size === 0 && topLevelParagraphs.length > 0) {
    fallbackChapterNodeIndexes.forEach((index) => {
      const node = topLevelParagraphs[index];
      if (node) {
        chapterNodeKeySet.add(node.nodeKey);
      }
    });

    if (chapterNodeKeySet.size === 0) {
      chapterNodeKeySet.add(topLevelParagraphs[0].nodeKey);
    }
  }

  const chapters: StructureSnapshot['chapters'] = [];
  const paragraphs: StructureSnapshot['paragraphs'] = [];
  const emptyParagraphNodeKeys = new Set<string>();

  let currentChapterNodeKey: string | null = null;

  topLevelParagraphs.forEach((node) => {
    const isChapter = chapterNodeKeySet.has(node.nodeKey) || currentChapterNodeKey === null;
    if (isChapter) {
      chapterNodeKeySet.add(node.nodeKey);
      currentChapterNodeKey = node.nodeKey;
      chapters.push({
        nodeKey: node.nodeKey,
        title: node.text.trim() || `章${chapters.length + 1}`,
      });
      return;
    }

    if (node.text.trim().length === 0) {
      emptyParagraphNodeKeys.add(node.nodeKey);
    }

    paragraphs.push({
      nodeKey: node.nodeKey,
      chapterNodeKey: currentChapterNodeKey,
      text: node.text,
    });
  });

  return {
    snapshot: { chapters, paragraphs },
    emptyParagraphNodeKeys,
    chapterNodeKeySet,
  };
}

export function toStructureSignature(snapshot: StructureSnapshot): string {
  return JSON.stringify({
    chapters: snapshot.chapters.map((chapter) => chapter.title),
    paragraphs: snapshot.paragraphs.map((paragraph) => [paragraph.chapterNodeKey, paragraph.text]),
  });
}

export function buildParagraphGutterMeta(structureSnapshot: StructureSnapshot): ParagraphGutterMeta[] {
  const chapterIndexByNodeKey = new Map(
    structureSnapshot.chapters.map((chapter, index) => [chapter.nodeKey, index + 1]),
  );
  const paragraphCountByChapterNodeKey = new Map<string, number>();
  structureSnapshot.paragraphs.forEach((paragraph) => {
    if (!paragraph.chapterNodeKey) return;
    paragraphCountByChapterNodeKey.set(
      paragraph.chapterNodeKey,
      (paragraphCountByChapterNodeKey.get(paragraph.chapterNodeKey) ?? 0) + 1,
    );
  });

  const seenParagraphCountByChapterNodeKey = new Map<string, number>();
  return structureSnapshot.paragraphs.map((paragraph, index) => {
    const chapterNodeKey = paragraph.chapterNodeKey;
    const chapterIndex = chapterNodeKey ? (chapterIndexByNodeKey.get(chapterNodeKey) ?? 1) : 1;
    const countInChapter = chapterNodeKey ? (paragraphCountByChapterNodeKey.get(chapterNodeKey) ?? 1) : 1;
    const positionInChapter = chapterNodeKey
      ? (seenParagraphCountByChapterNodeKey.get(chapterNodeKey) ?? 0) + 1
      : 1;
    if (chapterNodeKey) {
      seenParagraphCountByChapterNodeKey.set(chapterNodeKey, positionInChapter);
    }

    return {
      paragraphIndex: index + 1,
      chapterIndex,
      chapterPosition:
        countInChapter === 1
          ? 'single'
          : positionInChapter === 1
            ? 'start'
            : positionInChapter === countInChapter
              ? 'end'
              : 'middle',
    };
  });
}

export function shouldSyncStructure(
  nextSignature: string,
  lastSyncedSignature: string,
  initialBaselineCaptured: boolean,
): { shouldSync: boolean; nextBaselineCaptured: boolean } {
  if (!initialBaselineCaptured) {
    return {
      shouldSync: false,
      nextBaselineCaptured: true,
    };
  }

  return {
    shouldSync: nextSignature !== lastSyncedSignature,
    nextBaselineCaptured: true,
  };
}

export function buildChapterInputs(
  snapshotChapters: StructureSnapshot['chapters'],
  chapterIdByNodeKey: ReadonlyMap<string, string>,
): Array<{ id: string; title: string }> {
  const nextMap = new Map(chapterIdByNodeKey);
  const usedIds = new Set<string>(chapterIdByNodeKey.values());

  return snapshotChapters.map((chapter, index) => {
    let chapterId = nextMap.get(chapter.nodeKey);
    if (!chapterId) {
      do {
        chapterId = createChapterId();
      } while (usedIds.has(chapterId));
    }

    usedIds.add(chapterId);
    nextMap.set(chapter.nodeKey, chapterId);

    return {
      id: chapterId,
      title: chapter.title.trim() || `章${index + 1}`,
    };
  });
}

export function buildParagraphInputs(
  snapshotParagraphs: StructureSnapshot['paragraphs'],
  paragraphIdByNodeKey: ReadonlyMap<string, string>,
  chapterIdByNodeKey: ReadonlyMap<string, string>,
  fallbackChapterId: string | undefined,
): Array<ParagraphStructureInput & { id: string }> {
  const nextMap = new Map(paragraphIdByNodeKey);
  const usedIds = new Set<string>(paragraphIdByNodeKey.values());

  return snapshotParagraphs.map((paragraph) => {
    let paragraphId = nextMap.get(paragraph.nodeKey);
    if (!paragraphId) {
      do {
        paragraphId = createParagraphId();
      } while (usedIds.has(paragraphId));
    }

    usedIds.add(paragraphId);
    nextMap.set(paragraph.nodeKey, paragraphId);

    return {
      id: paragraphId,
      chapterId: paragraph.chapterNodeKey
        ? (chapterIdByNodeKey.get(paragraph.chapterNodeKey) ?? fallbackChapterId)
        : fallbackChapterId,
      text: paragraph.text.length > 0 ? paragraph.text : ' ',
    };
  });
}

export function buildFallbackChapterNodeIndexes(document: LiteLizardDocument): number[] {
  const countsByChapterId = new Map<string, number>();
  document.paragraphs.forEach((paragraph) => {
    countsByChapterId.set(paragraph.chapterId, (countsByChapterId.get(paragraph.chapterId) ?? 0) + 1);
  });

  const indexes: number[] = [];
  let cursor = 0;
  document.chapters
    .slice()
    .sort((left, right) => left.order - right.order)
    .forEach((chapter) => {
      indexes.push(cursor);
      const paragraphCount = Math.max(1, countsByChapterId.get(chapter.id) ?? 0);
      cursor += 1 + paragraphCount;
    });

  return indexes;
}

export function buildMacroSummary(document: LiteLizardDocument) {
  const grouped = new Map<string, typeof document.paragraphs>();

  document.paragraphs
    .slice()
    .sort((left, right) => left.order - right.order)
    .forEach((paragraph) => {
      const list = grouped.get(paragraph.chapterId) ?? [];
      list.push(paragraph);
      grouped.set(paragraph.chapterId, list);
    });

  return document.chapters
    .slice()
    .sort((left, right) => left.order - right.order)
    .map((chapter) => {
      const paragraphs = grouped.get(chapter.id) ?? [];
      const preview = paragraphs[0]?.light.text.trim() ?? '';
      return {
        id: chapter.id,
        title: chapter.title,
        paragraphCount: paragraphs.length,
        preview: preview.length > 90 ? `${preview.slice(0, 90)}…` : preview || '（空の章）',
      };
    });
}
