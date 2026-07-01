export interface BackspaceContext {
  isCollapsed: boolean;
  topLevelIsParagraph: boolean;
  anchorOffset: number;
  topLevelIsChapter: boolean;
  hasPrecedingChapterNode: boolean;
  prevSiblingIsParagraph: boolean;
  prevSiblingIsChapter: boolean;
}

export type BackspaceDecision =
  | { kind: 'pass-through' }
  | { kind: 'noop' }
  | { kind: 'demote-chapter' }
  | { kind: 'merge-with-prev' };

export function decideBackspaceAction(context: BackspaceContext): BackspaceDecision {
  if (!context.isCollapsed) return { kind: 'pass-through' };
  if (!context.topLevelIsParagraph) return { kind: 'pass-through' };
  if (context.anchorOffset !== 0) return { kind: 'pass-through' };

  if (context.topLevelIsChapter) {
    if (!context.hasPrecedingChapterNode) return { kind: 'noop' };
    return { kind: 'demote-chapter' };
  }

  if (!context.prevSiblingIsParagraph) return { kind: 'pass-through' };
  if (context.prevSiblingIsChapter) return { kind: 'noop' };
  return { kind: 'merge-with-prev' };
}

export function mergeAdjacentParagraphTexts(
  previousText: string,
  currentText: string,
): { mergedText: string; cursorOffset: number } {
  return {
    mergedText: previousText + currentText,
    cursorOffset: previousText.length,
  };
}
