import { describe, expect, it } from 'vitest';
import {
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
});
