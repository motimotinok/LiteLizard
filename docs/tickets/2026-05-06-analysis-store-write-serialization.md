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

- [ ] `saveAnalysis` の一時ファイル名が固定 `.tmp` ではなく、保存ごとに衝突しない
- [ ] 同一ドキュメントへの `appendParagraphPattern` が直列化され、既存 `patterns` を失わない
- [ ] `createGeneration` が同じ保存ファイルを壊さないことを現実装に即して確認または対策している
- [ ] 競合シナリオのテストが追加されている
- [ ] 既存の分析保存・読み込みテストが通る

## 検証方法

- [ ] 関連する既存テストを確認する
- [ ] 競合保存の回帰テストを追加または更新する
- [ ] `pnpm -w lint`
- [ ] `pnpm -w test`
- [ ] `pnpm -w build`

## 完了メモ

未着手。
