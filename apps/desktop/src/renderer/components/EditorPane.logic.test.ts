import { describe, expect, it } from 'vitest';
import { mapParagraphIdsByNodeKeys, reorderNodeKeys } from './EditorPane.js';

describe('EditorPane lexical helpers', () => {
  it('reorders node keys', () => {
    const source = ['k_a', 'k_b', 'k_c'];

    const result = reorderNodeKeys(source, 'k_c', 'k_a');

    expect(result).toEqual(['k_c', 'k_a', 'k_b']);
  });

  it('returns same array when reorder target is invalid', () => {
    const source = ['k_a', 'k_b'];

    const result = reorderNodeKeys(source, 'k_x', 'k_b');

    expect(result).toBe(source);
  });

  it('maps reordered node keys back to paragraph ids', () => {
    const currentNodeKeys = ['k_a', 'k_b', 'k_c'];
    const nextNodeKeys = ['k_c', 'k_a', 'k_b'];
    const paragraphIds = ['p_01', 'p_02', 'p_03'];

    const orderedIds = mapParagraphIdsByNodeKeys(currentNodeKeys, nextNodeKeys, paragraphIds);

    expect(orderedIds).toEqual(['p_03', 'p_01', 'p_02']);
  });

  it('returns null when node key and paragraph id counts mismatch', () => {
    const orderedIds = mapParagraphIdsByNodeKeys(['k_a', 'k_b'], ['k_b', 'k_a'], ['p_01']);

    expect(orderedIds).toBeNull();
  });
});
