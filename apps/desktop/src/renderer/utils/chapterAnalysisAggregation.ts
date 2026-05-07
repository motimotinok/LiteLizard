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
  topThemes: ChapterTopTagEntry[];
  topEmotions: ChapterTopTagEntry[];
  averageConfidence: number | null;
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
    const themeCounts = new Map<string, number>();
    const emotionCounts = new Map<string, number>();
    let confidenceSum = 0;
    let confidenceSamples = 0;

    for (const paragraph of paragraphs) {
      classifyParagraph(paragraph, counts);

      if (paragraph.lizard.status !== 'complete') {
        continue;
      }

      for (const theme of paragraph.lizard.theme ?? []) {
        increment(themeCounts, theme);
      }
      for (const emotion of paragraph.lizard.emotion ?? []) {
        increment(emotionCounts, emotion);
      }
      if (typeof paragraph.lizard.confidence === 'number') {
        confidenceSum += paragraph.lizard.confidence;
        confidenceSamples += 1;
      }
    }

    return {
      chapterId: chapter.id,
      title: chapter.title,
      order: chapter.order,
      counts,
      topThemes: toTopEntries(themeCounts, limit),
      topEmotions: toTopEntries(emotionCounts, limit),
      averageConfidence: confidenceSamples === 0 ? null : confidenceSum / confidenceSamples,
    };
  });
}
