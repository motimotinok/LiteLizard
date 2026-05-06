---
status: todo
started_at:
completed_at:
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

- [ ] 段落 DnD 並び替えを Undo/Redo できる
- [ ] 章 DnD 並び替えを Undo/Redo できる
- [ ] Undo/Redo 後に document の章順・段落順・chapterId が整合している
- [ ] Undo/Redo 後の自動保存で `.lzl` が壊れない
- [ ] 既存のテキスト編集、章削除、段落統合の Undo/Redo が壊れていない

## 検証方法

- [ ] 関連する既存テストを確認する
- [ ] 必要なテストを追加または更新する
- [ ] `pnpm -w lint`
- [ ] `pnpm -w test`
- [ ] `pnpm -w build`

## 完了メモ

未着手。

## 元 WBS

- R-15 DnD 並び替えの Undo 対応
