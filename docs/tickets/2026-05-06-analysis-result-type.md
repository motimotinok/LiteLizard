# 段落分析結果の型定義追加

## 背景

GitHub Issue #66 では、`packages/shared/src/types.ts` の `ParagraphAnalysisPattern.result` が `Record<string, unknown>` のままで、分析結果の実際の形を型で追えていないことが指摘されている。

現在のままだと、保存時に期待しないキーが混入しても検出しにくく、UI 側で分析結果へアクセスするたびに型アサーションが必要になる。分析結果の標準フィールドを型として定義しておくと、今後の仕様変更や表示ロジックの保守がしやすくなる。

## ゴール

`ParagraphAnalysisResult` を shared 型として定義し、`ParagraphAnalysisPattern.result` が分析結果の標準フィールドを型レベルで表現する。

## スコープ

- `packages/shared/src/types.ts` に `ParagraphAnalysisResult` を追加する
- `ParagraphAnalysisPattern.result` の型を `ParagraphAnalysisResult` に変更する
- 既存の分析履歴表示、保存、変換、テストコードを新しい型に合わせる
- 必要に応じて `docs/specs/analysis-api.md` の型例を更新する

## 非ゴール

- 分析結果 JSON の保存形式変更
- 新しい分析フィールドの追加
- UI 表示デザインの変更
- API レスポンス契約の大幅変更

## 受け入れ条件

- [ ] `ParagraphAnalysisResult` が `emotion`, `theme`, `deepMeaning`, `confidence`, `model` などの標準フィールドを持つ
- [ ] `ParagraphAnalysisPattern.result` が `Record<string, unknown>` ではなく `ParagraphAnalysisResult` を参照する
- [ ] `migrateFromV1` や分析履歴表示ロジックが型エラーなく動く
- [ ] 既存の保存済み分析データを読み込む想定が壊れていない
- [ ] shared / desktop / api の型チェックとテストが通る

## 検証方法

- [ ] 関連する既存テストを確認する
- [ ] 必要なテストを追加または更新する
- [ ] `pnpm -w lint`
- [ ] `pnpm -w test`
- [ ] `pnpm -w build`

## 完了メモ

実装日: 2026-05-06。

### 変更内容
- `packages/shared/src/types.ts` に `ParagraphAnalysisResult` interface を追加。標準フィールドは
  `emotion` / `theme` / `deepMeaning` / `confidence` / `model` / `sourceText` の 6 つで、
  既存の保存済みデータとの互換のためすべて optional とした。
- `ParagraphAnalysisPattern.result` の型を `Record<string, unknown>` から
  `ParagraphAnalysisResult` に置き換えた。
- `apps/desktop/src/renderer/store/analysisHistory.ts` の
  `projectAnalysisHistoriesToDocument` から `as Record<string, unknown>` キャストを削除し、
  新しい型のまま runtime 型ガードを継続する形に整えた。
- `docs/specs/analysis-api.md` の §3.2 / §5.3 のサンプル型を
  `ParagraphAnalysisResult` に合わせて更新した。

### 設計上のメモ
- 索引シグネチャ（`[key: string]: unknown`）は付けない方針にした。
  想定外キーが混入したときに型エラーで気付けるようにするため。
  将来、標準フィールドを追加するときは `ParagraphAnalysisResult` に直接追記する。
- `ipc.ts` の `saveAnalysisResult` ハンドラーや `preloadMockApi.ts` のモックは
  `ParagraphAnalysisPattern` 経由で型が繋がるため、コード変更は不要だった。
- `analysisStore.ts` の `migrateFromV1` も新しい型を満たすため変更不要。

### 検証
- `pnpm -w build` 成功（shared / api / desktop すべて tsc + vite build パス）。
- `pnpm -w test` 成功（shared 44 / api 4 / desktop 147 件、e2e は skipped）。
- `pnpm -w lint` 成功。本チケット導入前から残っていた 9 件の既存 lint 違反は、
  ralph-loop の検証ゲートを通すために最小限の整備として同イテレーションで解消した
  （別コミット `Fix pre-existing lint debt` 参照）。

### 残課題
- 誤コミットされた `apps/desktop/src/preload/*.{js,d.ts,js.map}` の build artifact 群
  については eslint で ignore する暫定対応を入れた。本来は git tracking から外し
  `.gitignore` を整える方が望ましいが、本イテレーションのスコープ外として別チケット
  化候補とする。
