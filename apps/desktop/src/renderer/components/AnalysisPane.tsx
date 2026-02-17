import React, { useMemo } from 'react';
import type { LiteLizardDocument } from '@litelizard/shared';
import { analyzeWithLocalHeuristics } from './analysis/analyzer.js';

type AnalysisMode = 'structure' | 'reader';

interface Props {
  document: LiteLizardDocument | null;
  activeParagraphId: string | null;
  mode: AnalysisMode;
}

export function AnalysisPane({ document, activeParagraphId, mode }: Props) {
  const analysis = useMemo(() => {
    if (!document) {
      return null;
    }
    return analyzeWithLocalHeuristics(document);
  }, [document]);

  return (
    <section className="analysis-shell">
      <header className="analysis-header">
        <div className="analysis-title-wrap">
          <span className="analysis-title-icon" aria-hidden>
            🧭
          </span>
          <div>
            <h2 className="analysis-title">推敲支援レイヤー</h2>
            <p className="analysis-subtitle">
              {mode === 'reader' ? '読み手視点の確認モード（Phase1は骨格）' : '構造推敲モード'}
            </p>
          </div>
        </div>
      </header>

      {!document ? (
        <div className="analysis-empty">ドキュメントを開くと推敲情報が表示されます。</div>
      ) : mode === 'reader' ? (
        <div className="analysis-reader-placeholder">
          <h3>読み手視点モード（準備中）</h3>
          <p>Phase1では骨格のみ実装しています。Phase3で段落折りたたみ、強調語、感情曲線を追加します。</p>
        </div>
      ) : (
        <div className="analysis-scroll">
          <section className="analysis-section-block">
            <h3 className="analysis-section-heading">印象スコア</h3>
            <div className="score-list">
              {analysis?.scores.map((score) => (
                <div key={score.key} className="score-item">
                  <div className="score-row">
                    <span>{score.label}</span>
                    <span>{score.value}</span>
                  </div>
                  <div className="score-bar-track">
                    <div className="score-bar-fill" style={{ width: `${score.value}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="analysis-section-block">
            <h3 className="analysis-section-heading">段落ごとの役割</h3>
            <div className="role-list">
              {document.paragraphs.map((paragraph, index) => {
                const role = analysis?.roles.find((item) => item.paragraphId === paragraph.id)?.label ?? '未分類';
                const active = paragraph.id === activeParagraphId;

                return (
                  <div key={paragraph.id} className={active ? 'role-item role-item-active' : 'role-item'}>
                    <span className="role-index">P{String(index + 1).padStart(2, '0')}</span>
                    <span className="role-label">{role}</span>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="analysis-section-block">
            <h3 className="analysis-section-heading">冗長検出</h3>
            <ul className="analysis-findings">
              {analysis?.redundancy.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </section>
  );
}
