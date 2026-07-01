import { describe, expect, it } from 'vitest';
import { resolveAnalysisPanelToggle } from './App.js';

describe('resolveAnalysisPanelToggle', () => {
  it('段落詳細を表示中は分析レーンを残して選択だけ解除する', () => {
    expect(
      resolveAnalysisPanelToggle({
        analysisPanelOpen: true,
        activeParagraphId: 'p1',
      }),
    ).toEqual({
      analysisPanelOpen: true,
      activeParagraphId: null,
    });
  });

  it('段落詳細がないときは分析レーン自体を開閉する', () => {
    expect(
      resolveAnalysisPanelToggle({
        analysisPanelOpen: true,
        activeParagraphId: null,
      }),
    ).toEqual({
      analysisPanelOpen: false,
      activeParagraphId: null,
    });

    expect(
      resolveAnalysisPanelToggle({
        analysisPanelOpen: false,
        activeParagraphId: null,
      }),
    ).toEqual({
      analysisPanelOpen: true,
      activeParagraphId: null,
    });
  });
});
