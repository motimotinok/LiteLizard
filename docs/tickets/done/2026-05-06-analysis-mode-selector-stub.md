---
status: done
started_at: 2026-05-06T14:47:14+09:00
completed_at: 2026-05-06T14:49:28+09:00
---

# 分析モード選択 UI のスタブを追加する

## 背景

WBS R-10 では、分析モード選択 UI のスタブが未完了になっている。まずは実行ロジックを増やさず、段落 / 章 / 全体の選択状態を UI と state で持てるところまでを対象にする。

## ゴール

分析パネルで「段落 / 章 / 全体」の分析モードを選択できるスタブ UI がある。

## スコープ

- AnalysisPane の既存操作導線を確認する
- 段落 / 章 / 全体の分析モード state を追加する
- UI リデザインの静かなトーンに合わせて segmented control 相当の選択 UI を追加する
- 未実装モードでは既存の段落解析を壊さず、必要なら disabled または説明不要な控えめ表示にする
- 必要な component / store テストを追加または更新する

## 非ゴール

- 章解析や全体解析の新規 LLM 実行
- 分析プロンプトの変更
- 解析結果保存形式の変更
- 分析パネル全体の再設計

## 受け入れ条件

- [x] 分析モードとして段落 / 章 / 全体を選択できる UI がある
- [x] 既存の段落解析実行が壊れていない
- [x] 未実装モードの扱いが UI 上で破綻していない
- [x] 選択状態が renderer state として扱われる

## 検証方法

- [x] 関連する既存テストを確認する
- [x] 必要なテストを追加または更新する
- [x] `pnpm -w lint`
- [x] `pnpm -w test`
- [x] `pnpm -w build`

## 完了メモ

AnalysisPane に「段落 / 章 / 全体」の segmented control を追加し、renderer store の `analysisMode` で選択状態を保持するようにした。章 / 全体は準備中表示のスタブとして選択可能にし、実行ボタンは段落モード時だけ既存の段落解析を呼ぶ。`useAppStore.test.ts` に mode 初期値と切替の回帰テストを追加した。

実行した検証:
- `pnpm --filter @litelizard/desktop test -- useAppStore.test.ts`
- `pnpm -w lint`
- `pnpm -w test`
- `pnpm -w build`

残課題:
- 章解析と全体解析の実行ロジックは後続タスク。

## 元 WBS

- R-10 分析モード選択 UI（スタブ）
