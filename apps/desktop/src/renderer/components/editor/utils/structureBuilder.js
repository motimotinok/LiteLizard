import { createChapterId, createParagraphId } from './ids.js';
export function toStructureSignature(snapshot) {
    return JSON.stringify({
        chapters: snapshot.chapters.map((chapter) => chapter.title),
        paragraphs: snapshot.paragraphs.map((paragraph) => [paragraph.chapterNodeKey, paragraph.text]),
    });
}
export function shouldSyncStructure(nextSignature, lastSyncedSignature, initialBaselineCaptured) {
    if (!initialBaselineCaptured) {
        return {
            shouldSync: false,
            nextBaselineCaptured: true,
        };
    }
    return {
        shouldSync: nextSignature !== lastSyncedSignature,
        nextBaselineCaptured: true,
    };
}
export function buildChapterInputs(snapshotChapters, chapterIdByNodeKey) {
    const nextMap = new Map(chapterIdByNodeKey);
    const usedIds = new Set(chapterIdByNodeKey.values());
    return snapshotChapters.map((chapter, index) => {
        let chapterId = nextMap.get(chapter.nodeKey);
        if (!chapterId) {
            do {
                chapterId = createChapterId();
            } while (usedIds.has(chapterId));
        }
        usedIds.add(chapterId);
        nextMap.set(chapter.nodeKey, chapterId);
        return {
            id: chapterId,
            title: chapter.title.trim() || `章${index + 1}`,
        };
    });
}
export function buildParagraphInputs(snapshotParagraphs, paragraphIdByNodeKey, chapterIdByNodeKey, fallbackChapterId) {
    const nextMap = new Map(paragraphIdByNodeKey);
    const usedIds = new Set(paragraphIdByNodeKey.values());
    return snapshotParagraphs.map((paragraph) => {
        let paragraphId = nextMap.get(paragraph.nodeKey);
        if (!paragraphId) {
            do {
                paragraphId = createParagraphId();
            } while (usedIds.has(paragraphId));
        }
        usedIds.add(paragraphId);
        nextMap.set(paragraph.nodeKey, paragraphId);
        return {
            id: paragraphId,
            chapterId: paragraph.chapterNodeKey
                ? (chapterIdByNodeKey.get(paragraph.chapterNodeKey) ?? fallbackChapterId)
                : fallbackChapterId,
            text: paragraph.text.length > 0 ? paragraph.text : ' ',
        };
    });
}
export function buildFallbackChapterNodeIndexes(document) {
    const countsByChapterId = new Map();
    document.paragraphs.forEach((paragraph) => {
        countsByChapterId.set(paragraph.chapterId, (countsByChapterId.get(paragraph.chapterId) ?? 0) + 1);
    });
    const indexes = [];
    let cursor = 0;
    document.chapters
        .slice()
        .sort((left, right) => left.order - right.order)
        .forEach((chapter) => {
        indexes.push(cursor);
        const paragraphCount = Math.max(1, countsByChapterId.get(chapter.id) ?? 0);
        cursor += 1 + paragraphCount;
    });
    return indexes;
}
export function buildMacroSummary(document) {
    const grouped = new Map();
    document.paragraphs
        .slice()
        .sort((left, right) => left.order - right.order)
        .forEach((paragraph) => {
        const list = grouped.get(paragraph.chapterId) ?? [];
        list.push(paragraph);
        grouped.set(paragraph.chapterId, list);
    });
    return document.chapters
        .slice()
        .sort((left, right) => left.order - right.order)
        .map((chapter) => {
        const paragraphs = grouped.get(chapter.id) ?? [];
        const preview = paragraphs[0]?.light.text.trim() ?? '';
        return {
            id: chapter.id,
            title: chapter.title,
            paragraphCount: paragraphs.length,
            preview: preview.length > 90 ? `${preview.slice(0, 90)}…` : preview || '（空の章）',
        };
    });
}
//# sourceMappingURL=structureBuilder.js.map