import { createChapterId, createParagraphId } from '@litelizard/shared/lzl/ids';
export function updateParagraphInDocument(document, paragraphId, text) {
    return {
        ...document,
        updatedAt: new Date().toISOString(),
        paragraphs: document.paragraphs.map((paragraph) => paragraph.id === paragraphId
            ? {
                ...paragraph,
                light: {
                    ...paragraph.light,
                    text,
                    charCount: text.length,
                },
                lizard: {
                    ...paragraph.lizard,
                    status: 'stale',
                },
            }
            : paragraph),
    };
}
export function reorderParagraphsInDocument(document, orderedIds) {
    const map = new Map(document.paragraphs.map((paragraph) => [paragraph.id, paragraph]));
    const paragraphs = orderedIds
        .map((id) => map.get(id))
        .filter((paragraph) => Boolean(paragraph))
        .map((paragraph, index) => ({
        ...paragraph,
        order: index + 1,
    }));
    return {
        ...document,
        updatedAt: new Date().toISOString(),
        paragraphs,
    };
}
export function collectStaleParagraphs(document) {
    return document.paragraphs.filter((paragraph) => paragraph.lizard.status === 'stale');
}
function normalizeChapters(chapters) {
    const filtered = chapters
        .map((chapter) => ({ id: chapter.id, title: chapter.title.trim() }))
        .filter((chapter) => chapter.title.length > 0);
    if (filtered.length === 0) {
        return [
            {
                id: createChapterId(),
                order: 1,
                title: '章1',
            },
        ];
    }
    return filtered.map((chapter, index) => ({
        id: chapter.id ?? createChapterId(),
        order: index + 1,
        title: chapter.title,
    }));
}
export function replaceDocumentStructureInDocument(document, input) {
    const chapters = normalizeChapters(input.chapters);
    const chapterIdSet = new Set(chapters.map((chapter) => chapter.id));
    const fallbackChapterId = chapters[0].id;
    const previousById = new Map(document.paragraphs.map((paragraph) => [paragraph.id, paragraph]));
    const normalizedParagraphs = (input.paragraphs.length > 0 ? input.paragraphs : [{ text: ' ', chapterId: fallbackChapterId }]).map((paragraph, index) => {
        const nextText = paragraph.text.length > 0 ? paragraph.text : ' ';
        const paragraphId = paragraph.id ?? createParagraphId();
        const chapterId = paragraph.chapterId && chapterIdSet.has(paragraph.chapterId) ? paragraph.chapterId : fallbackChapterId;
        const previous = previousById.get(paragraphId);
        const changed = !previous || previous.light.text !== nextText || previous.chapterId !== chapterId;
        return {
            id: paragraphId,
            chapterId,
            order: index + 1,
            light: {
                text: nextText,
                charCount: nextText.length,
            },
            lizard: changed ? { status: 'stale' } : previous.lizard,
        };
    });
    return {
        ...document,
        version: 2,
        updatedAt: new Date().toISOString(),
        chapters,
        paragraphs: normalizedParagraphs,
    };
}
export function reorderChaptersInDocument(document, orderedIds) {
    const map = new Map(document.chapters.map((c) => [c.id, c]));
    const chapters = orderedIds
        .map((id) => map.get(id))
        .filter((c) => Boolean(c))
        .map((c, index) => ({ ...c, order: index + 1 }));
    const grouped = new Map();
    document.paragraphs.forEach((p) => {
        const list = grouped.get(p.chapterId) ?? [];
        list.push(p);
        grouped.set(p.chapterId, list);
    });
    const paragraphs = [];
    chapters.forEach((chapter) => {
        const chapterParagraphs = (grouped.get(chapter.id) ?? [])
            .slice()
            .sort((a, b) => a.order - b.order);
        chapterParagraphs.forEach((p) => {
            paragraphs.push({ ...p, order: paragraphs.length + 1 });
        });
    });
    return {
        ...document,
        updatedAt: new Date().toISOString(),
        chapters,
        paragraphs,
    };
}
export function replaceParagraphsInDocument(document, nextParagraphTexts) {
    const chapterId = document.chapters[0]?.id ?? createChapterId();
    return replaceDocumentStructureInDocument(document, {
        chapters: document.chapters.length > 0 ? document.chapters : [{ id: chapterId, title: '章1' }],
        paragraphs: (nextParagraphTexts.length > 0 ? nextParagraphTexts : [' ']).map((text, index) => ({
            id: document.paragraphs[index]?.id,
            chapterId: document.paragraphs[index]?.chapterId ?? chapterId,
            text,
        })),
    });
}
//# sourceMappingURL=documentOps.js.map