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
  type LexicalNode,
  type ParagraphNode,
} from 'lexical';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useAppStore } from '../../../store/useAppStore.js';
import {
  decideBackspaceAction,
  mergeAdjacentParagraphTexts,
} from '../utils/backspaceMerge.js';

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
          const store = useAppStore.getState();
          const doc = store.document;
          if (doc) {
            store.pushUndo({
              lexicalStateJson: JSON.stringify(editor.getEditorState().toJSON()),
              documentSnapshot: doc,
            });
          }
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
          }, { tag: 'structural' });
          return true;
        }

        // 章ノード上の Enter かを事前確認（コマンドハンドラは implicit update 内で動作するため $getSelection() 使用可）
        const preCheckSel = $getSelection();
        const isOnChapterNode = $isRangeSelection(preCheckSel) && (() => {
          const tl = preCheckSel.anchor.getNode().getTopLevelElement();
          return Boolean(tl && $isParagraphNode(tl) && chapterNodeKeySetRef.current.has(tl.getKey()));
        })();

        if (isOnChapterNode) {
          const store = useAppStore.getState();
          const doc = store.document;
          if (doc) {
            store.pushUndo({
              lexicalStateJson: JSON.stringify(editor.getEditorState().toJSON()),
              documentSnapshot: doc,
            });
          }
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
        }, isOnChapterNode ? { tag: 'structural' } : undefined);

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
        if (!$isRangeSelection(selection)) return false;

        const topLevel = selection.anchor.getNode().getTopLevelElement();
        const topLevelIsParagraph = Boolean(topLevel && $isParagraphNode(topLevel));
        const topLevelParagraph = topLevelIsParagraph ? (topLevel as ParagraphNode) : null;
        const prevSibling = topLevelParagraph?.getPreviousSibling() ?? null;
        const prevIsParagraph = Boolean(prevSibling && $isParagraphNode(prevSibling));
        const prevParagraph = prevIsParagraph ? (prevSibling as ParagraphNode) : null;

        const decision = decideBackspaceAction({
          isCollapsed: selection.isCollapsed(),
          topLevelIsParagraph,
          anchorOffset: selection.anchor.offset,
          topLevelIsChapter: Boolean(
            topLevelParagraph && chapterNodeKeySetRef.current.has(topLevelParagraph.getKey()),
          ),
          hasPrecedingChapterNode: topLevelParagraph
            ? hasPrecedingChapterNode(topLevelParagraph, chapterNodeKeySetRef.current)
            : false,
          prevSiblingIsParagraph: prevIsParagraph,
          prevSiblingIsChapter: Boolean(
            prevParagraph && chapterNodeKeySetRef.current.has(prevParagraph.getKey()),
          ),
        });

        if (decision.kind === 'pass-through') return false;

        if (decision.kind === 'noop') {
          event?.preventDefault();
          return true;
        }

        if (decision.kind === 'demote-chapter') {
          event?.preventDefault();
          const demoteStore = useAppStore.getState();
          const demoteDoc = demoteStore.document;
          if (demoteDoc) {
            demoteStore.pushUndo({
              lexicalStateJson: JSON.stringify(editor.getEditorState().toJSON()),
              documentSnapshot: demoteDoc,
            });
          }
          const demoteKey = topLevelParagraph!.getKey();
          editor.update(() => {
            chapterNodeKeySetRef.current.delete(demoteKey);
          }, { tag: 'structural' });
          return true;
        }

        // merge-with-prev
        event?.preventDefault();
        const mergeStore = useAppStore.getState();
        const mergeDoc = mergeStore.document;
        if (mergeDoc) {
          mergeStore.pushUndo({
            lexicalStateJson: JSON.stringify(editor.getEditorState().toJSON()),
            documentSnapshot: mergeDoc,
          });
        }
        const prevSiblingKey = prevParagraph!.getKey();
        const topLevelKey = topLevelParagraph!.getKey();
        const prevText = prevParagraph!.getTextContent();
        const currText = topLevelParagraph!.getTextContent();
        const { mergedText, cursorOffset } = mergeAdjacentParagraphTexts(prevText, currText);
        editor.update(() => {
          const allNodes = $getRoot().getChildren().filter((n): n is ParagraphNode => $isParagraphNode(n));
          const prevNode = allNodes.find((n) => n.getKey() === prevSiblingKey);
          const currNode = allNodes.find((n) => n.getKey() === topLevelKey);
          if (!prevNode || !currNode) return;
          prevNode.clear();
          currNode.remove();
          if (mergedText.length > 0) {
            const mergedTextNode = $createTextNode(mergedText);
            prevNode.append(mergedTextNode);
            mergedTextNode.select(cursorOffset, cursorOffset);
          } else {
            prevNode.selectEnd();
          }
        }, { tag: 'structural' });

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
