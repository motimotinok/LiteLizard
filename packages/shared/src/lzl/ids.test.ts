import { describe, expect, it, vi } from 'vitest';
import {
  createChapterId,
  createDocumentId,
  createParagraphId,
  generateId,
  isValidChapterId,
  isValidDocumentId,
  isValidParagraphId,
  randomAlphanumeric,
} from './ids.js';

describe('lzl ids', () => {
  it('generates lowercase alphanumeric strings', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);

    expect(randomAlphanumeric(4)).toBe('aaaa');
  });

  it('generates ids with expected prefixes', () => {
    expect(generateId('d')).toMatch(/^d_[a-z0-9]{10}$/);
    expect(generateId('c')).toMatch(/^c_[a-z0-9]{10}$/);
    expect(generateId('p')).toMatch(/^p_[a-z0-9]{10}$/);
    expect(createDocumentId()).toMatch(/^d_[a-z0-9]{10}$/);
    expect(createChapterId()).toMatch(/^c_[a-z0-9]{10}$/);
    expect(createParagraphId()).toMatch(/^p_[a-z0-9]{10}$/);
  });

  it('validates only the new id format', () => {
    expect(isValidDocumentId('d_abcdefghij')).toBe(true);
    expect(isValidChapterId('c_abcdefghij')).toBe(true);
    expect(isValidParagraphId('p_abcdefghij')).toBe(true);

    expect(isValidDocumentId('doc_abcdefghij')).toBe(false);
    expect(isValidDocumentId('d_abcdefgh')).toBe(false);
    expect(isValidChapterId('c_ABCDEFGH12')).toBe(false);
    expect(isValidParagraphId('p_abc12345')).toBe(false);
  });
});
