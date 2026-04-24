import React, { useEffect, useRef } from 'react';
import { REDO_COMMAND, UNDO_COMMAND, COMMAND_PRIORITY_CRITICAL } from 'lexical';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useAppStore } from '../../../store/useAppStore.js';
import type { UndoSnapshot } from '../../../store/useAppStore.js';

const TEXT_DEBOUNCE_MS = 500;

export function UndoPlugin({
  chapterNodeKeySetRef,
}: {
  chapterNodeKeySetRef: React.MutableRefObject<Set<string>>;
}) {
  const [editor] = useLexicalComposerContext();
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSnapshotRef = useRef<UndoSnapshot | null>(null);

  useEffect(() => {
    // テキスト編集のスナップショットキャプチャ (500ms debounce)
    // structural/undo/redo タグが付いた更新はスキップして debounce をクリアする
    const unregisterUpdate = editor.registerUpdateListener(({ editorState, tags }) => {
      if (tags.has('undo') || tags.has('redo') || tags.has('structural')) {
        if (debounceTimerRef.current !== null) {
          clearTimeout(debounceTimerRef.current);
          debounceTimerRef.current = null;
        }
        pendingSnapshotRef.current = null;
        return;
      }

      // 最初の更新のみスナップショット確保（タイピング開始直前の状態を保存）
      if (pendingSnapshotRef.current === null) {
        const doc = useAppStore.getState().document;
        if (doc) {
          pendingSnapshotRef.current = {
            lexicalStateJson: JSON.stringify(editorState.toJSON()),
            documentSnapshot: doc,
          };
        }
      }

      if (debounceTimerRef.current !== null) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        debounceTimerRef.current = null;
        if (pendingSnapshotRef.current) {
          useAppStore.getState().pushUndo(pendingSnapshotRef.current);
          pendingSnapshotRef.current = null;
        }
      }, TEXT_DEBOUNCE_MS);
    });

    // Ctrl+Z / Ctrl+Y のグローバルキーハンドラ
    const handleKeyDown = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      const key = e.key.toLowerCase();
      if (key === 'z' && !e.shiftKey) {
        e.preventDefault();
        editor.dispatchCommand(UNDO_COMMAND, undefined);
      } else if (key === 'y' || (key === 'z' && e.shiftKey)) {
        e.preventDefault();
        editor.dispatchCommand(REDO_COMMAND, undefined);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    const unregisterUndo = editor.registerCommand(
      UNDO_COMMAND,
      () => {
        const store = useAppStore.getState();
        if (store.undoStack.length === 0) return true;
        const doc = store.document;
        if (!doc) return true;

        const current: UndoSnapshot = {
          lexicalStateJson: JSON.stringify(editor.getEditorState().toJSON()),
          documentSnapshot: doc,
        };
        const target = store.undoWithCurrentSnapshot(current);
        if (!target) return true;

        if (debounceTimerRef.current !== null) {
          clearTimeout(debounceTimerRef.current);
          debounceTimerRef.current = null;
        }
        pendingSnapshotRef.current = null;

        // undo/redo 復元時の StructureStatePlugin による上書きを防ぐため 'undo' タグを付与
        chapterNodeKeySetRef.current.clear();
        editor.setEditorState(editor.parseEditorState(target.lexicalStateJson), { tag: 'undo' });
        store.restoreSnapshot(target);
        return true;
      },
      COMMAND_PRIORITY_CRITICAL,
    );

    const unregisterRedo = editor.registerCommand(
      REDO_COMMAND,
      () => {
        const store = useAppStore.getState();
        if (store.redoStack.length === 0) return true;
        const doc = store.document;
        if (!doc) return true;

        const current: UndoSnapshot = {
          lexicalStateJson: JSON.stringify(editor.getEditorState().toJSON()),
          documentSnapshot: doc,
        };
        const target = store.redoWithCurrentSnapshot(current);
        if (!target) return true;

        if (debounceTimerRef.current !== null) {
          clearTimeout(debounceTimerRef.current);
          debounceTimerRef.current = null;
        }
        pendingSnapshotRef.current = null;

        chapterNodeKeySetRef.current.clear();
        editor.setEditorState(editor.parseEditorState(target.lexicalStateJson), { tag: 'redo' });
        store.restoreSnapshot(target);
        return true;
      },
      COMMAND_PRIORITY_CRITICAL,
    );

    return () => {
      unregisterUpdate();
      unregisterUndo();
      unregisterRedo();
      window.removeEventListener('keydown', handleKeyDown);
      if (debounceTimerRef.current !== null) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [editor, chapterNodeKeySetRef]);

  return null;
}
