import type { LiteLizardDocument } from '@litelizard/shared';
import type { DocumentStructureInput } from '../../types/documentStructure.js';
interface Props {
    document: LiteLizardDocument;
    activeParagraphId: string | null;
    scrollRequest: {
        paragraphId: string;
        nonce: number;
    } | null;
    setActiveParagraphId: (id: string | null) => void;
    onSyncStructure: (input: DocumentStructureInput) => void;
    onReorderParagraphs?: (orderedIds: string[]) => void;
}
export declare function MicroEditorView({ document, activeParagraphId, scrollRequest, setActiveParagraphId, onSyncStructure, onReorderParagraphs, }: Props): import("react/jsx-runtime").JSX.Element;
export {};
