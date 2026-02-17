import React from 'react';
import type { LizardStatus, LiteLizardDocument } from '@litelizard/shared';

interface Props {
  document: LiteLizardDocument | null;
  activeParagraphId: string | null;
  onRunAnalysis: () => void;
}

type Sentiment = 'positive' | 'neutral' | 'negative';

function detectSentiment(emotions: string[] | undefined): Sentiment {
  if (!emotions || emotions.length === 0) {
    return 'neutral';
  }

  const value = emotions.join(' ').toLowerCase();
  const positive = ['joy', 'happy', 'hope', 'love', 'calm', '安心', '喜び', '希望', 'ポジティブ'];
  const negative = ['anger', 'fear', 'sad', 'anxiety', 'regret', '怒り', '不安', '悲しみ', 'ネガティブ'];

  if (positive.some((item) => value.includes(item))) {
    return 'positive';
  }
  if (negative.some((item) => value.includes(item))) {
    return 'negative';
  }
  return 'neutral';
}

function sentimentLabel(sentiment: Sentiment) {
  if (sentiment === 'positive') {
    return 'ポジティブ';
  }
  if (sentiment === 'negative') {
    return '要改善';
  }
  return 'ニュートラル';
}

function statusLabel(status: LizardStatus) {
  if (status === 'pending') {
    return '解析中';
  }
  if (status === 'complete') {
    return '最新';
  }
  if (status === 'failed') {
    return '失敗';
  }
  return '再解析待ち';
}

export function AnalysisPane({ document, activeParagraphId, onRunAnalysis }: Props) {
  return (
    <section className="analysis-shell">
      <div className="analysis-sticky-header">
        <div>
          <h2 className="analysis-title">段落解析</h2>
          <p className="analysis-subtitle">各段落の相対的意味と読者感想予測を表示します。</p>
        </div>
        <button className="action-button action-button-primary" onClick={onRunAnalysis} disabled={!document}>
          全体解析を実行
        </button>
      </div>

      {!document ? (
        <div className="analysis-empty">ドキュメントを開くと分析結果が表示されます。</div>
      ) : (
        <div className="analysis-card-list">
          {document.paragraphs.map((paragraph, index) => {
            const sentiment = detectSentiment(paragraph.lizard.emotion);
            const active = activeParagraphId === paragraph.id;
            const meaning = paragraph.lizard.deepMeaning ?? '分析結果がまだありません。分析を実行すると内容が表示されます。';
            const readerImpact =
              paragraph.lizard.emotion && paragraph.lizard.emotion.length > 0
                ? `読者には「${paragraph.lizard.emotion.join(' / ')}」の印象として伝わる可能性があります。`
                : '読者への影響はまだ推定されていません。';

            return (
              <article key={paragraph.id} className={active ? 'analysis-card active' : 'analysis-card'}>
                <div className="analysis-card-top">
                  <span className="analysis-card-index">パラグラフ {index + 1}</span>
                  <div className="analysis-chip-group">
                    <span className={`sentiment-chip sentiment-chip-${sentiment}`}>{sentimentLabel(sentiment)}</span>
                    <span className={`status-chip status-chip-${paragraph.lizard.status}`}>{statusLabel(paragraph.lizard.status)}</span>
                  </div>
                </div>

                <div className="analysis-section">
                  <div className="analysis-section-title">相対的意味</div>
                  <p className="analysis-section-body">{meaning}</p>
                </div>

                <div className="analysis-section">
                  <div className="analysis-section-title">読者感想予測</div>
                  <p className="analysis-section-body">{readerImpact}</p>
                </div>

                {paragraph.lizard.error ? (
                  <div className="analysis-error">
                    {paragraph.lizard.error.code}: {paragraph.lizard.error.message}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
