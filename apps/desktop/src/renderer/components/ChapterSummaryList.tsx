import React from 'react';
import type { ChapterAnalysisSummary } from '../utils/chapterAnalysisAggregation.js';

export interface ChapterSummaryListProps {
  summaries: ChapterAnalysisSummary[];
}

export function ChapterSummaryList({ summaries }: ChapterSummaryListProps) {
  if (summaries.length === 0) {
    return (
      <div className="analysis-empty" data-testid="chapter-summary-empty">
        章がありません。
      </div>
    );
  }

  return (
    <div className="analysis-chapter-summary-list" aria-label="章ごとの分析サマリー">
      {summaries.map((summary, index) => (
        <ChapterSummaryCard key={summary.chapterId} summary={summary} index={index} />
      ))}
    </div>
  );
}

interface ChapterSummaryCardProps {
  summary: ChapterAnalysisSummary;
  index: number;
}

interface ChapterSummaryTagListProps {
  ariaLabel: string;
  caption: string;
  entries: ChapterAnalysisSummary['topThemes'];
  keyPrefix: string;
}

function ChapterSummaryTagList({ ariaLabel, caption, entries, keyPrefix }: ChapterSummaryTagListProps) {
  if (entries.length === 0) {
    return null;
  }

  return (
    <div className="analysis-chapter-summary-tags" aria-label={ariaLabel}>
      <span className="analysis-chapter-summary-tags-label">{caption}</span>
      <ul className="analysis-tag-list">
        {entries.map((entry, tagIndex) => (
          <React.Fragment key={`${keyPrefix}-${entry.value}`}>
            {tagIndex > 0 ? (
              <span className="analysis-tag-separator" aria-hidden>
                ·
              </span>
            ) : null}
            <li className="analysis-tag">
              {entry.value}
              {entry.count > 1 ? (
                <span className="analysis-chapter-summary-tag-count">×{entry.count}</span>
              ) : null}
            </li>
          </React.Fragment>
        ))}
      </ul>
    </div>
  );
}

function ChapterSummaryCard({ summary, index }: ChapterSummaryCardProps) {
  const indexLabel = `C${String(index + 1).padStart(2, '0')}`;
  const titleText = summary.title.trim() || '無題の章';
  const { counts, topThemes, topEmotions, averageConfidence } = summary;
  const hasAnyAnalysis = counts.complete > 0;
  const confidencePercent =
    averageConfidence === null ? null : Math.round(averageConfidence * 100);

  const countItems: Array<{ key: string; label: string; value: number; tone: string }> = [
    { key: 'complete', label: '解析済み', value: counts.complete, tone: 'complete' },
    { key: 'staleWithPrevious', label: '要再解析', value: counts.staleWithPrevious, tone: 'stale' },
    { key: 'notAnalyzed', label: '未解析', value: counts.notAnalyzed, tone: 'untouched' },
    { key: 'pending', label: '解析中', value: counts.pending, tone: 'pending' },
    { key: 'failed', label: '失敗', value: counts.failed, tone: 'failed' },
  ];

  return (
    <article
      className="analysis-chapter-summary-card"
      aria-label={`${indexLabel} ${titleText} のサマリー`}
    >
      <header className="analysis-chapter-summary-header">
        <span className="analysis-chapter-summary-index">{indexLabel}</span>
        <h3 className="analysis-chapter-summary-title">{titleText}</h3>
        <span className="analysis-chapter-summary-total">{counts.total} 段落</span>
      </header>

      <ul className="analysis-chapter-summary-counts">
        {countItems.map((item) => (
          <li
            key={item.key}
            className={
              item.value > 0
                ? `analysis-chapter-summary-count is-${item.tone}`
                : 'analysis-chapter-summary-count is-empty'
            }
          >
            <span className="analysis-chapter-summary-count-label">{item.label}</span>
            <span className="analysis-chapter-summary-count-value">{item.value}</span>
          </li>
        ))}
      </ul>

      {hasAnyAnalysis ? (
        <>
          <ChapterSummaryTagList
            ariaLabel="主要なテーマ"
            caption="主要テーマ"
            entries={topThemes}
            keyPrefix={`${summary.chapterId}-theme`}
          />
          <ChapterSummaryTagList
            ariaLabel="主要な感情"
            caption="主要な感情"
            entries={topEmotions}
            keyPrefix={`${summary.chapterId}-emotion`}
          />
          {confidencePercent !== null ? (
            <p className="analysis-chapter-summary-confidence">
              <span className="analysis-chapter-summary-confidence-label">確度平均</span>
              <span className="analysis-chapter-summary-confidence-value">{confidencePercent}</span>
            </p>
          ) : null}
        </>
      ) : (
        <p className="analysis-card-status">
          {counts.total === 0
            ? 'この章にはまだ段落がありません。'
            : '段落分析がまだありません。段落を解析するとサマリーが表示されます。'}
        </p>
      )}
    </article>
  );
}
