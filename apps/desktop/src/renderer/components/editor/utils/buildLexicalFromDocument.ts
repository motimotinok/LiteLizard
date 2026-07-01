import { $createParagraphNode, $createTextNode, $getRoot } from 'lexical';
import type { LiteLizardDocument } from '@litelizard/shared';

export function applyDocumentToLexicalRoot(
  document: LiteLizardDocument,
  chapterNodeKeySet: Set<string>,
): void {
  const root = $getRoot();
  root.clear();
  chapterNodeKeySet.clear();

  if (document.chapters.length === 0) {
    const chapter = $createParagraphNode();
    chapter.append($createTextNode('章1'));
    root.append(chapter);
    root.append($createParagraphNode());
    chapterNodeKeySet.add(chapter.getKey());
    return;
  }

  const chapterList = [...document.chapters].sort((left, right) => left.order - right.order);
  const paragraphsByChapterId = new Map<string, Array<{ text: string }>>();

  [...document.paragraphs]
    .sort((left, right) => left.order - right.order)
    .forEach((paragraph) => {
      const list = paragraphsByChapterId.get(paragraph.chapterId) ?? [];
      list.push({ text: paragraph.light.text });
      paragraphsByChapterId.set(paragraph.chapterId, list);
    });

  chapterList.forEach((chapter) => {
    const chapterNode = $createParagraphNode();
    chapterNode.append($createTextNode(chapter.title));
    root.append(chapterNode);
    chapterNodeKeySet.add(chapterNode.getKey());

    const chapterParagraphs = paragraphsByChapterId.get(chapter.id) ?? [];
    if (chapterParagraphs.length === 0) {
      root.append($createParagraphNode());
      return;
    }

    chapterParagraphs.forEach((paragraph) => {
      const paragraphNode = $createParagraphNode();
      if (paragraph.text.length > 0) {
        paragraphNode.append($createTextNode(paragraph.text));
      }
      root.append(paragraphNode);
    });
  });
}
