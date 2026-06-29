import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AnalysisFlowPrototype } from './AnalysisFlowPrototype.js';

describe('AnalysisFlowPrototype', () => {
  it('A案の未選択状態で読みの目次を表示する', () => {
    const html = renderToStaticMarkup(<AnalysisFlowPrototype initialVariant="focus" />);

    expect(html).toContain('Analysis Flow Prototype');
    expect(html).toContain('A Focus Inspector');
    expect(html).toContain('analysis-flow-toc');
    expect(html).toContain('静かな待機の感覚は届く');
  });

  it('A案の段落選択状態で右インスペクターと問いかけ入力を表示する', () => {
    const html = renderToStaticMarkup(
      <AnalysisFlowPrototype initialVariant="focus" initialFocusedParagraphId="p1" />,
    );

    expect(html).toContain('analysis-flow-inspector-body');
    expect(html).toContain('初見の読者');
    expect(html).toContain('2 / 2');
    expect(html).toContain('この段落について聞く');
  });

  it('B案では未選択時に本文横の読みレーンを表示し、右インスペクターを出さない', () => {
    const html = renderToStaticMarkup(<AnalysisFlowPrototype initialVariant="rail" />);

    expect(html).toContain('B Reading Rail');
    expect(html).toContain('analysis-flow-reading-rail');
    expect(html).not.toContain('analysis-flow-inspector-body');
  });

  it('縮小状態では選択段落があっても段落チャットを閉じる', () => {
    const html = renderToStaticMarkup(
      <AnalysisFlowPrototype
        initialVariant="focus"
        initialFocusedParagraphId="p4"
        initialPanelCollapsed
      />,
    );

    expect(html).toContain('analysis-flow-toc');
    expect(html).not.toContain('この段落について聞く');
  });
});
