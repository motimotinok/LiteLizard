import { describe, expect, it } from 'vitest';
import {
  decideBackspaceAction,
  mergeAdjacentParagraphTexts,
  type BackspaceContext,
} from './backspaceMerge.js';

function ctx(overrides: Partial<BackspaceContext> = {}): BackspaceContext {
  return {
    isCollapsed: true,
    topLevelIsParagraph: true,
    anchorOffset: 0,
    topLevelIsChapter: false,
    hasPrecedingChapterNode: false,
    prevSiblingIsParagraph: true,
    prevSiblingIsChapter: false,
    ...overrides,
  };
}

describe('decideBackspaceAction', () => {
  it('pass-through when selection is not collapsed', () => {
    expect(decideBackspaceAction(ctx({ isCollapsed: false })).kind).toBe('pass-through');
  });

  it('pass-through when top level is not a paragraph node', () => {
    expect(decideBackspaceAction(ctx({ topLevelIsParagraph: false })).kind).toBe('pass-through');
  });

  it('pass-through when caret is not at the start of the paragraph', () => {
    expect(decideBackspaceAction(ctx({ anchorOffset: 3 })).kind).toBe('pass-through');
  });

  it('noop when caret is at the start of the first chapter title', () => {
    const decision = decideBackspaceAction(
      ctx({ topLevelIsChapter: true, hasPrecedingChapterNode: false }),
    );
    expect(decision.kind).toBe('noop');
  });

  it('demote-chapter when caret is at the start of a non-first chapter title', () => {
    const decision = decideBackspaceAction(
      ctx({ topLevelIsChapter: true, hasPrecedingChapterNode: true }),
    );
    expect(decision.kind).toBe('demote-chapter');
  });

  it('pass-through when there is no previous paragraph sibling', () => {
    expect(
      decideBackspaceAction(ctx({ prevSiblingIsParagraph: false })).kind,
    ).toBe('pass-through');
  });

  it('noop when previous sibling is a chapter node (chapter boundary)', () => {
    const decision = decideBackspaceAction(
      ctx({ prevSiblingIsParagraph: true, prevSiblingIsChapter: true }),
    );
    expect(decision.kind).toBe('noop');
  });

  it('merge-with-prev when previous sibling is another body paragraph in the same chapter', () => {
    const decision = decideBackspaceAction(
      ctx({ prevSiblingIsParagraph: true, prevSiblingIsChapter: false }),
    );
    expect(decision.kind).toBe('merge-with-prev');
  });

  it('does not merge across a chapter boundary even when caret is at offset zero', () => {
    const decision = decideBackspaceAction(
      ctx({
        topLevelIsChapter: false,
        prevSiblingIsParagraph: true,
        prevSiblingIsChapter: true,
      }),
    );
    expect(decision.kind).toBe('noop');
  });
});

describe('mergeAdjacentParagraphTexts', () => {
  it('concatenates the texts and places cursor at the boundary', () => {
    expect(mergeAdjacentParagraphTexts('吾輩は猫である。', '名前はまだ無い。')).toEqual({
      mergedText: '吾輩は猫である。名前はまだ無い。',
      cursorOffset: 8,
    });
  });

  it('handles an empty previous paragraph', () => {
    expect(mergeAdjacentParagraphTexts('', 'tail')).toEqual({
      mergedText: 'tail',
      cursorOffset: 0,
    });
  });

  it('handles an empty current paragraph', () => {
    expect(mergeAdjacentParagraphTexts('head', '')).toEqual({
      mergedText: 'head',
      cursorOffset: 4,
    });
  });
});
