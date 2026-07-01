import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { LeftIconRail } from './LeftIconRail.js';

describe('LeftIconRail', () => {
  it('エクスプローラーの開閉状態をフォルダアイコンに反映する', () => {
    const openHtml = renderToStaticMarkup(
      <LeftIconRail activePanel="editor" editorPanelExpanded onSelectPanel={vi.fn()} />,
    );
    const collapsedHtml = renderToStaticMarkup(
      <LeftIconRail activePanel="editor" editorPanelExpanded={false} onSelectPanel={vi.fn()} />,
    );

    expect(openHtml).toContain('エクスプローラーを閉じる');
    expect(openHtml).toContain('aria-expanded="true"');
    expect(collapsedHtml).toContain('エクスプローラーを開く');
    expect(collapsedHtml).toContain('aria-expanded="false"');
  });
});
