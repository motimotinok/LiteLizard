import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { EditorEmptyState } from './EditorEmptyState.js';

describe('EditorEmptyState', () => {
  it('文書作成とフォルダ切り替えの初回導線を表示する', () => {
    const html = renderToStaticMarkup(
      <EditorEmptyState onCreateEssay={vi.fn()} onOpenFolder={vi.fn()} />,
    );

    expect(html).toContain('まず一文を置く');
    expect(html).toContain('新しい文書を書く');
    expect(html).toContain('別のフォルダを開く');
    expect(html).toContain('APIキーやReading Agentは、書き始めたあとで設定できます');
  });
});
