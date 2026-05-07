---
status: done
started_at: 2026-05-06T20:30:00+09:00
completed_at: 2026-05-06T20:25:00+09:00
---

# DnD 並び替えを Undo 対象にする

## 背景

WBS R-15 では、DnD 並び替えの Undo 対応が未完了になっている。`docs/specs/undo-redo.md` では、章・段落の DnD 並び替えも構造操作として Undo/Redo 対象にする方針が定義されている。

## ゴール

段落または章を DnD で並び替えた直後に Undo すると、並び替え前の構造へ戻せる。

## スコープ

- `DragHandlePlugin.tsx`、`MacroView.tsx`、`useAppStore.ts` の DnD 並び替え処理を確認する
- DnD 確定直前に `pushUndo` へ Lexical state と document snapshot を保存する
- Undo/Redo 後に Lexical 表示、Zustand document、自動保存キューが整合することを確認する
- 段落 DnD と章 DnD の両方を対象にする

## 非ゴール

- DnD 操作 UX の大幅変更
- ファイル移動 DnD の Undo
- 保存済みファイル履歴からの復元機能
- Undo/Redo スタック設計の全面変更

## 受け入れ条件

- [x] 段落 DnD 並び替えを Undo/Redo できる
- [x] 章 DnD 並び替えを Undo/Redo できる
- [x] Undo/Redo 後に document の章順・段落順・chapterId が整合している
- [x] Undo/Redo 後の自動保存で `.lzl` が壊れない
- [x] 既存のテキスト編集、章削除、段落統合の Undo/Redo が壊れていない

## 検証方法

- [x] 関連する既存テストを確認する
- [x] 必要なテストを追加または更新する
- [x] `pnpm -w lint`
- [x] `pnpm -w test`
- [x] `pnpm -w build`

## 完了メモ

- `apps/desktop/src/renderer/components/editor/plugins/DragHandlePlugin.tsx` の `useDndMonitor.onDragEnd` で `editor.update` 直前に `useAppStore.pushUndo({ lexicalStateJson, documentSnapshot })` し、`tag: 'structural'` で UndoPlugin の auto-snapshot 重複を防いだ。既存 `ChapterDeletePlugin` と同じパターン。
- `apps/desktop/src/renderer/components/editor/MacroView.tsx` の `handleDragEnd` では `pushUndo({ documentSnapshot })` のみ（macro view 中は Lexical 未 mount）。同コンポーネントに macro 専用の Ctrl+Z / Ctrl+Y キーハンドラを追加し、`INPUT` / `TEXTAREA` / `contentEditable` フォーカス時はネイティブ Undo に譲るガードを入れた。
- `apps/desktop/src/renderer/store/useAppStore.ts` の `UndoSnapshot.lexicalStateJson` を optional に変更。
- `apps/desktop/src/renderer/components/editor/utils/buildLexicalFromDocument.ts` を新設し、`MicroEditorView.initialConfig.editorState` と Undo 時の Lexical 再構築で同一ロジックを共有。`UndoPlugin` の `applySnapshotToEditor` ヘルパーで lexicalStateJson の有無に応じて `setEditorState` と再構築を切り替える。
- `apps/desktop/src/renderer/store/useAppStore.test.ts` に「段落 DnD undo で並び順復元」「章 DnD undo で chapterId 整合」「undo→redo 往復」「lexicalStateJson 省略スナップショットでも undo/redo 可能」の 4 ケースを追加。既存 19 件は不変（207 件全合格）。
- 検証: `pnpm -w lint` / `pnpm -w test`（207/207）/ `pnpm -w build` 成功。
- 残課題: Electron 上での手動 DnD → Ctrl+Z → 自動保存の最終確認は未実施（チケット範囲ではロジックテストで代替）。Undo 後の analysis 履歴は restoreSnapshot 仕様により managed document でリセットされるが、これは既存挙動で本チケットの非ゴール。

## 元 WBS

- R-15 DnD 並び替えの Undo 対応
