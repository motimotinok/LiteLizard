import React, { useEffect } from 'react';
import {
  COMMAND_PRIORITY_HIGH,
  COMMAND_PRIORITY_NORMAL,
  KEY_BACKSPACE_COMMAND,
  KEY_ENTER_COMMAND,
  KEY_TAB_COMMAND,
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isParagraphNode,
  $isRangeSelection,
  type ParagraphNode,
} from 'lexical';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';

function findCurrentChapterNode(topLevel: ParagraphNode | null, chapterNodeKeySet: Set<string>): ParagraphNode | null {
  if (!topLevel) {
    return null;
  }

  if (chapterNodeKeySet.has(topLevel.getKey())) {
    return topLevel;
  }

  let current = topLevel.getPreviousSibling();
  while (current) {
    if ($isParagraphNode(current) && chapterNodeKeySet.has(current.getKey())) {
      return current;
    }
    current = current.getPreviousSibling();
  }

  return null;
}

export function ChapterCommandPlugin({
  chapterNodeKeySetRef,
}: {
  chapterNodeKeySetRef: React.MutableRefObject<Set<string>>;
}) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    const unregisterEnter = editor.registerCommand(
      KEY_ENTER_COMMAND,
      (event) => {
        if (!event) {
          return false;
        }

        const hasModifier = event.metaKey || event.ctrlKey;

        if (hasModifier) {
          event.preventDefault();
          editor.update(() => {
            const selection = $getSelection();
            if (!$isRangeSelection(selection)) {
              return;
            }

            const topLevel = selection.anchor.getNode().getTopLevelElement();
            if (!topLevel || !$isParagraphNode(topLevel)) {
              return;
            }

            const chapterNode = findCurrentChapterNode(topLevel, chapterNodeKeySetRef.current);
            let insertAfter: ParagraphNode = topLevel;

            if (chapterNode) {
              insertAfter = chapterNode;
              let walker = chapterNode.getNextSibling();
              while (walker && !($isParagraphNode(walker) && chapterNodeKeySetRef.current.has(walker.getKey()))) {
                if ($isParagraphNode(walker)) {
                  insertAfter = walker;
                }
                walker = walker.getNextSibling();
              }
            }

            const chapterParagraph = $createParagraphNode();
            chapterParagraph.append($createTextNode(`章${chapterNodeKeySetRef.current.size + 1}`));
            const bodyParagraph = $createParagraphNode();

            insertAfter.insertAfter(chapterParagraph);
            chapterParagraph.insertAfter(bodyParagraph);
            chapterNodeKeySetRef.current.add(chapterParagraph.getKey());
            chapterParagraph.selectStart();
          });
          return true;
        }

        let handled = false;
        editor.update(() => {
          const selection = $getSelection();
          if (!$isRangeSelection(selection)) {
            return;
          }

          const topLevel = selection.anchor.getNode().getTopLevelElement();
          if (!topLevel || !$isParagraphNode(topLevel)) {
            return;
          }

          if (!chapterNodeKeySetRef.current.has(topLevel.getKey())) {
            return;
          }

          handled = true;
          event.preventDefault();

          const nextSibling = topLevel.getNextSibling();
          if (nextSibling && $isParagraphNode(nextSibling) && !chapterNodeKeySetRef.current.has(nextSibling.getKey())) {
            nextSibling.selectStart();
            return;
          }

          const paragraph = $createParagraphNode();
          topLevel.insertAfter(paragraph);
          paragraph.selectStart();
        });

        return handled;
      },
      COMMAND_PRIORITY_HIGH,
    );

    const unregisterTab = editor.registerCommand(
      KEY_TAB_COMMAND,
      (event) => {
        event?.preventDefault();
        return true;
      },
      COMMAND_PRIORITY_NORMAL,
    );

    const unregisterBackspace = editor.registerCommand(
      KEY_BACKSPACE_COMMAND,
      (event) => {
        let handled = false;

        editor.update(() => {
          const selection = $getSelection();
          if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
            return;
          }

          const topLevel = selection.anchor.getNode().getTopLevelElement();
          if (!topLevel || !$isParagraphNode(topLevel)) {
            return;
          }

          if (!chapterNodeKeySetRef.current.has(topLevel.getKey())) {
            return;
          }

          const isAtStart = selection.anchor.offset === 0;
          if (!isAtStart || topLevel.getTextContent().trim().length > 0) {
            return;
          }

          handled = true;
          event?.preventDefault();

          const paragraphsInChapter: ParagraphNode[] = [];
          let walker = topLevel.getNextSibling();
          while (walker && !($isParagraphNode(walker) && chapterNodeKeySetRef.current.has(walker.getKey()))) {
            if ($isParagraphNode(walker)) {
              paragraphsInChapter.push(walker);
            }
            walker = walker.getNextSibling();
          }

          const hasContent = paragraphsInChapter.some((node) => node.getTextContent().trim().length > 0);
          if (hasContent) {
            return;
          }

          const previous = topLevel.getPreviousSibling();
          paragraphsInChapter.forEach((node) => node.remove());
          chapterNodeKeySetRef.current.delete(topLevel.getKey());
          topLevel.remove();

          const root = $getRoot();
          const topParagraphs = root.getChildren().filter((node): node is ParagraphNode => $isParagraphNode(node));

          if (topParagraphs.length === 0) {
            const chapter = $createParagraphNode();
            chapter.append($createTextNode('章1'));
            const paragraph = $createParagraphNode();
            root.append(chapter, paragraph);
            chapterNodeKeySetRef.current = new Set([chapter.getKey()]);
            chapter.selectStart();
            return;
          }

          if (previous && $isParagraphNode(previous)) {
            previous.selectEnd();
          } else {
            topParagraphs[0].selectStart();
          }
        });

        return handled;
      },
      COMMAND_PRIORITY_HIGH,
    );

    return () => {
      unregisterEnter();
      unregisterTab();
      unregisterBackspace();
    };
  }, [chapterNodeKeySetRef, editor]);

  return null;
}
