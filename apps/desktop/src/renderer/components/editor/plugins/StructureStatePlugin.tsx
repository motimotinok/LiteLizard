import React, { useCallback, useEffect, useRef } from 'react';
import { $getRoot, $getSelection, $isParagraphNode, $isRangeSelection, type EditorState } from 'lexical';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  deriveStructureSnapshotFromTopLevelParagraphs,
  type StructureSnapshot,
} from '../utils/structureBuilder.js';

export function StructureStatePlugin({
  chapterNodeKeySetRef,
  fallbackChapterNodeIndexes,
  onSnapshot,
  onActiveElement,
}: {
  chapterNodeKeySetRef: React.MutableRefObject<Set<string>>;
  fallbackChapterNodeIndexes: number[];
  onSnapshot: (snapshot: StructureSnapshot, emptyParagraphNodeKeys: Set<string>) => void;
  onActiveElement: (active: { nodeKey: string | null; type: 'chapter' | 'paragraph' | null }) => void;
}) {
  const [editor] = useLexicalComposerContext();
  const skipNextRef = useRef(false);

  const emitSnapshot = useCallback(
    (editorState: EditorState) => {
      editorState.read(() => {
        const root = $getRoot();
        const topLevelParagraphs = root
          .getChildren()
          .filter($isParagraphNode)
          .map((node) => ({
            nodeKey: node.getKey(),
            text: node.getTextContent(),
          }));

        const { snapshot, emptyParagraphNodeKeys, chapterNodeKeySet } = deriveStructureSnapshotFromTopLevelParagraphs({
          topLevelParagraphs,
          existingChapterNodeKeys: chapterNodeKeySetRef.current,
          fallbackChapterNodeIndexes,
        });

        chapterNodeKeySetRef.current = chapterNodeKeySet;
        onSnapshot(snapshot, emptyParagraphNodeKeys);

        const selection = $getSelection();
        if (!$isRangeSelection(selection)) {
          onActiveElement({ nodeKey: null, type: null });
          return;
        }

        const topLevel = selection.anchor.getNode().getTopLevelElement();
        if (!topLevel || !$isParagraphNode(topLevel)) {
          onActiveElement({ nodeKey: null, type: null });
          return;
        }

        if (chapterNodeKeySet.has(topLevel.getKey())) {
          onActiveElement({ nodeKey: topLevel.getKey(), type: 'chapter' });
          return;
        }

        onActiveElement({ nodeKey: topLevel.getKey(), type: 'paragraph' });
      });
    },
    [chapterNodeKeySetRef, fallbackChapterNodeIndexes, onActiveElement, onSnapshot],
  );

  useEffect(() => {
    emitSnapshot(editor.getEditorState());

    return editor.registerUpdateListener(({ editorState, tags }) => {
      // undo/redo 復元直後は store の document が既に復元済みのため同期をスキップ
      if (tags.has('undo') || tags.has('redo')) {
        skipNextRef.current = true;
        return;
      }
      // undo/redo 直後の最初のタグなし更新もスキップ（nodeKey 再構築で同期が走るのを防ぐ）
      if (skipNextRef.current) {
        skipNextRef.current = false;
        return;
      }
      emitSnapshot(editorState);
    });
  }, [editor, emitSnapshot]);

  return null;
}
