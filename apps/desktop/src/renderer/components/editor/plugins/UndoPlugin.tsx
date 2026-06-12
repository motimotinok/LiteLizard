import React, { useEffect, useRef } from 'react';
import { REDO_COMMAND, UNDO_COMMAND, COMMAND_PRIORITY_CRITICAL, type LexicalEditor } from 'lexical';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useAppStore } from '../../../store/useAppStore.js';
import type { UndoSnapshot } from '../../../store/useAppStore.js';
import { applyDocumentToLexicalRoot } from '../utils/buildLexicalFromDocument.js';

function applySnapshotToEditor(
  editor: LexicalEditor,
  snapshot: UndoSnapshot,
  chapterNodeKeySetRef: React.MutableRefObject<Set<string>>,
  tag: 'undo' | 'redo',
) {
  chapterNodeKeySetRef.current.clear();
  if (snapshot.lexicalStateJson) {
    editor.setEditorState(editor.parseEditorState(snapshot.lexicalStateJson), { tag });
    return;
  }
  // DnD 並び替えなど editor が一時的に存在しないタイミングで保存されたスナップショットは
  // documentSnapshot から Lexical を再構築する。
  editor.update(
    () => {
      applyDocumentToLexicalRoot(snapshot.documentSnapshot, chapterNodeKeySetRef.current);
    },
    { tag },
  );
}

const TEXT_DEBOUNCE_MS = 500;

export function commitPendingUndoSnapshot(
  debounceTimerRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>,
  pendingSnapshotRef: React.MutableRefObject<UndoSnapshot | null>,
  pushUndo: (snapshot: UndoSnapshot) => void,
) {
  if (debounceTimerRef.current !== null) {
    clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = null;
  }
  if (pendingSnapshotRef.current) {
    pushUndo(pendingSnapshotRef.current);
    pendingSnapshotRef.current = null;
  }
}

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
    const unregisterUpdate = editor.registerUpdateListener(({ prevEditorState, tags }) => {
      if (tags.has('undo') || tags.has('redo') || tags.has('structural')) {
        if (debounceTimerRef.current !== null) {
          clearTimeout(debounceTimerRef.current);
          debounceTimerRef.current = null;
        }
        pendingSnapshotRef.current = null;
        return;
      }

      const store = useAppStore.getState();

      // 最初の更新のみ「変更直前」状態をスナップショット確保
      // prevEditorState = この更新が適用される前の状態 = Undo で戻るべき状態
      if (pendingSnapshotRef.current === null) {
        const doc = store.document;
        if (doc) {
          pendingSnapshotRef.current = {
            lexicalStateJson: JSON.stringify(prevEditorState.toJSON()),
            documentSnapshot: doc,
          };
          // 編集開始時点で Redo 履歴を即時クリア（500ms 待ちだと Ctrl+Y で古い Redo が実行される）
          store.clearRedoStack();
        }
      }

      if (debounceTimerRef.current !== null) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        commitPendingUndoSnapshot(
          debounceTimerRef,
          pendingSnapshotRef,
          useAppStore.getState().pushUndo,
        );
      }, TEXT_DEBOUNCE_MS);
    });

    // Ctrl+Z / Ctrl+Y のグローバルキーハンドラ
    // エディタのルート要素にフォーカスがある場合のみ処理する（入力欄での誤作動を防ぐ）
    const handleKeyDown = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      const rootElement = editor.getRootElement();
      if (!rootElement || !rootElement.contains(document.activeElement)) return;
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
        commitPendingUndoSnapshot(
          debounceTimerRef,
          pendingSnapshotRef,
          useAppStore.getState().pushUndo,
        );
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
        applySnapshotToEditor(editor, target, chapterNodeKeySetRef, 'undo');
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

        applySnapshotToEditor(editor, target, chapterNodeKeySetRef, 'redo');
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
