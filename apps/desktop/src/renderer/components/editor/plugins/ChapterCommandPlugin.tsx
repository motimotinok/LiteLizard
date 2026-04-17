import React, { useEffect } from 'react';
import {
  COMMAND_PRIORITY_HIGH,
  COMMAND_PRIORITY_NORMAL,
  KEY_BACKSPACE_COMMAND,
  KEY_ENTER_COMMAND,
  KEY_TAB_COMMAND,
  $createParagraphNode,
  $createTextNode,
  $getSelection,
  $isParagraphNode,
  $isRangeSelection,
  type LexicalNode,
  type ParagraphNode,
} from 'lexical';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';

/** 指定ノードより前に章ノードが存在するか（先頭章判定に使用）*/
function hasPrecedingChapterNode(node: LexicalNode, chapterNodeKeySet: Set<string>): boolean {
  let walker = node.getPreviousSibling();
  while (walker) {
    if ($isParagraphNode(walker) && chapterNodeKeySet.has(walker.getKey())) return true;
    walker = walker.getPreviousSibling();
  }
  return false;
}

export function deleteChapterNodeInLexical(
  topLevel: ParagraphNode,
  chapterNodeKeySetRef: React.MutableRefObject<Set<string>>,
) {
  // 前の章ノードを探す（後方走査）
  let prevChapterNode: ParagraphNode | null = null;
  let prevWalker = topLevel.getPreviousSibling();
  while (prevWalker) {
    if ($isParagraphNode(prevWalker) && chapterNodeKeySetRef.current.has(prevWalker.getKey())) {
      prevChapterNode = prevWalker;
      break;
    }
    prevWalker = prevWalker.getPreviousSibling();
  }

  // 削除前に参照を取得（topLevel 削除後に取れなくなるため）
  const insertAfterNode = topLevel.getPreviousSibling();

  if (prevChapterNode === null) {
    // 先頭章 or 唯一の章: 無題の章を前に挿入し、段落はそのまま残す
    const untitledChapter = $createParagraphNode();
    topLevel.insertBefore(untitledChapter);
    chapterNodeKeySetRef.current.add(untitledChapter.getKey());
    chapterNodeKeySetRef.current.delete(topLevel.getKey());
    topLevel.remove();
    untitledChapter.selectStart();
  } else {
    // 前の章あり: 章マーカーノードのみ削除（段落はそのまま → 前章に帰属）
    chapterNodeKeySetRef.current.delete(topLevel.getKey());
    topLevel.remove();
    if (insertAfterNode && $isParagraphNode(insertAfterNode)) {
      insertAfterNode.selectEnd();
    } else {
      prevChapterNode.selectEnd();
    }
  }
}

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
        // コマンドリスナーは Lexical の editor.update() ラッパー内で実行されるため、
        // $getSelection() で pending state（現在の DOM selection）を直接読める。
        // editor.getEditorState().read() はコミット済みの古い selection を返すため使わない。
        // また editor.update() を内部で呼ぶとキューに積まれ return より後に実行されるため使わない。
        const selection = $getSelection();
        if (!$isRangeSelection(selection) || !selection.isCollapsed()) return false;

        const topLevel = selection.anchor.getNode().getTopLevelElement();
        if (!topLevel || !$isParagraphNode(topLevel)) return false;

        if (selection.anchor.offset !== 0) return false;

        if (chapterNodeKeySetRef.current.has(topLevel.getKey())) {
          // 章タイトルノード上での Backspace
          if (!hasPrecedingChapterNode(topLevel, chapterNodeKeySetRef.current)) {
            event?.preventDefault();
            return true; // 先頭章タイトル → no-op
          }
          // 非先頭章タイトル → 格下げ
          event?.preventDefault();
          chapterNodeKeySetRef.current.delete(topLevel.getKey());
          return true;
        }

        // 本文段落の先頭で Backspace
        const prevSibling = topLevel.getPreviousSibling();
        if (!prevSibling || !$isParagraphNode(prevSibling)) return false;

        if (chapterNodeKeySetRef.current.has(prevSibling.getKey())) {
          event?.preventDefault();
          return true; // 章の最初の段落 → no-op
        }

        // 同一章内の2番目以降の段落 → 段落統合
        event?.preventDefault();
        const prevText = prevSibling.getTextContent();
        const currText = topLevel.getTextContent();
        const mergeOffset = prevText.length;
        const mergedText = prevText + currText;

        prevSibling.clear();
        topLevel.remove();

        if (mergedText.length > 0) {
          const mergedTextNode = $createTextNode(mergedText);
          prevSibling.append(mergedTextNode);
          mergedTextNode.select(mergeOffset, mergeOffset);
        } else {
          prevSibling.selectEnd();
        }

        return true;
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
