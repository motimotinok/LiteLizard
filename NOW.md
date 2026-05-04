# NOW

最終更新: 2026-05-04

このファイルは、LiteLizard の現在地を短く見るためのスナップショット。WBS の代替ではなく、動的に変わる Issue / PR / 仕様判断の流れで「今なにを見ればいいか」を保つために使う。

## 今の開発テーマ

- 固定 WBS 主導から、GitHub Issue を実作業カードとして使う流れへ移行中。
- `agent-ready` ラベル付き Issue を、自律 LLM エージェントが処理できる短期キューとして使う。
- 仕様策定そのものは人間が握り、LLM には実装・検証・PR 作成・一次レビューを寄せる。
- WBS は既存タスク台帳と完了反映を主な役割にし、新規タスクは原則 Issue に残す。

## 今動いているもの

- #82 `desktop lint エラーを解消する`
  - 状態: `agent-ready`
  - 目的: desktop lint の失敗を解消し、以後の PR で lint 結果を信頼できる状態に戻す。
  - 注意: `apps/desktop/src/preload/preloadMockApi.js` などの tracked 生成物らしきファイルの扱いを実装時に確認する。
- #76〜#81 R-18 Reading Agent 系
  - 状態: `blocked`
  - 目的: Reading Agent 機能の段階実装。
  - 注意: 依存関係が解けるまで自律エージェントには渡さない。
- #72〜#74 拡張・ローカル LLM ランタイム系
  - 状態: P2 / feature
  - 目的: 将来拡張の検討。
  - 注意: 仕様策定・設計検討寄りなので、現時点では `agent-ready` 化対象外。

## 人間が判断すること

- `agent-ready` にする Issue の最終判断。
- 仕様・UX・スコープ変更の判断。
- Codex レビュー指摘なし + CI 通過の PR を、原則マージしてよいかの例外判断。
- 自前クラウド LLM 方式を本当に検討するか。API キー方式とは別物で、認証・課金・利用量制限・サーバー運用が増える。

## LLM に任せてよいこと

- `agent-ready` Issue の実装、テスト、lint/build 修正、PR 作成。
- 既存 Issue が `agent-ready` 化できるかの診断。
- PR の一次レビューと、`MERGE_OK` / `FIX_REQUIRED` / `HUMAN_REQUIRED` の分類。
- open Issue / PR / CI / WBS / CHANGELOG の状態確認と、次に見るべきものの整理。

## LLM に任せないこと

- 仕様策定そのもの。
- UX 方針やプロダクト判断。
- 重い仕様明確化が必要な Issue の `agent-ready` 化。
- ユーザー確認なしの Issue close。
- ユーザー確認なしの WBS 新規追加。
- 危険領域の自動マージ。例: 保存形式、IPC、セキュリティ、データ移行、大きな UI 変更。

## 運用ルール

- `agent-ready` は「LLM ができそう」ではなく「人間が渡してよいと判断した」状態。
- `agent-ready` キューは常時 2〜5 件くらいに抑える。
- 仕様検討 Issue と実装 Issue を混ぜない。
- 後から出た残課題は、明示がなければ WBS ではなく GitHub Issue に残す。
- Issue close は、実装完了・検証・push・CI・ユーザー確認が揃ってから行う。
- このファイルは毎日更新しない。流れが変わったとき、迷子になりそうなときだけ更新する。

## 次の一手

- #82 の自律実行 PR が来たら、CI と Codex レビューを確認する。
- Codex レビュー指摘なし、CI 通過、スコープ逸脱なしなら原則マージ候補にする。
- 次に `agent-ready` 化する Issue は、`prepare-agent-ready-issues` スキルで「不明点を数点詰めれば渡せるもの」だけ探す。
