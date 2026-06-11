---
status: done
started_at: 2026-05-12T00:00:00+09:00
completed_at: 2026-05-12T00:30:00+09:00
---

# PRIVACY.md を追加する

## 背景

LiteLizard はユーザーの原稿本文、分析結果、API キー、ローカル LLM endpoint 設定を扱う。外部公開前に、どのデータがローカルに保存され、どの条件で外部 provider へ送信されるかをユーザーが理解できるようにする必要がある。

## ゴール

ルートに `PRIVACY.md` を追加し、LiteLizard のデータ取り扱いを実装事実ベースで説明する。

## スコープ

- ルートに `PRIVACY.md` を追加する
- 原稿ファイル、`.litelizard/analysis`、設定ファイル、Reading Agent、API キー保存の扱いを書く
- OpenAI / Anthropic など外部 API を使う場合に、対象本文とコンテキストが provider へ送信されることを書く
- ローカル LLM を使う場合に、設定した endpoint へ本文が送信されることを書く
- LiteLizard 自体のサーバーへ送信しない設計であれば、その範囲を明記する
- README から `PRIVACY.md` へ辿れるようにする

## 非ゴール

- 弁護士レビュー済みの正式なプライバシーポリシーとして断定しない
- 個人情報保護法や海外法制への完全準拠を保証しない
- 外部 provider 側のデータ保持・学習利用ポリシーを再記述しない
- telemetry / analytics を新規実装しない
- クラウドアカウントや同期機能の仕様は扱わない

## 受け入れ条件

- [x] ルートに `PRIVACY.md` が追加されている
- [x] 原稿本文と分析結果のローカル保存場所が説明されている
- [x] API キー保存の扱いが説明されている
- [x] 外部 API 利用時に送信されるデータの種類が説明されている
- [x] ローカル LLM 利用時の送信先がユーザー設定 endpoint であることが説明されている
- [x] LiteLizard 自体がサーバーへ本文を送らない範囲が、現行実装と矛盾なく書かれている
- [x] README から `PRIVACY.md` を確認できる

## 検証方法

- [x] `PRIVACY.md` の記述が現行の保存・分析・設定実装と矛盾していないか確認する
- [x] README のリンクまたは記述が正しく表示されることを確認する
- [x] `pnpm -w lint`
- [x] `pnpm -w test`
- [x] `pnpm -w build`

## 完了メモ

- ルートに `PRIVACY.md` を追加し、現行実装の事実ベースでデータ取り扱いを記述
  - 原稿は選択フォルダ配下、分析結果は `<projectRoot>/.litelizard/analysis/` 配下、設定とキーは Electron userData 配下に保存
  - API キーは `safeStorage` 可なら `api-keys.bin` で暗号化、不可なら `api-keys.plaintext` で平文保存
  - 分析実行時のみ OpenAI / Anthropic / ユーザー設定 Local LLM endpoint へ本文・前段落・system prompt を送信
  - LiteLizard 自体のサーバーは存在せず、telemetry / analytics SDK も組み込まれていないことを明記
- `README.md` に「プライバシー」セクションを追加し、`PRIVACY.md` への導線を整備
- 検証: `pnpm -w lint` / `pnpm -w test` / `pnpm -w build` すべて成功
- 残課題なし。SECURITY.md など隣接の公開前ドキュメントは別チケットで継続。
