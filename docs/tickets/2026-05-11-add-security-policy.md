---
status: todo
started_at:
completed_at:
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

- [ ] ルートに `SECURITY.md` が追加されている
- [ ] 脆弱性報告方法が明記されている
- [ ] サポート対象バージョンまたは公開初期の扱いが説明されている
- [ ] API キー、ローカルファイル、外部 provider 送信に関する注意が現行実装と矛盾なく書かれている
- [ ] README から `SECURITY.md` を確認できる

## 検証方法

- [ ] `SECURITY.md` の記述が現行の Electron IPC / safeStorage / provider 実装と矛盾していないか確認する
- [ ] README のリンクまたは記述が正しく表示されることを確認する
- [ ] `pnpm -w lint`
- [ ] `pnpm -w test`
- [ ] `pnpm -w build`

## 完了メモ

未着手。
