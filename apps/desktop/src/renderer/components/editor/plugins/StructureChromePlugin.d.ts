export declare function StructureChromePlugin({ chapterNodeKeys, paragraphNodeKeys, active, emptyParagraphNodeKeys, }: {
    chapterNodeKeys: string[];
    paragraphNodeKeys: string[];
    active: {
        nodeKey: string | null;
        type: 'chapter' | 'paragraph' | null;
    };
    emptyParagraphNodeKeys: Set<string>;
}): null;
