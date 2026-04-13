import { describe, expect, it } from 'vitest';
import { getEffectivePanelMaxWidth } from './useResizablePanel.ts';

describe('getEffectivePanelMaxWidth', () => {
  it('caps panel width to half of the viewport', () => {
    expect(getEffectivePanelMaxWidth(160, 480, 700)).toBe(350);
  });

  it('never shrinks below the minimum width', () => {
    expect(getEffectivePanelMaxWidth(240, 600, 300)).toBe(240);
  });

  it('never exceeds the configured maximum width', () => {
    expect(getEffectivePanelMaxWidth(160, 480, 2000)).toBe(480);
  });
});
