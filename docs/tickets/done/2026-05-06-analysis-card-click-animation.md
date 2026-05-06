---
status: done
started_at: 2026-05-06T14:43:34+09:00
completed_at: 2026-05-06T14:45:13+09:00
---

# 分析カードクリック時のアニメーションを整える

## 背景

WBS R-12 では、分析カードクリック時アニメーション改善が未完了になっている。R-16 UI 全面刷新後の分析パネルは静かなトーンになっているため、クリックや選択時のフィードバックも大きな演出ではなく、段落との対応が分かる最小限の動きに揃える必要がある。

## ゴール

分析カードをクリックしたとき、選択状態や対応段落への視線誘導が自然に伝わる。

## スコープ

- `AnalysisPane.tsx` と関連 CSS のカード選択状態を確認する
- 既存の active 表示に沿って、クリック時の transition / highlight を調整する
- アニメーションは短く控えめにし、執筆画面の静けさを壊さない
- 必要に応じて reduced motion を考慮する

## 非ゴール

- 分析カードのレイアウト再設計
- 段落と分析カードの双方向 fade highlight 連動の本格実装
- 新しい分析結果表示項目の追加
- 解析ロジックの変更

## 受け入れ条件

- [x] 分析カードクリック時に選択されたことが視覚的に分かる
- [x] 既存の active / stale 表示と競合しない
- [x] アニメーションが過度に目立たず、UI リデザイン仕様のトーンに合っている
- [x] `prefers-reduced-motion` でも不自然な表示にならない

## 検証方法

- [x] 関連する既存テストを確認する
- [x] 必要なテストを追加または更新する
- [x] `pnpm -w lint`
- [x] `pnpm -w test`
- [x] `pnpm -w build`

## 完了メモ

`AnalysisPane` の既存クリック処理と `analysis-card-active` 状態を維持したまま、`styles.css` で active カードに短い pulse、控えめな内枠、reduced motion 対応を追加した。stale カードが active になった場合は stale の amber 罫線を少し内側へずらし、active の藍罫線と競合しないようにした。

検証:
- `pnpm --filter @litelizard/desktop lint`
- `pnpm -w lint`
- `pnpm -w test`
- `pnpm -w build`

残課題: なし。

## 元 WBS

- R-12 分析カードクリック時アニメーション改善
