---
status: todo
started_at:
completed_at:
---

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

未着手。
