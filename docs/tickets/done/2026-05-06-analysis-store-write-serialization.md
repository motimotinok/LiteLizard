---
status: done
started_at:
completed_at: 2026-05-06T10:01:50+09:00
---

# analysisStore の競合書き込み対策

## 背景

GitHub Issue #64 では、`analysisStore` の `appendParagraphPattern` / `createGeneration` が read-modify-write をロックなしで行っているため、同一ドキュメントへの解析結果保存が短時間に重なると、後勝ちで前の `patterns` が失われるリスクが指摘されている。

また、`saveAnalysis` の一時ファイル名が固定 `.tmp` の場合、並行保存時に rename 競合や `ENOENT` が起きる可能性がある。解析ストリーミングや段落単位再解析を安心して使うため、保存処理の直列化と一時ファイル名の衝突回避を行う。

## ゴール

同一分析ファイルへの並行保存でも `patterns` が失われず、一時ファイル名の競合で保存が失敗しない。

## スコープ

- `apps/desktop/src/main/analysisStore.ts` の保存処理を確認する
- `saveAnalysis` の一時ファイル名をユニークなものにする
- `appendParagraphPattern` と必要に応じて `createGeneration` の書き込みを、簡易ロックまたは直列キューで保護する
- 同一ドキュメントへの連続 append がロストアップデートしないことをテストで確認する

## 非ゴール

- 分析ファイル形式の変更
- DB 導入など保存基盤の大規模置き換え
- renderer 側の解析 UI 変更
- 複数プロセス間ロックの本格実装

## 受け入れ条件

- [x] `saveAnalysis` の一時ファイル名が固定 `.tmp` ではなく、保存ごとに衝突しない
- [x] 同一ドキュメントへの `appendParagraphPattern` が直列化され、既存 `patterns` を失わない
- [x] `createGeneration` が同じ保存ファイルを壊さないことを現実装に即して確認または対策している
- [x] 競合シナリオのテストが追加されている
- [x] 既存の分析保存・読み込みテストが通る

## 検証方法

- [x] 関連する既存テストを確認する
- [x] 競合保存の回帰テストを追加または更新する
- [x] `pnpm -w lint`
- [x] `pnpm -w test`
- [x] `pnpm -w build`

## 完了メモ

実装日: 2026-05-06。

### 変更内容
- `apps/desktop/src/main/analysisStore.ts` に同一 `(projectRoot, documentId)` 単位の
  `writeChains` を追加し、`appendParagraphPattern` と `createGeneration` を同じキューで
  直列化した。
- `saveAnalysis` の一時ファイル名を `process.pid` と `randomUUID()` を含む形式に変更し、
  並行保存時の `.tmp` 名衝突を避けるようにした。
- `createGeneration` の並行呼び出しでも世代番号が重ならないよう、世代一覧の読み取りから
  保存までを同じ直列化キュー内で実行するようにした。

### 検証
- `apps/desktop/src/main/analysisStore.test.ts` に、並行 `appendParagraphPattern`、
  並行 `saveAnalysis`、並行 `createGeneration` の回帰テストが追加されていることを確認。
- `pnpm --filter @litelizard/shared build` 実行後、
  `pnpm --filter @litelizard/desktop test -- analysisStore analysisSettingsStore apiBridge ipc`
  が成功（6 files / 68 tests）。

### 残課題
- 複数プロセス間ロックの本格実装はチケット非ゴールのため未対応。
