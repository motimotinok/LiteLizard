import type { LiteLizardDocument } from '@litelizard/shared';
interface Props {
    document: LiteLizardDocument;
    onReorderChapters?: (orderedIds: string[]) => void;
    onDeleteChapter?: (chapterId: string) => void;
}
export declare function MacroView({ document, onReorderChapters, onDeleteChapter }: Props): import("react/jsx-runtime").JSX.Element;
export {};
