import type { AnalysisCostEstimate } from '@litelizard/shared';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AnalysisRunConfirm } from './AnalysisRunConfirm.js';

function createEstimate(overrides: Partial<AnalysisCostEstimate> = {}): AnalysisCostEstimate {
  return {
    targetCount: 3,
    targetTextChars: 1234,
    contextTextChars: 5678,
    totalInputChars: 9012,
    estimatedOutputChars: 1500,
    approximationNote: '概算です。',
    ...overrides,
  };
}

describe('AnalysisRunConfirm', () => {
  const renderConfirm = (estimate: AnalysisCostEstimate = createEstimate()) =>
    renderToStaticMarkup(
      <AnalysisRunConfirm
        estimate={estimate}
        agentName="静かな読者"
        targetScopeLabel="段落"
        contextPolicyLabel="文書全体参照"
        referencedParagraphCount={4}
        hasAdditionalInstruction={false}
        onCancel={() => {}}
        onConfirm={() => {}}
      />,
    );

  it('実行ボタンとキャンセルボタンを両方表示し、role=dialog を持つ', () => {
    const html = renderConfirm();

    expect(html).toContain('role="dialog"');
    expect(html).toContain('analysis-run-confirm-execute');
    expect(html).toContain('analysis-run-confirm-cancel');
    expect(html).toContain('実行する');
    expect(html).toContain('キャンセル');
  });

  it('overlay 構造（backdrop と overlay wrapper）を持つ', () => {
    const html = renderConfirm();

    expect(html).toContain('analysis-run-confirm-overlay');
    expect(html).toContain('analysis-run-confirm-backdrop');
  });

  it('内部実装寄りの文言を含まず、ユーザー向け文言で項目を説明する', () => {
    const html = renderConfirm();

    expect(html).not.toContain('コンテキスト本文量');
    expect(html).not.toContain('対象本文量');
    expect(html).not.toContain('概算 output 量');
    expect(html).toContain('解析する段落');
    expect(html).toContain('段落本文');
    expect(html).toContain('前後の文脈');
    expect(html).toContain('Reading Agent');
    expect(html).toContain('文脈ポリシー');
    expect(html).toContain('追加指示');
  });

  it('段落数と文字数を日本語ロケールでフォーマット表示する', () => {
    const html = renderConfirm(
      createEstimate({
          targetCount: 12,
          targetTextChars: 1234567,
        }),
    );

    expect(html).toContain('12 段落');
    expect(html).toContain('1,234,567 文字');
  });

  it('Agent、対象、文脈、追加指示の有無を表示する', () => {
    const html = renderConfirm();

    expect(html).toContain('静かな読者');
    expect(html).toContain('段落 / 3 件');
    expect(html).toContain('文書全体参照');
    expect(html).toContain('4 段落');
    expect(html).toContain('なし');
  });

  it('追加指示がある場合は本文ではなく有無だけを表示する', () => {
    const html = renderToStaticMarkup(
      <AnalysisRunConfirm
        estimate={createEstimate()}
        agentName="静かな読者"
        targetScopeLabel="段落"
        contextPolicyLabel="文書全体参照"
        referencedParagraphCount={4}
        hasAdditionalInstruction
        onCancel={() => {}}
        onConfirm={() => {}}
      />,
    );

    expect(html).toContain('あり');
    expect(html).not.toContain('初見読者');
  });
});
