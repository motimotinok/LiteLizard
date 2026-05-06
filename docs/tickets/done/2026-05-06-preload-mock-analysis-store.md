---
status: todo
started_at:
completed_at:
---

# preload モック解析ストアのステート管理を整える

## 背景

GitHub Issue #65 では、`preloadMockApi.ts` の `loadAnalysis` / `saveAnalysisResult` / `createAnalysisGeneration` が解析結果の世代やパターンを保持できず、Electron dev + mock モードで解析 UI の回帰確認がしづらいことが指摘されていた。

現在のコードでは一部または全部が実装済みの可能性があるため、このチケットではまず現行実装とテストを確認し、不足があれば最小限の補完を行う。

## ゴール

mock モードでも解析結果の保存、読み込み、世代作成がインメモリで状態を持ち、解析 UI のパターン表示や世代切り替えを確認できる。

## スコープ

- `apps/desktop/src/preload/preloadMockApi.ts` の `loadAnalysis` / `saveAnalysisResult` / `createAnalysisGeneration` の現状確認
- `createMockPreloadApi` 内のインメモリ解析ストアが `documentId` ごとに世代と段落パターンを保持できることの確認
- 不足している場合は、既存の main 側 analysis store の型と挙動に沿って mock 実装を補完する
- 必要に応じて `apps/desktop/src/preload/preloadMockApi.test.ts` に回帰テストを追加または更新する

## 非ゴール

- main 側の永続化ストア実装の変更
- 解析ファイル形式の変更
- renderer の解析 UI デザイン変更
- GitHub Issue 運用、WBS、agent-ready ラベル運用への接続

## 受け入れ条件

- [ ] `loadAnalysis` が保存済みの解析ファイルを `documentId` ごとに返せる
- [ ] `saveAnalysisResult` が段落ごとの `patterns` を蓄積できる
- [ ] `createAnalysisGeneration` が世代番号をインクリメントし、新しい世代を作成できる
- [ ] mock モードの解析保存・読み込みに関するテストが存在し、現行仕様と整合している
- [ ] 既存の解析実行、履歴保存、Reading Agent 適用が壊れていない

## 検証方法

- [ ] 関連する既存テストを確認する
- [ ] 必要なテストを追加または更新する
- [ ] `pnpm -w lint`
- [ ] `pnpm -w test`
- [ ] `pnpm -w build`

## 完了メモ

未着手。

## 元 Issue

- #65 preload モックに解析ストア API のステート管理を追加
- https://github.com/motimotinok/LiteLizard/issues/65
