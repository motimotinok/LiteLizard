import { describe, expect, it } from 'vitest';
import type { LiteLizardDocument, Paragraph } from '@litelizard/shared';
import { aggregateChapterAnalyses } from './chapterAnalysisAggregation.js';

function makeDocument(paragraphs: Paragraph[], chapters?: LiteLizardDocument['chapters']): LiteLizardDocument {
  return {
    version: 2,
    documentId: 'doc',
    title: 'doc',
    personaMode: 'general-reader',
    createdAt: '2026-05-07T00:00:00.000Z',
    updatedAt: '2026-05-07T00:00:00.000Z',
    chapters: chapters ?? [
      { id: 'c1', order: 1, title: '一章' },
      { id: 'c2', order: 2, title: '二章' },
    ],
    paragraphs,
  };
}

function makeParagraph(overrides: Partial<Paragraph> & Pick<Paragraph, 'id' | 'chapterId'>): Paragraph {
  return {
    order: 1,
    light: { text: '本文' },
    lizard: { status: 'stale' },
    ...overrides,
  } as Paragraph;
}

describe('aggregateChapterAnalyses', () => {
  it('document が null のときは空配列を返す', () => {
    expect(aggregateChapterAnalyses(null)).toEqual([]);
  });

  it('章を order 昇順で返し、章に紐づかない段落は集計対象外にする', () => {
    const doc = makeDocument([
      makeParagraph({ id: 'p1', chapterId: 'c2', order: 1, lizard: { status: 'complete', analyzedAt: '2026-05-07T01:00:00.000Z' } }),
      makeParagraph({ id: 'p2', chapterId: 'c1', order: 1, lizard: { status: 'complete', analyzedAt: '2026-05-07T01:00:00.000Z' } }),
      makeParagraph({ id: 'p3', chapterId: 'orphan', order: 1, lizard: { status: 'complete' } }),
    ]);

    const result = aggregateChapterAnalyses(doc);

    expect(result.map((s) => s.chapterId)).toEqual(['c1', 'c2']);
    expect(result[0].counts.total).toBe(1);
    expect(result[1].counts.total).toBe(1);
  });

  it('段落のステータスを complete / pending / failed / staleWithPrevious / notAnalyzed に分類する', () => {
    const doc = makeDocument(
      [
        makeParagraph({ id: 'p1', chapterId: 'c1', order: 1, lizard: { status: 'complete', analyzedAt: 'x' } }),
        makeParagraph({ id: 'p2', chapterId: 'c1', order: 2, lizard: { status: 'pending' } }),
        makeParagraph({ id: 'p3', chapterId: 'c1', order: 3, lizard: { status: 'failed', error: { code: 'x', message: 'x' } } }),
        makeParagraph({ id: 'p4', chapterId: 'c1', order: 4, lizard: { status: 'stale', analyzedAt: 'y' } }),
        makeParagraph({ id: 'p5', chapterId: 'c1', order: 5, lizard: { status: 'stale' } }),
      ],
      [{ id: 'c1', order: 1, title: '一章' }],
    );

    const [summary] = aggregateChapterAnalyses(doc);

    expect(summary.counts).toEqual({
      total: 5,
      complete: 1,
      pending: 1,
      failed: 1,
      staleWithPrevious: 1,
      notAnalyzed: 1,
    });
  });

  it('complete 段落のテーマ・感情を頻度順に集計し、空文字や空配列は無視する', () => {
    const doc = makeDocument(
      [
        makeParagraph({ id: 'p1', chapterId: 'c1', lizard: { status: 'complete', theme: ['対話', '別れ'], emotion: ['寂しさ'] } }),
        makeParagraph({ id: 'p2', chapterId: 'c1', lizard: { status: 'complete', theme: ['対話', '  '], emotion: ['寂しさ', '安堵'] } }),
        makeParagraph({ id: 'p3', chapterId: 'c1', lizard: { status: 'stale', theme: ['対話'], emotion: ['焦り'] } }),
      ],
      [{ id: 'c1', order: 1, title: '一章' }],
    );

    const [summary] = aggregateChapterAnalyses(doc);

    expect(summary.topThemes).toEqual([
      { value: '対話', count: 2 },
      { value: '別れ', count: 1 },
    ]);
    expect(summary.topEmotions).toEqual([
      { value: '寂しさ', count: 2 },
      { value: '安堵', count: 1 },
    ]);
  });

  it('topTagLimit でテーマ・感情の上位件数を制限する', () => {
    const doc = makeDocument(
      [
        makeParagraph({ id: 'p1', chapterId: 'c1', lizard: { status: 'complete', theme: ['a', 'b', 'c', 'd'] } }),
      ],
      [{ id: 'c1', order: 1, title: '一章' }],
    );

    const [summary] = aggregateChapterAnalyses(doc, { topTagLimit: 2 });

    expect(summary.topThemes).toHaveLength(2);
  });

  it('complete 段落の confidence 平均だけを計算し、サンプルがなければ null を返す', () => {
    const doc = makeDocument(
      [
        makeParagraph({ id: 'p1', chapterId: 'c1', lizard: { status: 'complete', confidence: 0.6 } }),
        makeParagraph({ id: 'p2', chapterId: 'c1', lizard: { status: 'complete', confidence: 0.8 } }),
        makeParagraph({ id: 'p3', chapterId: 'c1', lizard: { status: 'complete' } }),
        makeParagraph({ id: 'p4', chapterId: 'c1', lizard: { status: 'stale', confidence: 0.99, analyzedAt: 'x' } }),
        makeParagraph({ id: 'p5', chapterId: 'c2', lizard: { status: 'stale' } }),
      ],
    );

    const [first, second] = aggregateChapterAnalyses(doc);

    expect(first.averageConfidence).toBeCloseTo(0.7, 5);
    expect(second.averageConfidence).toBeNull();
  });

  it('段落が無い章でも 0 件のサマリーを返す', () => {
    const doc = makeDocument([], [
      { id: 'c1', order: 1, title: '一章' },
      { id: 'c2', order: 2, title: '二章' },
    ]);

    const result = aggregateChapterAnalyses(doc);

    expect(result).toHaveLength(2);
    expect(result[0].counts.total).toBe(0);
    expect(result[0].topThemes).toEqual([]);
    expect(result[0].averageConfidence).toBeNull();
  });
});
