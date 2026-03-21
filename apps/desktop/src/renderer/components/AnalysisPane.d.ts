import type { LiteLizardDocument } from '@litelizard/shared';
interface Props {
    document: LiteLizardDocument | null;
    activeParagraphId: string | null;
    onSetActiveParagraphId?: (id: string | null) => void;
    onReorderParagraphs?: (orderedIds: string[]) => void;
    onRequestScrollToParagraph?: (id: string) => void;
}
export declare function AnalysisPane({ document, activeParagraphId, onSetActiveParagraphId, onReorderParagraphs, onRequestScrollToParagraph, }: Props): import("react/jsx-runtime").JSX.Element;
export {};
