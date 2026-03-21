export function mapParagraphIdsByNodeKeys(currentNodeKeys, nextNodeKeys, paragraphIds, previousKeyToId = new Map()) {
    const keyToId = new Map(previousKeyToId);
    if (currentNodeKeys.length === paragraphIds.length) {
        keyToId.clear();
        currentNodeKeys.forEach((nodeKey, index) => {
            const paragraphId = paragraphIds[index];
            if (paragraphId) {
                keyToId.set(nodeKey, paragraphId);
            }
        });
    }
    const rankById = new Map();
    nextNodeKeys.forEach((nodeKey, index) => {
        const paragraphId = keyToId.get(nodeKey);
        if (paragraphId && !rankById.has(paragraphId)) {
            rankById.set(paragraphId, index);
        }
    });
    if (rankById.size === 0) {
        return null;
    }
    return [...paragraphIds]
        .map((paragraphId, index) => ({
        paragraphId,
        sortRank: rankById.get(paragraphId) ?? nextNodeKeys.length + index,
    }))
        .sort((left, right) => left.sortRank - right.sortRank)
        .map((item) => item.paragraphId);
}
export function mergeParagraphIdByNodeKey(previousKeyToId, currentNodeKeys, paragraphIds) {
    if (currentNodeKeys.length !== paragraphIds.length) {
        return new Map(previousKeyToId);
    }
    const paragraphIdSet = new Set(paragraphIds);
    const next = new Map();
    currentNodeKeys.forEach((nodeKey, index) => {
        const previousParagraphId = previousKeyToId.get(nodeKey);
        if (previousParagraphId && paragraphIdSet.has(previousParagraphId)) {
            next.set(nodeKey, previousParagraphId);
            return;
        }
        const paragraphId = paragraphIds[index];
        if (paragraphId) {
            next.set(nodeKey, paragraphId);
        }
    });
    return next;
}
export function mergeChapterIdByNodeKey(previousKeyToId, currentNodeKeys, chapterIds) {
    if (currentNodeKeys.length !== chapterIds.length) {
        return new Map(previousKeyToId);
    }
    const chapterIdSet = new Set(chapterIds);
    const next = new Map();
    currentNodeKeys.forEach((nodeKey, index) => {
        const previousChapterId = previousKeyToId.get(nodeKey);
        if (previousChapterId && chapterIdSet.has(previousChapterId)) {
            next.set(nodeKey, previousChapterId);
            return;
        }
        const chapterId = chapterIds[index];
        if (chapterId) {
            next.set(nodeKey, chapterId);
        }
    });
    return next;
}
//# sourceMappingURL=nodeKeyMapping.js.map