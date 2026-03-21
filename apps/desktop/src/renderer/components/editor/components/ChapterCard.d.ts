import type { LiteLizardDocument } from '@litelizard/shared';
type Chapter = LiteLizardDocument['chapters'][number];
type Paragraph = LiteLizardDocument['paragraphs'][number];
interface Props {
    chapter: Chapter;
    index: number;
    paragraphs: Paragraph[];
}
export declare function ChapterCard({ chapter, index, paragraphs }: Props): import("react/jsx-runtime").JSX.Element;
export {};
