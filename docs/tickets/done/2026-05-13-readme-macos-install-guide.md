---
status: done
started_at: 2026-05-14T08:20:18+09:00
completed_at: 2026-05-14T08:37:44+09:00
---

# README に未署名 DMG のインストール手順を追加する

## 背景

MVP は未署名の macOS `.dmg` を GitHub Releases で配布する方針で、Apple Developer Program 署名・公証・ランディングページ・自動更新はいずれも公開後対応として整理されている。

現状の `README.md` には「ダウンロードした `.dmg` をどうマウントし、Applications にどう入れ、未署名アプリの Gatekeeper 警告にどう対処するか」「初回起動後にどこで API キーを設定するか」の導線がない。`SECURITY.md` には未署名配布で警告が出る前提だけ書かれているが、ユーザー向けの回避手順は記載されていない。

ランディングページが公開後対応である以上、初回 MVP では README が事実上唯一のユーザー向け導線になる。ここに案内が無いと、未署名アプリの警告を見たユーザーが「壊れたアプリ」と判断して離脱しやすい。

## ゴール

ダウンロードした未署名 `.dmg` を、初見の macOS ユーザーでも安全にマウント → Applications にコピー → 初回起動 → API キー設定までたどり着ける案内が、README に揃っている状態にする。

## スコープ

- `README.md` に macOS 向けのインストールセクションを追加する
  - GitHub Releases から `.dmg` をダウンロードする手順
  - DMG をマウントして Applications にドラッグする手順
  - 未署名アプリの Gatekeeper 警告の対処方法（右クリック → 開く、または `xattr -d com.apple.quarantine /Applications/LiteLizard.app` などの正確な手順）
  - 初回起動後の API キー設定の案内（既存の Settings 経路にリンク）
  - 対応 macOS バージョンと対応アーキテクチャの現状（判断未確定であれば「Apple Silicon Mac で動作確認済み」など、現時点で事実として言える範囲に留める）
- `SECURITY.md` の未署名警告に関する箇所から、README の該当インストール手順への相互リンクを追加する
- 必要に応じて公開前チェックリスト（`docs/tickets/2026-05-13-mvp-release-verification-checklist.md` で整理される予定）の参照先を調整する

## 非ゴール

- ランディングページの作成
- Developer ID 署名 / notarization の対応
- 自動更新の実装
- `.dmg` 生成スクリプトや electron-builder 設定の変更（別チケット `2026-05-13-macos-dmg-release-package.md` の範囲）
- アプリアイコンの設定（GitHub Issue #95 の人間判断後に別タスク化する）
- Windows / Linux 向けインストール手順

## 受け入れ条件

- [x] `README.md` に macOS インストール手順セクションが追加されている
- [x] DMG マウント → Applications コピー → Gatekeeper 警告対処 → 初回起動 → API キー設定までの流れが順に書かれている
- [x] Gatekeeper 警告対処方法が、誤った操作で他アプリの quarantine 属性まで外さないよう、`LiteLizard.app` 単体に対象を限定した安全な書き方になっている
- [x] 未署名配布・自動更新なし・MVP 扱いであることが利用者に分かる形で書かれている
- [x] `SECURITY.md` と README のインストール手順が矛盾していない
- [x] 既存 README のコンセプト・開発セクションを崩していない

## 検証方法

- [x] README を実際の手順通りに読んで、初見ユーザーでもインストールできる粒度か確認する
- [x] `SECURITY.md` / `PRIVACY.md` / `docs/tickets/2026-05-13-macos-dmg-release-package.md` と矛盾がないか確認する
- [x] 関連する既存テストを確認する
- [x] 必要なテストを追加または更新する
- [x] `pnpm -w lint`
- [x] `pnpm -w test`
- [x] `pnpm -w build`

## 関連

- GitHub Issue #95
- `docs/tickets/2026-05-13-macos-dmg-release-package.md`
- `docs/tickets/2026-05-13-mvp-release-verification-checklist.md`
- `SECURITY.md`
- `README.md`

## 完了メモ

完了。`README.md` に利用者向けの「macOS へのインストール」セクションを追加し、GitHub Releases からの `.dmg` ダウンロード、DMG マウント、`Applications` へのコピー、右クリック / Control クリックからの初回起動、Gatekeeper 警告への対処、初回起動後の作業フォルダ選択と API キー / Local LLM 設定導線を順番に記載した。

Gatekeeper の補助手順は `xattr -dr com.apple.quarantine /Applications/LiteLizard.app` に限定し、`/Applications` 全体や他アプリを対象にしない注意を明記した。`SECURITY.md` の未署名配布に関する説明から README のインストール手順へリンクし、`CHANGELOG.md` に完了履歴を追記した。

検証:
- README を実際の手順順に読み、DMG マウント → Applications コピー → Gatekeeper 警告対処 → 初回起動 → API キー / Local LLM 設定までの流れを確認。
- `SECURITY.md` / `PRIVACY.md` / `docs/tickets/done/2026-05-13-macos-dmg-release-package.md` / `apps/desktop/package.json` と矛盾がないことを確認。
- 関連する既存テストを確認。docs 変更のため新規テスト追加は不要と判断。
- `pnpm -w lint` 成功。
- `pnpm -w test` 成功（e2e 6 skipped）。
- `pnpm -w build` 成功。

残課題なし。
