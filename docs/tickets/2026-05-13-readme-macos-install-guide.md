---
status: todo
started_at:
completed_at:
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

- [ ] `README.md` に macOS インストール手順セクションが追加されている
- [ ] DMG マウント → Applications コピー → Gatekeeper 警告対処 → 初回起動 → API キー設定までの流れが順に書かれている
- [ ] Gatekeeper 警告対処方法が、誤った操作で他アプリの quarantine 属性まで外さないよう、`LiteLizard.app` 単体に対象を限定した安全な書き方になっている
- [ ] 未署名配布・自動更新なし・MVP 扱いであることが利用者に分かる形で書かれている
- [ ] `SECURITY.md` と README のインストール手順が矛盾していない
- [ ] 既存 README のコンセプト・開発セクションを崩していない

## 検証方法

- [ ] README を実際の手順通りに読んで、初見ユーザーでもインストールできる粒度か確認する
- [ ] `SECURITY.md` / `PRIVACY.md` / `docs/tickets/2026-05-13-macos-dmg-release-package.md` と矛盾がないか確認する
- [ ] 関連する既存テストを確認する
- [ ] 必要なテストを追加または更新する
- [ ] `pnpm -w lint`
- [ ] `pnpm -w test`
- [ ] `pnpm -w build`

## 関連

- GitHub Issue #95
- `docs/tickets/2026-05-13-macos-dmg-release-package.md`
- `docs/tickets/2026-05-13-mvp-release-verification-checklist.md`
- `SECURITY.md`
- `README.md`

## 完了メモ

未着手。
