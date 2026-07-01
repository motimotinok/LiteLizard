import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { ProjectSetupScreen } from './ProjectSetupScreen.js';

describe('ProjectSetupScreen', () => {
  it('新しい作業フォルダを作成できる導線を表示する', () => {
    const html = renderToStaticMarkup(
      <ProjectSetupScreen
        onSelectFolder={vi.fn()}
        recentProjects={[]}
        onOpenRecent={vi.fn()}
        onRemoveRecent={vi.fn()}
      />,
    );

    expect(html).toContain('フォルダを開く');
    expect(html).toContain('作業フォルダを開く');
    expect(html).toContain('文章を書く、または開く');
    expect(html).toContain('必要な段落を読ませる');
    expect(html).toContain('文書と分析結果はローカルに保存されます');
  });
});
