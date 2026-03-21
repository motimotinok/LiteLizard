import type { LiteLizardDocument } from '@litelizard/shared';
interface Props {
    document: LiteLizardDocument;
    onReorderChapters?: (orderedIds: string[]) => void;
}
export declare function MacroView({ document, onReorderChapters }: Props): import("react/jsx-runtime").JSX.Element;
export {};
