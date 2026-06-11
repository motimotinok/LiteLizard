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
    expect(html).toContain('新しい作業フォルダを作成できます');
  });
});
