import React from 'react';
import type { AnalysisCostEstimate } from '@litelizard/shared';

interface Props {
  estimate: AnalysisCostEstimate;
  onCancel: () => void;
  onConfirm: () => void;
}

function formatChars(value: number): string {
  return `${value.toLocaleString('ja-JP')} 文字`;
}

export function AnalysisRunConfirm({ estimate, onCancel, onConfirm }: Props) {
  return (
    <div className="analysis-run-confirm-overlay" role="presentation">
      <div
        className="analysis-run-confirm-backdrop"
        onClick={onCancel}
        aria-hidden
      />
      <section
        className="analysis-run-confirm"
        role="dialog"
        aria-modal="true"
        aria-label="解析実行の確認"
      >
        <header className="analysis-run-confirm-header">送信内容を確認</header>
        <p className="analysis-run-confirm-lead">
          以下の段落を Reading Agent に送って解析します。送信前に内容を確認してください。
        </p>
        <dl className="analysis-run-confirm-list">
          <div>
            <dt>解析する段落</dt>
            <dd>{estimate.targetCount} 段落</dd>
          </div>
          <div>
            <dt>段落本文</dt>
            <dd>{formatChars(estimate.targetTextChars)}</dd>
          </div>
          <div>
            <dt>前後の文脈</dt>
            <dd>{formatChars(estimate.contextTextChars)}</dd>
          </div>
          <div>
            <dt>送信量(概算)</dt>
            <dd>{formatChars(estimate.totalInputChars)}</dd>
          </div>
          <div>
            <dt>応答量(概算)</dt>
            <dd>{formatChars(estimate.estimatedOutputChars)}</dd>
          </div>
        </dl>
        <p className="analysis-run-confirm-note">
          実際の課金額やトークン数とは一致しない、文字数ベースの概算値です。
        </p>
        <div className="analysis-run-confirm-actions">
          <button
            type="button"
            className="analysis-run-confirm-cancel"
            onClick={onCancel}
          >
            キャンセル
          </button>
          <button
            type="button"
            className="analysis-run-confirm-execute"
            onClick={onConfirm}
          >
            実行する
          </button>
        </div>
      </section>
    </div>
  );
}
