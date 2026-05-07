import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rendererRoot = path.dirname(fileURLToPath(import.meta.url));

const readRendererFile = (relativePath: string) =>
  fs.readFileSync(path.join(rendererRoot, relativePath), 'utf8');

describe('renderer font assets', () => {
  it('does not depend on remote Google Fonts stylesheets', () => {
    const html = readRendererFile('index.html');

    expect(html).not.toContain('fonts.googleapis.com');
    expect(html).not.toContain('fonts.gstatic.com');
  });

  it('declares local font faces for the app typography tokens', () => {
    const css = readRendererFile('styles.css');
    const expectedFamilies = ['Shippori Mincho', 'Noto Sans JP', 'IBM Plex Sans', 'JetBrains Mono'];

    for (const family of expectedFamilies) {
      expect(css).toContain(`font-family: '${family}'`);
    }

    expect(css).toContain("url('./assets/fonts/");
    expect(css).not.toContain('https://');
  });

  it('keeps bundled font files and their licenses in renderer assets', () => {
    const fontRoot = path.join(rendererRoot, 'assets/fonts');
    const expectedFiles = [
      'ShipporiMincho-Regular.ttf',
      'NotoSansJP-Regular.otf',
      'IBMPlexSans-Regular.ttf',
      'JetBrainsMono-Regular.ttf',
      'LICENSES.md',
    ];

    for (const fileName of expectedFiles) {
      const stat = fs.statSync(path.join(fontRoot, fileName));
      expect(stat.isFile()).toBe(true);
      expect(stat.size).toBeGreaterThan(0);
    }
  });
});
