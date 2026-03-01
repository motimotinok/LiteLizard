import type { LiteLizardDocument } from '@litelizard/shared';
import type { ParagraphStructureInput } from '../../../types/documentStructure.js';
import { createChapterId, createParagraphId } from './ids.js';

export interface StructureSnapshot {
  chapters: Array<{ nodeKey: string; title: string }>;
  paragraphs: Array<{ nodeKey: string; chapterNodeKey: string | null; text: string }>;
}

export function toStructureSignature(snapshot: StructureSnapshot): string {
  return JSON.stringify({
    chapters: snapshot.chapters.map((chapter) => chapter.title),
    paragraphs: snapshot.paragraphs.map((paragraph) => [paragraph.chapterNodeKey, paragraph.text]),
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
