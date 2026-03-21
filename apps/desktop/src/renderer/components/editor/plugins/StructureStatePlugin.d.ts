import React from 'react';
import type { StructureSnapshot } from '../utils/structureBuilder.js';
export declare function StructureStatePlugin({ chapterNodeKeySetRef, fallbackChapterNodeIndexes, onSnapshot, onActiveElement, }: {
    chapterNodeKeySetRef: React.MutableRefObject<Set<string>>;
    fallbackChapterNodeIndexes: number[];
    onSnapshot: (snapshot: StructureSnapshot, emptyParagraphNodeKeys: Set<string>) => void;
    onActiveElement: (active: {
        nodeKey: string | null;
        type: 'chapter' | 'paragraph' | null;
    }) => void;
}): null;
