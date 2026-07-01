import type { LiteLizardDocument, Paragraph } from '@litelizard/shared';

export interface ChapterAnalysisCounts {
  total: number;
  complete: number;
  pending: number;
  failed: number;
  staleWithPrevious: number;
  notAnalyzed: number;
}

export interface ChapterTopTagEntry {
  value: string;
  count: number;
}

export interface ChapterAnalysisSummary {
  chapterId: string;
  title: string;
  order: number;
  counts: ChapterAnalysisCounts;
  topTags: ChapterTopTagEntry[];
}

export interface AggregateChapterAnalysesOptions {
  topTagLimit?: number;
}

const DEFAULT_TOP_TAG_LIMIT = 5;

function emptyCounts(): ChapterAnalysisCounts {
  return {
    total: 0,
    complete: 0,
    pending: 0,
    failed: 0,
    staleWithPrevious: 0,
    notAnalyzed: 0,
  };
}

function classifyParagraph(paragraph: Paragraph, counts: ChapterAnalysisCounts): void {
  counts.total += 1;
  const status = paragraph.lizard.status;
  if (status === 'complete') {
    counts.complete += 1;
    return;
  }
  if (status === 'pending') {
    counts.pending += 1;
    return;
  }
  if (status === 'failed') {
    counts.failed += 1;
    return;
  }
  if (paragraph.lizard.analyzedAt) {
    counts.staleWithPrevious += 1;
  } else {
    counts.notAnalyzed += 1;
  }
}

function increment(map: Map<string, number>, value: string): void {
  const trimmed = value.trim();
  if (!trimmed) {
    return;
  }
  map.set(trimmed, (map.get(trimmed) ?? 0) + 1);
}

function toTopEntries(map: Map<string, number>, limit: number): ChapterTopTagEntry[] {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, Math.max(0, limit))
    .map(([value, count]) => ({ value, count }));
}

export function aggregateChapterAnalyses(
  document: LiteLizardDocument | null,
  options: AggregateChapterAnalysesOptions = {},
): ChapterAnalysisSummary[] {
  if (!document) {
    return [];
  }

  const limit = options.topTagLimit ?? DEFAULT_TOP_TAG_LIMIT;
  const sortedChapters = [...document.chapters].sort((a, b) => a.order - b.order);
  const groupedByChapterId = new Map<string, Paragraph[]>();
  for (const chapter of sortedChapters) {
    groupedByChapterId.set(chapter.id, []);
  }
  for (const paragraph of document.paragraphs) {
    const list = groupedByChapterId.get(paragraph.chapterId);
    if (list) {
      list.push(paragraph);
    }
  }

  return sortedChapters.map((chapter) => {
    const paragraphs = groupedByChapterId.get(chapter.id) ?? [];
    const counts = emptyCounts();
    const tagCounts = new Map<string, number>();

    for (const paragraph of paragraphs) {
      classifyParagraph(paragraph, counts);

      if (paragraph.lizard.status !== 'complete') {
        continue;
      }

      const tagValues = paragraph.lizard.tags
        ? Object.values(paragraph.lizard.tags).flatMap((values) => values)
        : [
            ...(paragraph.lizard.theme ?? []),
            ...(paragraph.lizard.emotion ?? []),
          ];
      for (const value of tagValues) {
        increment(tagCounts, value);
      }
    }

    return {
      chapterId: chapter.id,
      title: chapter.title,
      order: chapter.order,
      counts,
      topTags: toTopEntries(tagCounts, limit),
    };
  });
}
