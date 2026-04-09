import { describe, expect, it } from 'vitest';
import {
  ensureFileName,
  ensureMarkdownFileName,
  sanitizeFileStem,
  toTitleFromFileName,
  validateEntryName,
} from './ipcPathUtils.js';

describe('ipc path utils', () => {
  it('validates entry names', () => {
    expect(validateEntryName(' essay ')).toBe('essay');
    expect(() => validateEntryName('')).toThrowError();
    expect(() => validateEntryName('../x')).toThrowError();
  });

  it('normalizes markdown file names', () => {
    expect(ensureMarkdownFileName('draft')).toBe('draft.md');
    expect(ensureMarkdownFileName('draft.md')).toBe('draft.md');
    expect(ensureMarkdownFileName('Essay.MD')).toBe('Essay.md');
  });

  it('sanitizes file stem and recovers fallback', () => {
    expect(sanitizeFileStem('A:B?C')).toBe('A_B_C');
    expect(sanitizeFileStem('A/B')).toBe('A_B');
    expect(sanitizeFileStem('   ')).toBe('Untitled');
  });

  it('extracts title from markdown filename', () => {
    expect(toTitleFromFileName('essay.md')).toBe('essay');
    expect(toTitleFromFileName('essay.MD')).toBe('essay');
  });

  it('extracts title from .lzl filename', () => {
    expect(toTitleFromFileName('story.lzl')).toBe('story');
    expect(toTitleFromFileName('story.LZL')).toBe('story');
  });

  it('ensureFileName で .lzl 拡張子が付与される', () => {
    expect(ensureFileName('story', '.lzl')).toBe('story.lzl');
    expect(ensureFileName('story.lzl', '.lzl')).toBe('story.lzl');
    expect(ensureFileName('story.LZL', '.lzl')).toBe('story.lzl');
  });

  it('ensureFileName で .lzl 以外は .md 拡張子が付与される', () => {
    expect(ensureFileName('draft', '.md')).toBe('draft.md');
    expect(ensureFileName('draft.md', '.md')).toBe('draft.md');
    expect(ensureFileName('draft', '')).toBe('draft.md');
  });
});
