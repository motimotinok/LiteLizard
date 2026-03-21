import type { LiteLizardDocument } from '@litelizard/shared';
import type { ParagraphStructureInput } from '../../../types/documentStructure.js';
export interface StructureSnapshot {
    chapters: Array<{
        nodeKey: string;
        title: string;
    }>;
    paragraphs: Array<{
        nodeKey: string;
        chapterNodeKey: string | null;
        text: string;
    }>;
}
export declare function toStructureSignature(snapshot: StructureSnapshot): string;
export declare function shouldSyncStructure(nextSignature: string, lastSyncedSignature: string, initialBaselineCaptured: boolean): {
    shouldSync: boolean;
    nextBaselineCaptured: boolean;
};
export declare function buildChapterInputs(snapshotChapters: StructureSnapshot['chapters'], chapterIdByNodeKey: ReadonlyMap<string, string>): Array<{
    id: string;
    title: string;
}>;
export declare function buildParagraphInputs(snapshotParagraphs: StructureSnapshot['paragraphs'], paragraphIdByNodeKey: ReadonlyMap<string, string>, chapterIdByNodeKey: ReadonlyMap<string, string>, fallbackChapterId: string | undefined): Array<ParagraphStructureInput & {
    id: string;
}>;
export declare function buildFallbackChapterNodeIndexes(document: LiteLizardDocument): number[];
export declare function buildMacroSummary(document: LiteLizardDocument): {
    id: string;
    title: string;
    paragraphCount: number;
    preview: string;
}[];
