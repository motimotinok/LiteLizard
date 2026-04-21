import React from 'react';
import { type ParagraphNode } from 'lexical';
export declare function deleteChapterNodeInLexical(topLevel: ParagraphNode, chapterNodeKeySetRef: React.MutableRefObject<Set<string>>): void;
export declare function ChapterCommandPlugin({ chapterNodeKeySetRef, }: {
    chapterNodeKeySetRef: React.MutableRefObject<Set<string>>;
}): null;
