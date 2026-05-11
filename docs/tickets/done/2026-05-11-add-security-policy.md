---
status: done
started_at: 2026-05-12T08:23:17+09:00
completed_at: 2026-05-12T08:24:51+09:00
---

# SECURITY.md を追加する

## 背景

LiteLizard はローカルファイル操作、Electron IPC、API キー保存、外部 API / ローカル LLM 送信を扱う。外部公開前に、脆弱性報告の窓口と、現行の安全上の前提を短く示しておく必要がある。

## ゴール

ルートに `SECURITY.md` を追加し、脆弱性報告方法とセキュリティ上の基本方針を確認できる状態にする。

## スコープ

- ルートに `SECURITY.md` を追加する
- 脆弱性報告先または報告方法を明記する
- サポート対象バージョンの初期方針を書く
- API キー保存、ローカルファイル操作、外部 provider 送信に関する安全上の注意を書く
- Electron IPC とローカルファースト設計の現行前提に沿って書く
- README から `SECURITY.md` へ辿れるようにする

## 非ゴール

- 完全なセキュリティ監査は行わない
- 脆弱性報奨金制度は作らない
- 暗号方式や保存モデルの大幅変更はしない
- GitHub private vulnerability reporting の有効化までは、このチケットの必須条件にしない
- 法務・コンプライアンス文書として断定しない

## 受け入れ条件

- [x] ルートに `SECURITY.md` が追加されている
- [x] 脆弱性報告方法が明記されている
- [x] サポート対象バージョンまたは公開初期の扱いが説明されている
- [x] API キー、ローカルファイル、外部 provider 送信に関する注意が現行実装と矛盾なく書かれている
- [x] README から `SECURITY.md` を確認できる

## 検証方法

- [x] `SECURITY.md` の記述が現行の Electron IPC / safeStorage / provider 実装と矛盾していないか確認する
- [x] README のリンクまたは記述が正しく表示されることを確認する
- [x] `pnpm -w lint`
- [x] `pnpm -w test`
- [x] `pnpm -w build`

## 完了メモ

- ルートに `SECURITY.md` を追加し、脆弱性報告方法、公開初期のサポート対象、現行の安全上の前提を記述した。
- Electron IPC の project root / realpath 検証、`safeStorage` 優先の API キー保存と平文フォールバック、分析実行時の OpenAI / Anthropic / Local LLM endpoint 送信について、実装事実ベースで説明した。
- `README.md` に「セキュリティ」セクションを追加し、`SECURITY.md` への導線を整備した。
- 検証: `pnpm -w lint` / `pnpm -w test`（desktop 249 件、shared 46 件、api 4 件、e2e 6 skipped）/ `pnpm -w build` 成功。
- 残課題なし。
