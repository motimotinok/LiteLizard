import { describe, expect, it } from 'vitest';
import {
  buildChapterInputs,
  buildParagraphInputs,
  mapParagraphIdsByNodeKeys,
  mergeParagraphIdByNodeKey,
  reorderNodeKeys,
  shouldSyncStructure,
} from './EditorPane.js';

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

  it('keeps prior node key/id mapping when paragraph order changes first', () => {
    const nextMap = mergeParagraphIdByNodeKey(
      new Map([
        ['k_a', 'p_01'],
        ['k_b', 'p_02'],
        ['k_c', 'p_03'],
      ]),
      ['k_a', 'k_b', 'k_c'],
      ['p_03', 'p_01', 'p_02'],
    );

    expect(nextMap).toEqual(
      new Map([
        ['k_a', 'p_01'],
        ['k_b', 'p_02'],
        ['k_c', 'p_03'],
      ]),
    );
  });

  it('maps new node keys by index when no prior mapping exists', () => {
    const nextMap = mergeParagraphIdByNodeKey(new Map(), ['k_a', 'k_b'], ['p_01', 'p_02']);

    expect(nextMap).toEqual(
      new Map([
        ['k_a', 'p_01'],
        ['k_b', 'p_02'],
      ]),
    );
  });

  it('keeps previous key/id mapping when node count is temporarily unsynced', () => {
    const previousKeyToId = new Map([
      ['k_a', 'p_01'],
      ['k_b', 'p_02'],
      ['k_c', 'p_03'],
    ]);

    const orderedIds = mapParagraphIdsByNodeKeys(
      ['k_a', 'k_new', 'k_b', 'k_c'],
      ['k_c', 'k_a', 'k_new', 'k_b'],
      ['p_01', 'p_02', 'p_03'],
      previousKeyToId,
    );

    expect(orderedIds).toEqual(['p_03', 'p_01', 'p_02']);
  });

  it('creates a fresh chapter id for unknown chapter node keys', () => {
    const chapterInputs = buildChapterInputs(
      [
        { nodeKey: 'k_new', title: 'Inserted chapter' },
        { nodeKey: 'k_existing', title: 'Existing chapter' },
      ],
      new Map([['k_existing', 'c_existing']]),
    );

    expect(chapterInputs[0].id).toMatch(/^c_/);
    expect(chapterInputs[0].id).not.toBe('c_existing');
    expect(chapterInputs[1].id).toBe('c_existing');
  });

  it('creates a fresh paragraph id for unknown paragraph node keys', () => {
    const paragraphInputs = buildParagraphInputs(
      [
        { nodeKey: 'k_new', chapterNodeKey: 'c_a_key', text: 'Inserted paragraph' },
        { nodeKey: 'k_existing', chapterNodeKey: 'c_a_key', text: 'Existing paragraph' },
      ],
      new Map([['k_existing', 'p_existing']]),
      new Map([['c_a_key', 'c_a']]),
      'c_a',
    );

    expect(paragraphInputs[0].id).toMatch(/^p_/);
    expect(paragraphInputs[0].id).not.toBe('p_existing');
    expect(paragraphInputs[1].id).toBe('p_existing');
    expect(paragraphInputs[0].chapterId).toBe('c_a');
  });

  it('skips sync for initial baseline snapshot', () => {
    const decision = shouldSyncStructure('sig_next', 'sig_prev', false);

    expect(decision).toEqual({
      shouldSync: false,
      nextBaselineCaptured: true,
    });
  });

  it('syncs only when signature changed after baseline captured', () => {
    const same = shouldSyncStructure('sig_1', 'sig_1', true);
    const changed = shouldSyncStructure('sig_2', 'sig_1', true);

    expect(same.shouldSync).toBe(false);
    expect(changed.shouldSync).toBe(true);
  });
});
