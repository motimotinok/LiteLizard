import React from 'react';
interface Props {
    chapterNodeKeys: string[];
    chapterNodeKeySetRef: React.MutableRefObject<Set<string>>;
    containerRef: React.RefObject<HTMLDivElement | null>;
}
export declare function ChapterDeletePlugin({ chapterNodeKeys, chapterNodeKeySetRef, containerRef }: Props): React.ReactPortal | null;
export {};
