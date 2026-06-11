---
status: done
started_at: 2026-05-06T14:51:30+09:00
completed_at: 2026-05-06T14:53:12+09:00
---

# personaMode の .lzl 読み込み時挙動を現行仕様に合わせる

## 背景

GitHub Issue #59 では、`.lzl` 変換時に `personaMode` が `'friendly'` にハードコードされており、`.lzl` を再読み込みするたびに persona がリセットされることが指摘されていた。

現在は Reading Agent が新しい読者選択の正規入力であり、`personaMode` は既存 `.lzl` / analysis 互換のために残す位置づけになっている。そのため、このチケットでは `personaMode` を保存形式として拡張するかではなく、現行の Reading Agent 仕様と互換目的に照らして、`.lzl` 読み込み時の挙動を破綻しない形に整える。

## ゴール

`.lzl` 再読み込み時の `personaMode` の扱いが現行仕様と整合し、不要な読者モードのリセットや仕様の曖昧さが残らない。

## スコープ

- `packages/shared/src/lzl/converter.ts` の `personaMode` ハードコードを確認する
- `docs/specs/reading-agent.md` と `docs/decisions.md` の `personaMode` 互換方針を確認する
- 現行方針に沿って、必要なら `personaMode` の既定値や変換ロジックを修正する
- `.lzl` に `personaMode` を新規永続化しない方針にする場合は、その理由が仕様に明記されているか確認し、不足があれば追記する
- 必要に応じて converter / serializer 周辺のテストを追加または更新する

## 非ゴール

- Reading Agent 仕様の大規模変更
- `.lzl` フォーマットの大規模マイグレーション
- 新しい読者選択 UI の実装
- 既存の保存済み analysis 履歴のマイグレーション
- GitHub Issue 運用、WBS、agent-ready ラベル運用への接続

## 受け入れ条件

- [x] `.lzl` 読み込み時の `personaMode` 既定値が現行仕様と矛盾していない
- [x] `personaMode` を互換目的で残す方針と、Reading Agent を正規入力にする方針が壊れていない
- [x] `.lzl` に `personaMode` を保存するかどうかの扱いが仕様または decision 上で明確になっている
- [x] converter / serializer 周辺の既存テストが現行方針と整合している
- [x] 既存 `.lzl` の読み込みが壊れていない

## 検証方法

- [x] 関連する既存テストを確認する
- [x] 必要なテストを追加または更新する
- [x] `pnpm -w lint`
- [x] `pnpm -w test`
- [x] `pnpm -w build`

## 完了メモ

`packages/shared/src/lzl/converter.ts` の `.lzl` 変換時 `personaMode` 既定値を `friendly` から `general-reader` に変更した。`.lzl` v1 には `personaMode` を新規保存せず、読者選択の復元は active Reading Agent で扱う方針を `docs/specs/reading-agent.md` に追記した。

追加検証として `packages/shared/src/lzl/converter.test.ts` を追加し、変換時の互換既定値と章・段落順序を固定した。

実行した検証:
- `pnpm --filter @litelizard/shared test -- converter`
- `pnpm --filter @litelizard/shared test`
- `pnpm -w lint`
- `pnpm -w test`
- `pnpm -w build`

残課題なし。

## 元 Issue

- #59 personaMode が 'friendly' にハードコード（lzl 再読み込みでリセット）
- https://github.com/motimotinok/LiteLizard/issues/59
