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
export function deleteChapterFromDocument(document, chapterId) {
    const sorted = [...document.chapters].sort((a, b) => a.order - b.order);
    const chapterIndex = sorted.findIndex((c) => c.id === chapterId);
    if (chapterIndex === -1)
        return document;
    const chapterParagraphs = document.paragraphs
        .filter((p) => p.chapterId === chapterId)
        .sort((a, b) => a.order - b.order);
    const remainingChapters = sorted.filter((c) => c.id !== chapterId);
    let newChapters;
    let newParagraphs;
    if (chapterIndex === 0) {
        if (chapterParagraphs.length === 0 && remainingChapters.length === 0) {
            // 唯一の章かつ空 → 無題の章だけ残す
            return {
                ...document,
                updatedAt: new Date().toISOString(),
                chapters: [{ id: createChapterId(), order: 1, title: '' }],
                paragraphs: [],
            };
        }
        if (chapterParagraphs.length === 0) {
            // 空の先頭章 → 単純に除去して re-order
            newChapters = remainingChapters.map((c, i) => ({ ...c, order: i + 1 }));
            newParagraphs = document.paragraphs.filter((p) => p.chapterId !== chapterId);
        }
        else {
            // 先頭章かつ段落あり → 無題の章を生成して段落を引き継ぐ（stale 化）
            const newId = createChapterId();
            newChapters = [
                { id: newId, order: 1, title: '' },
                ...remainingChapters.map((c, i) => ({ ...c, order: i + 2 })),
            ];
            newParagraphs = [
                ...chapterParagraphs.map((p) => ({
                    ...p,
                    chapterId: newId,
                    lizard: { status: 'stale' },
                })),
                ...document.paragraphs.filter((p) => p.chapterId !== chapterId),
            ];
        }
    }
    else {
        // 非先頭章の削除 → 前の章の末尾に段落を吸収（stale 化）
        const prevChapter = sorted[chapterIndex - 1];
        const prevMaxOrder = Math.max(0, ...document.paragraphs.filter((p) => p.chapterId === prevChapter.id).map((p) => p.order));
        const movedParagraphs = chapterParagraphs.map((p, i) => ({
            ...p,
            chapterId: prevChapter.id,
            order: prevMaxOrder + i + 1,
            lizard: { status: 'stale' },
        }));
        newChapters = remainingChapters.map((c, i) => ({ ...c, order: i + 1 }));
        newParagraphs = [
            ...document.paragraphs.filter((p) => p.chapterId !== chapterId),
            ...movedParagraphs,
        ];
    }
    // 段落配列を章順序に従って全体再正規化（グローバル order を振り直す）
    const grouped = new Map();
    newParagraphs.forEach((p) => {
        const list = grouped.get(p.chapterId) ?? [];
        list.push(p);
        grouped.set(p.chapterId, list);
    });
    const normalizedParagraphs = [];
    newChapters.forEach((chapter) => {
        const members = (grouped.get(chapter.id) ?? []).slice().sort((a, b) => a.order - b.order);
        members.forEach((p) => {
            normalizedParagraphs.push({ ...p, order: normalizedParagraphs.length + 1 });
        });
    });
    return {
        ...document,
        updatedAt: new Date().toISOString(),
        chapters: newChapters,
        paragraphs: normalizedParagraphs,
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