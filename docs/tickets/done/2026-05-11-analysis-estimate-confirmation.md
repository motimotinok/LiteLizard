---
status: done
started_at: 2026-05-12T14:00:00+09:00
completed_at: 2026-05-12T14:55:00+09:00
---

# 分析実行前のコンテキスト量見積もり確認

## 背景

GitHub Issue #92 から切り出した公開前タスク。

分析実行時は、コンテキスト設定によって LLM に渡す前段落が大きく増える。外部 API キー利用ではコスト不安があり、ローカル LLM 利用でも処理量や待ち時間が読みにくい。公開前に、実行前の安全確認として対象段落数と概算入力量を見せる必要がある。

## ゴール

分析実行ボタンを押したとき、すぐ LLM 呼び出しへ進まず、対象段落数・対象本文量・コンテキスト量・概算 output 量を確認してから実行できる。

## スコープ

- 現在の `AnalysisContextPolicy` に基づいて、対象本文量とコンテキスト量を概算する
- 確認 UI に対象段落数、対象本文量、コンテキスト本文量、概算 output 量を表示する
- `lastN` / `none`、`document` / `chapter` の差が見積もりに反映されるようにする
- キャンセル時に provider 呼び出しや analysis generation 更新が発生しないようにする
- 概算であり正確な課金額ではないことを UI 上で示す

## 非ゴール

- プロバイダーごとの正確な課金額計算はしない
- 最新 pricing table をアプリ内に持たせない
- tokenizer 完全一致の厳密な token 計算は必須にしない
- 分析結果の保存形式は変更しない
- コンテキストポリシーそのものの設計変更はしない

## 受け入れ条件

- [x] 分析実行前に確認 UI が表示される
- [x] 確認 UI で対象段落数が分かる
- [x] 確認 UI で対象本文量とコンテキスト本文量が分かる
- [x] 確認 UI で概算 output 量が分かる
- [x] `lastN` / `none` などの設定差が input 見積もりに反映される
- [x] キャンセル時に provider 呼び出しが発生しない
- [x] キャンセル時に analysis history / generation が更新されない
- [x] 既存の段落分析実行、進捗表示、結果保存を壊していない

## 検証方法

- [x] 見積もりロジックの unit test を追加する（`packages/shared/src/analysisEstimate.test.ts`）
- [x] `lastN` と `none` の設定差で input 見積もりが変わることを確認する（estimate / store の双方でテスト）
- [x] キャンセル時に provider 呼び出しが行われないことを mock で確認する（`useAppStore.test.ts` の cancelAnalysisRun テスト）
- [x] 実行確定時は既存の分析フローに進むことを確認する（`useAppStore.test.ts` の confirmAnalysisRun テスト）
- [ ] 可能であれば Electron 上で、確認 UI からキャンセル / 実行の両方を手動確認する（Electron 手動確認は別途）
- [x] `pnpm -w lint`
- [x] `pnpm -w test`
- [x] `pnpm -w build`

## 完了メモ

- `packages/shared/src/analysisEstimate.ts` に `estimateAnalysisCost` を追加し、対象段落数・対象本文量・コンテキスト本文量・概算入力量・概算 output 量を返すようにした。
- store に `pendingAnalysisRun` state と `requestAnalysisRun` / `confirmAnalysisRun` / `cancelAnalysisRun` を追加。AnalysisPane の実行ボタンは `requestAnalysisRun` を呼び、pending 状態で確認ダイアログを表示するようにした。confirm 時は既存の `runAnalysis` を経由するので、進捗表示・結果保存・部分失敗集計の挙動は維持される。
- 実装後の `pnpm -w lint` / `pnpm -w test` / `pnpm -w build` がいずれも成功。
- Electron 上での手動確認は未実施。手動確認は次回のリリース準備ループで合わせて行う想定。
