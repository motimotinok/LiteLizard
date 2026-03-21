import type { LiteLizardDocument } from '@litelizard/shared';
import type { DocumentStructureInput } from '../../types/documentStructure.js';
interface Props {
    isExpanded: boolean;
    document: LiteLizardDocument | null;
    dirty: boolean;
    viewScale: 'micro' | 'macro';
    activeParagraphId: string | null;
    scrollRequest: {
        paragraphId: string;
        nonce: number;
    } | null;
    setActiveParagraphId: (id: string | null) => void;
    onSetViewScale: (viewScale: 'micro' | 'macro') => void;
    onSyncStructure: (input: DocumentStructureInput) => void;
    onReorderParagraphs?: (orderedIds: string[]) => void;
    onReorderChapters?: (orderedIds: string[]) => void;
    onCreateEssay: () => void;
    onOpenFolder: () => void;
}
export declare function EditorPane({ isExpanded, document, dirty, viewScale, activeParagraphId, scrollRequest, setActiveParagraphId, onSetViewScale, onSyncStructure, onReorderParagraphs, onReorderChapters, onCreateEssay, onOpenFolder, }: Props): import("react/jsx-runtime").JSX.Element;
export {};
