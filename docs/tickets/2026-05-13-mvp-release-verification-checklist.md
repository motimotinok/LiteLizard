---
status: todo
started_at:
completed_at:
---

# MVP公開前の検証チェックリストと証跡を整理する

## 背景

公開準備の実装チケットはかなり消化され、残りは GUI 実操作で見つかった不具合修正、分析パイプライン整理、配布判断に近づいている。最後に何を確認したかが散らばると、公開直前に不安が残る。

LLM が実行できる自動検証と、人間が通常の macOS GUI で見るべき手動確認を分けた公開前チェックリストを用意する。

## ゴール

MVP 公開前に必要な検証項目、実行コマンド、手動確認項目、残リスクが 1 か所で分かる状態にする。

## スコープ

- 現行 README、CHANGELOG、`docs/tickets/done/`、package scripts から公開前検証項目を棚卸しする
- `pnpm -w lint` / `pnpm -w test` / `pnpm -w build` / `pnpm --filter @litelizard/desktop package:mac` / packaged smoke の実行手順を整理する
- 人間が見るべき macOS GUI 操作を短いチェックリストに分ける
- 署名、notarization、自動更新、配布ページの扱いを「公開前に決めること」として分離する
- 必要に応じて README または docs 配下に最小の公開前チェックリストを追加する

## 非ゴール

- 不具合そのものの修正
- Developer ID 署名や notarization の実装
- 自動更新機能の実装
- ランディングページ作成
- 法務文書の大幅な書き換え

## 受け入れ条件

- [ ] LLM が実行できる自動検証と、人間が確認する GUI 手順が分かれている
- [ ] 配布パッケージ生成と smoke 確認の現行コマンドが記載されている
- [ ] テキストエクスポート、フォルダ選択直後の遷移、段落 DnD、分析実行、API キー設定、前回フォルダ復元が公開前確認項目に含まれている
- [ ] 署名、notarization、自動更新の未決事項が公開判断の項目として残っている
- [ ] 既存 README / CHANGELOG / docs の役割分担を崩していない

## 検証方法

- [ ] 関連する既存ドキュメントと package scripts を確認する
- [ ] 追加または更新したドキュメントのリンク切れを確認する
- [ ] `pnpm -w lint`
- [ ] `pnpm -w test`
- [ ] `pnpm -w build`
- [ ] `pnpm --filter @litelizard/desktop package:mac`
- [ ] `pnpm --filter @litelizard/desktop smoke:package:mac`

## 完了メモ

未着手。
