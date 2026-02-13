import React from 'react';
import type { LiteLizardDocument } from '@litelizard/shared';

interface Props {
  document: LiteLizardDocument | null;
  onRunAnalysis: () => void;
}

export function AnalysisPane({ document, onRunAnalysis }: Props) {
  return (
    <section className="pane analysis-pane">
      <div className="analysis-header">
        <h2>Analysis</h2>
        <button onClick={onRunAnalysis} disabled={!document}>
          Run Analysis
        </button>
      </div>
      {!document ? (
        <div className="empty">No document loaded</div>
      ) : (
        <div className="analysis-list">
          {document.paragraphs.map((paragraph) => (
            <article key={paragraph.id} className="analysis-card">
              <div className="analysis-top">
                <strong>{paragraph.id}</strong>
                <span className={`status status-${paragraph.lizard.status}`}>{paragraph.lizard.status}</span>
              </div>
              <div>
                <b>Emotion:</b> {(paragraph.lizard.emotion ?? []).join(', ') || '-'}
              </div>
              <div>
                <b>Theme:</b> {(paragraph.lizard.theme ?? []).join(', ') || '-'}
              </div>
              <div>
                <b>Deep Meaning:</b> {paragraph.lizard.deepMeaning ?? '-'}
              </div>
              <div>
                <b>Confidence:</b>{' '}
                {paragraph.lizard.confidence !== undefined ? paragraph.lizard.confidence.toFixed(2) : '-'}
              </div>
              {paragraph.lizard.error ? (
                <div className="error-text">
                  {paragraph.lizard.error.code}: {paragraph.lizard.error.message}
                </div>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
