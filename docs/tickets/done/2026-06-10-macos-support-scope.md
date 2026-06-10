---
status: done
started_at: 2026-06-10T10:45:34+09:00
completed_at: 2026-06-10T10:48:18+09:00
---

# macOS の動作確認範囲を公開文言に明示する

## 背景

MVP は Apple Silicon Mac 向けに配布しているが、macOS の動作確認範囲が公開文言から分からない。現時点で実機確認できているのは macOS Tahoe 26.5.1 のみであり、未確認バージョンまで保証する表現は避ける必要がある。

Source Issue: #106 https://github.com/motimotinok/LiteLizard/issues/106

## ゴール

Apple Silicon Mac 向けであることと、macOS Tahoe 26.5.1 のみで動作確認済みであることが、主要な公開文言から確認できる。

## スコープ

- 現行 Electron バージョンと公式サポート状況の確認
- README、GitHub Release 本文、公開前チェックリストの表記統一
- サポート範囲に関する設計判断の記録

## 非ゴール

- 未所持の macOS バージョンに対する動作保証
- Intel Mac、Windows、Linux への対応
- Electron のメジャーバージョン更新
- 公開済み外部記事の直接更新

## 受け入れ条件

- [x] Apple Silicon Mac 向けであることが明記されている
- [x] macOS Tahoe 26.5.1 のみで動作確認済みであることが明記されている
- [x] その他の macOS バージョンは未検証であり、動作保証しないことが明記されている
- [x] README、Release 本文、公開前チェックリストの表記が矛盾しない
- [x] 現行 Electron の公式サポート状況が確認されている
- [x] Electron バイナリの技術的な最小 macOS 宣言と、LiteLizard の実機確認範囲が区別されている

## 検証方法

- [x] 関連文書の表記を横断検索する
- [x] workflow YAML の構文を差分レビューする
- [x] `pnpm -w lint`
- [x] `pnpm -w test`
- [x] `pnpm -w build`

## 完了メモ

完了。実機の `sw_vers` と `uname -m` で macOS 26.5.1 / arm64 を確認し、README、GitHub Release workflow の本文、公開中の `mvp-latest` Release 本文、公開前チェックリストへ「Apple Silicon Mac のみ」「macOS Tahoe 26.5.1 のみ動作確認済み」「その他は未検証・動作保証外」を反映した。設計判断ログでは、Electron 34.5.8 のバイナリが `LSMinimumSystemVersion: 11.0` を宣言している技術的事実と、LiteLizard の実機確認範囲を分離した。

検証は `pnpm -w lint`、`pnpm --filter @litelizard/desktop test`（312件）、`pnpm -w build` が成功した。`pnpm -w test` は実行したが、今回の変更と無関係な既知のローカル環境問題で、API の `better-sqlite3` が Node.js ABI 120 でビルド済みなのに対して実行NodeがABI 127を要求し、API統合テスト4件のみ失敗した。shared 57件とE2E 6件skipは完了し、desktopは個別実行で全件成功した。

Electron 34系が公式サポート終了済みであるため、更新作業を GitHub Issue #107 として分離した。
