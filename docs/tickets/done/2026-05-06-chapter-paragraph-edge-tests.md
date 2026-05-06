---
status: done
started_at: 2026-05-06T14:30:00+09:00
completed_at: 2026-05-06T14:38:00+09:00
---

# 章削除・段落統合のエッジケーステストを整備する

## 背景

WBS T-04 では、章削除・段落統合のエッジケーステストが未完了になっている。仕様は `docs/specs/chapter-paragraph-ops.md` に定義済みで、R-01 / R-02 も完了しているため、テスト整備に進める状態である。

## ゴール

章削除と Backspace 段落統合の主要エッジケースがテストで保護されている。

## スコープ

- `docs/specs/chapter-paragraph-ops.md` のエッジケース表を確認する
- 章削除の通常ケース、先頭章、最後の1章、空章削除をテストする
- 同一章内 Backspace 段落統合と、章境界では統合しない挙動をテストする
- 既存テストの配置に合わせ、store / editor plugin / helper の適切な層にテストを追加する

## 非ゴール

- 章削除や段落統合の仕様変更
- UI デザイン変更
- DnD Undo 対応
- E2E テストの大規模追加

## 受け入れ条件

- [x] 章削除時に段落が前章へ吸収されるケースがテストされている
- [x] 先頭章または最後の1章削除時に無題章が残るケースがテストされている
- [x] 空章削除がテストされている
- [x] 同一章内 Backspace 段落統合がテストされている
- [x] 章境界を越えた Backspace 統合が起きないことがテストされている

## 検証方法

- [x] 関連する既存テストを確認する
- [x] 必要なテストを追加または更新する
- [x] `pnpm -w lint`
- [x] `pnpm -w test`
- [x] `pnpm -w build`

## 完了メモ

- store 層: `apps/desktop/src/renderer/store/documentOps.test.ts` に `deleteChapterFromDocument` の 8 ケースを追加（通常吸収＋order 振り直し、移動段落の stale 化、先頭非空章削除時の無題章生成、唯一章削除、空中間章削除、空先頭章削除、唯一かつ空の章削除、未知 ID の no-op）。
- editor 層: Backspace の判定とテキスト結合を `apps/desktop/src/renderer/components/editor/utils/backspaceMerge.ts` に純粋関数 `decideBackspaceAction` / `mergeAdjacentParagraphTexts` として切り出し、`backspaceMerge.test.ts` で 12 ケースを追加（非 collapsed / 非段落先頭での pass-through、先頭章タイトルの no-op、非先頭章タイトルの demote、章境界 no-op、同一章内 merge、テキスト結合と cursor 位置）。
- `ChapterCommandPlugin.tsx` は判定順序・undo push・Lexical 操作を変えずに上記 helper を呼ぶ最小リファクタに留めた。
- 検証: `pnpm -w lint` / `pnpm -w test`（desktop 178 件、shared 44 件、api 4 件）/ `pnpm -w build` がいずれも成功。
- 残課題: Lexical 上での実 DOM テストは Electron 起動 / `_electron` fixture が必要なため対象外（チケットのスコープ外）。Backspace 判定の helper は仕様の宣言的な定義として保護されているが、Lexical 内ノード操作（クリア・remove・select）の壊れは別途 E2E で守る必要がある。

## 元 WBS

- T-04 章削除・段落統合のエッジケーステスト
