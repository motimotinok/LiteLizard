---
status: done
started_at: 2026-05-12T08:26:59+09:00
completed_at: 2026-05-12T08:32:35+09:00
---

# 作成文章のテキストエクスポート

## 背景

GitHub Issue #88 から切り出した公開前タスク。

LiteLizard の `.lzl` は documentId や段落 ID などの内部管理情報を含む保存形式であり、そのまま外部提出や他ツール連携に使うには向いていない。公開前に、ユーザーが書いた本文を内部情報なしで外へ出せる最低限の導線が必要。

## ゴール

現在開いている文書を、内部管理情報を含まない本文テキストとして外部ファイルへ書き出せる。

## スコープ

- 最初の出力形式はプレーンテキストを基本にする
- 章タイトルと段落本文を、読みやすい順序で出力する
- Electron main / preload IPC 経由で保存先を選び、ファイルへ書き込む
- renderer から実行できる最小の UI 導線を追加する
- 空文書、複数章、未保存文書でクラッシュしないようにする

## 非ゴール

- `.lzl` 保存形式自体は変更しない
- PDF / DOCX / HTML などの重い形式は扱わない
- 分析結果や内部メタデータのエクスポートは含めない
- 書式付き Markdown エクスポートは、必要なら後続タスクに分ける

## 受け入れ条件

- [x] ユーザーが現在の文書を外部テキストファイルとして書き出せる
- [x] 出力に documentId、chapterId、paragraphId、analysis などの内部管理情報が混ざらない
- [x] 章と段落の順序が保持される
- [x] 空文書、複数章、未保存文書でクラッシュしない
- [x] 保存キャンセル時に文書状態が壊れない
- [x] 既存の `.lzl` 保存・読み込み機能を壊していない

## 検証方法

- [x] エクスポート変換ロジックの unit test を追加する
- [x] main / preload / renderer の必要な契約テストを追加または更新する
- [x] サンプル文書で章・段落順と内部情報が出ないことを確認する
- [x] `pnpm -w lint`
- [x] `pnpm -w test`
- [x] `pnpm -w build`

## 完了メモ

`exportDocumentToPlainText` を shared に追加し、文書タイトル・章タイトル・段落本文だけを順序通りに出力するようにした。Electron main / preload / renderer store に `doc:exportText` 導線を追加し、titlebar のアイコンボタンから保存ダイアログ経由で `.txt` を書き出せる。

検証: 変換 unit test、main IPC、preload IPC、renderer store、preload mock の回帰テストを追加/更新。`pnpm -w lint`、`pnpm -w test`（shared 49 件、desktop 253 件、api 4 件、e2e 6 skipped）、`pnpm -w build` 成功。

残課題: Electron 実機での保存ダイアログ手動確認は未実施。
