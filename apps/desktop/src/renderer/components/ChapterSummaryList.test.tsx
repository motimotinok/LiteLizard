import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ChapterSummaryList } from './ChapterSummaryList.js';
import type { ChapterAnalysisSummary } from '../utils/chapterAnalysisAggregation.js';

function makeSummary(overrides: Partial<ChapterAnalysisSummary>): ChapterAnalysisSummary {
  return {
    chapterId: 'c1',
    title: '一章',
    order: 1,
    counts: {
      total: 0,
      complete: 0,
      pending: 0,
      failed: 0,
      staleWithPrevious: 0,
      notAnalyzed: 0,
    },
    topTags: [],
    ...overrides,
  };
}

describe('ChapterSummaryList', () => {
  it('summaries が空のときは「章がありません」プレースホルダを描画する', () => {
    const html = renderToStaticMarkup(<ChapterSummaryList summaries={[]} />);
    expect(html).toContain('章がありません');
    expect(html).not.toContain('analysis-chapter-summary-list');
  });

  it('章タイトル・段落数・カウンタ・タグを描画する', () => {
    const summaries: ChapterAnalysisSummary[] = [
      makeSummary({
        chapterId: 'c1',
        title: '出会いの章',
        counts: {
          total: 4,
          complete: 2,
          pending: 0,
          failed: 0,
          staleWithPrevious: 1,
          notAnalyzed: 1,
        },
        topTags: [
          { value: '対話', count: 2 },
          { value: '別れ', count: 1 },
          { value: '寂しさ', count: 2 },
        ],
      }),
    ];

    const html = renderToStaticMarkup(<ChapterSummaryList summaries={summaries} />);

    expect(html).toContain('analysis-chapter-summary-list');
    expect(html).toContain('analysis-chapter-summary-card');
    expect(html).toContain('C01');
    expect(html).toContain('出会いの章');
    expect(html).toContain('4 段落');
    expect(html).toContain('解析済み');
    expect(html).toContain('要再解析');
    expect(html).toContain('未解析');
    expect(html).toContain('対話');
    expect(html).toContain('×2');
    expect(html).toContain('寂しさ');
    expect(html).not.toContain('確度平均');
  });

  it('complete が 0 でも段落数があれば未解析メッセージを描画する', () => {
    const summaries: ChapterAnalysisSummary[] = [
      makeSummary({
        chapterId: 'c1',
        title: '一章',
        counts: {
          total: 3,
          complete: 0,
          pending: 0,
          failed: 0,
          staleWithPrevious: 0,
          notAnalyzed: 3,
        },
      }),
    ];

    const html = renderToStaticMarkup(<ChapterSummaryList summaries={summaries} />);

    expect(html).toContain('段落分析がまだありません');
    expect(html).not.toContain('主要タグ');
    expect(html).not.toContain('確度平均');
  });

  it('段落数が 0 の章は専用メッセージを描画する', () => {
    const summaries: ChapterAnalysisSummary[] = [
      makeSummary({
        chapterId: 'c1',
        title: '空の章',
      }),
    ];

    const html = renderToStaticMarkup(<ChapterSummaryList summaries={summaries} />);

    expect(html).toContain('この章にはまだ段落がありません');
  });

  it('chapter index ラベルは並び順に応じて C01, C02 と振り直す', () => {
    const summaries: ChapterAnalysisSummary[] = [
      makeSummary({ chapterId: 'c1', title: '一', order: 1 }),
      makeSummary({ chapterId: 'c2', title: '二', order: 2 }),
    ];

    const html = renderToStaticMarkup(<ChapterSummaryList summaries={summaries} />);

    expect(html).toContain('C01');
    expect(html).toContain('C02');
  });
});
