import type { LiteLizardDocument } from '@litelizard/shared';
import type { DocumentStructureInput } from '../types/documentStructure.js';
export declare function updateParagraphInDocument(document: LiteLizardDocument, paragraphId: string, text: string): LiteLizardDocument;
export declare function reorderParagraphsInDocument(document: LiteLizardDocument, orderedIds: string[]): LiteLizardDocument;
export declare function collectStaleParagraphs(document: LiteLizardDocument): import("@litelizard/shared").Paragraph[];
export declare function replaceDocumentStructureInDocument(document: LiteLizardDocument, input: DocumentStructureInput): LiteLizardDocument;
export declare function reorderChaptersInDocument(document: LiteLizardDocument, orderedIds: string[]): LiteLizardDocument;
export declare function deleteChapterFromDocument(document: LiteLizardDocument, chapterId: string): LiteLizardDocument;
export declare function replaceParagraphsInDocument(document: LiteLizardDocument, nextParagraphTexts: string[]): LiteLizardDocument;
