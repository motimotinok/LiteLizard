---
status: done
started_at: 2026-05-07T00:00:00+09:00
completed_at: 2026-05-07T00:30:00+09:00
---

# 章サマリー解析をマクロ視点の分析ペインに表示する

## 背景

WBS R-07 では、章サマリー解析表示が未完了になっている。方針として、新規 LLM 章解析ではなく、まず既存の段落分析結果を章ごとに集約して表示する。

## ゴール

マクロ視点で章を見ているとき、既存の段落分析結果から章ごとの傾向や要約的な情報を確認できる。

## スコープ

- 現在の macro view と AnalysisPane の状態連携を確認する
- 既存の段落分析結果を章単位に集約する helper を追加する
- マクロ視点時の分析ペインに、章ごとの分析サマリーを表示する
- 未解析段落や stale 段落が混在する章でも表示が破綻しないようにする
- 必要な store / component テストを追加または更新する

## 非ゴール

- 新規 LLM 呼び出しによる章解析
- 章サマリー専用の保存形式追加
- 分析プロンプトの変更
- マクロビュー全体の再設計

## 受け入れ条件

- [x] マクロ視点時に章ごとの分析サマリーが表示される
- [x] サマリーは既存の段落分析結果から集約される
- [x] 未解析・stale・解析済みが混在しても状態が分かる
- [x] 新規 LLM 章解析を実行しない
- [x] 既存の段落分析表示が壊れていない

## 検証方法

- [x] 関連する既存テストを確認する
- [x] 必要なテストを追加または更新する
- [x] `pnpm -w lint`
- [x] `pnpm -w test`
- [x] `pnpm -w build`

## 完了メモ

- `apps/desktop/src/renderer/utils/chapterAnalysisAggregation.ts` に純関数 `aggregateChapterAnalyses` を新設し、章ごとに段落数・解析済み / 要再解析 / 未解析 / 解析中 / 失敗の内訳、`complete` 段落のテーマ・感情頻度、`confidence` 平均を返す。未解析は `status === 'stale'` かつ `analyzedAt` 未設定で判定。
- 表示用に `apps/desktop/src/renderer/components/ChapterSummaryList.tsx` を分離し props 駆動にした。AnalysisPane は `useAppStore` から `viewScale` を購読し、`viewScale === 'macro'` のときのみ章サマリーカードを描画する（段落カードのコードパスは無変更）。新規 LLM 呼び出しは行わない。
- 既存の SSR テストパターン（`renderToStaticMarkup`）は zustand v5 の `getServerSnapshot` が初期値を返すためストア駆動の分岐検証には使えなかった。回避として描画コンポーネントを抽出して props で直接テストする方針にした。
- 検証: `pnpm -w lint` / `pnpm -w test`（desktop 222 / shared 46 / api 4）/ `pnpm -w build` 成功。helper 7 ケース、ChapterSummaryList SSR 5 ケースを追加。
- 残課題: Electron 上での手動表示確認は未実施（Codex レビューと自動テストで担保する前提）。確度平均など UI 仕様の磨き込みは別チケット候補。

## 元 WBS

- R-07 章サマリー解析表示
