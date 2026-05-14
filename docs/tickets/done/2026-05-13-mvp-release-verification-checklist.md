---
status: done
started_at: 2026-05-14T19:07:07+09:00
completed_at: 2026-05-14T19:11:06+09:00
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

- [x] LLM が実行できる自動検証と、人間が確認する GUI 手順が分かれている
- [x] 配布パッケージ生成と smoke 確認の現行コマンドが記載されている
- [x] テキストエクスポート、フォルダ選択直後の遷移、段落 DnD、分析実行、API キー設定、前回フォルダ復元が公開前確認項目に含まれている
- [x] 署名、notarization、自動更新の未決事項が公開判断の項目として残っている
- [x] 既存 README / CHANGELOG / docs の役割分担を崩していない

## 検証方法

- [x] 関連する既存ドキュメントと package scripts を確認する
- [x] 追加または更新したドキュメントのリンク切れを確認する
- [x] `pnpm -w lint`
- [x] `pnpm -w test`
- [x] `pnpm -w build`
- [x] `pnpm --filter @litelizard/desktop package:mac`
- [x] `pnpm --filter @litelizard/desktop smoke:package:mac`

## 完了メモ

`docs/release-checklist.md` を新規追加し、MVP 公開前に確認する内容を 3 段に分けて整理した。

- 「自動検証」: `pnpm -w lint` / `test` / `build` / `package:mac` / `smoke:package:mac` / `package:mac:dmg` を実行順に記載し、`smoke:package:mac` が `package:mac` の `.app` を見にいく前提や `LITELIZARD_SMOKE_TIMEOUT_MS` での timeout 上書きも書いた。
- 「手動 GUI 確認」: インストール導線、初回体験、執筆まわり、分析まわり、終了/再起動、既知の制約に分けて、テキストエクスポート、フォルダ選択直後の遷移、段落 DnD、分析実行 overlay、API キー保存、前回フォルダ復元を漏らさずチェックボックス化した。
- 「公開判断として人間に残っている未決事項」: Apple Developer ID 署名 / notarization、自動更新、ランディングページ、Windows / Linux 配布、アプリアイコン (#95)、Electron E2E の起動 `SIGABRT` 、フォルダ選択 UI の安全範囲（`docs/tickets/2026-05-13-project-folder-selection-safety.md`）を分離して残した。

`README.md` の Packaging セクション末尾から `docs/release-checklist.md` を参照させた。`SECURITY.md` / `PRIVACY.md` / `CHANGELOG.md` / 既存 done チケットには手を入れず、役割分担は崩していない。

検証:

- `pnpm -w lint` 成功。
- `pnpm -w test` 成功（desktop 279、shared 57、api 4、e2e 6 skipped）。
- `pnpm -w build` 成功。
- `pnpm --filter @litelizard/desktop package:mac` 成功（`apps/desktop/release/mac-arm64/LiteLizard.app` を再生成）。
- `pnpm --filter @litelizard/desktop smoke:package:mac` 成功（`[Smoke] packaged app ready: {"hasRoot":true,"hasPreloadBridge":true,...}`、rootText に「準備中 / 前回のフォルダを確認しています...」を確認）。
- 追加ドキュメントのリンク先（`docs/decisions.md` / `CHANGELOG.md` / `README.md` / `docs/tickets/done/` / `docs/tickets/2026-05-13-project-folder-selection-safety.md`）はすべて存在することを確認。

残課題:

- 手動 GUI 確認セクションは Ralph Loop 中に LLM 側で実施しないため、MVP 公開判断時に人間が一通り通す前提。
- `package:mac:dmg` 自体は今回の検証対象外（既存 done チケット `2026-05-13-macos-dmg-release-package.md` で個別に検証済み）。
