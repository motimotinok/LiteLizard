export declare function mapParagraphIdsByNodeKeys(currentNodeKeys: string[], nextNodeKeys: string[], paragraphIds: string[], previousKeyToId?: ReadonlyMap<string, string>): string[] | null;
export declare function mergeParagraphIdByNodeKey(previousKeyToId: ReadonlyMap<string, string>, currentNodeKeys: string[], paragraphIds: string[]): Map<string, string>;
export declare function mergeChapterIdByNodeKey(previousKeyToId: ReadonlyMap<string, string>, currentNodeKeys: string[], chapterIds: string[]): Map<string, string>;
