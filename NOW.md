# LiteLizard NOW

最終更新: 2026-05-23

このファイルは LLM が最初に読む現在地。タスク台帳ではなく、詳細な backlog は GitHub Issues を見る。

## 現在の主目的

MVP を外部公開できる状態にする。まず macOS 向けの未署名 `.dmg` を GitHub Releases で配布し、note などから誘導する前提で整える。

## 優先判断

- #95 MVP 公開コントロールを親 Issue として見る。
- #100 の判断により、MVP は Apple Silicon 向け `arm64.dmg` 配布で進める。
- #93 provider contract の残確認: OpenAI / Anthropic は再確認済み、local-llm endpoint への接続は `http://localhost:11434` 到達不能のため未完了。schema 経路ではなく環境問題として公開判断に回す。
- #101 軽量更新通知（GitHub Releases `mvp-latest` 参照、起動時チェック、設定画面の `LiteLizard について` タブ）は実装済み。右下フローティングバナーから歯車アイコンの青いバッジ + 設定 About タブの DMG ダウンロードボタンに 2026-05-23 で置き換え済み。
- #89 はアプリ内自動更新ではなく「最新版検知 + 手動 DMG ダウンロード導線」として MVP 範囲で完了扱い。本格自動更新（electron-updater + Developer ID 署名 + notarization）は MVP 後対応。
- MVP 配布導線として、`main` 更新時に `.github/workflows/release.yml` が macos-latest 上で `LiteLizard-latest-arm64.dmg` をビルドし `mvp-latest` Release を上書き。LP 等からは `https://github.com/motimotinok/LiteLizard/releases/download/mvp-latest/LiteLizard-latest-arm64.dmg` の静的 URL を直リンク可能。
- 公開直前は `docs/release-checklist.md` の自動検証と手動 GUI 確認を通す。
- #90 ランディングページ、#94 Gemini provider は原則 MVP 後候補。

## 実行キュー

- 思いつき、未着手、公開準備、将来構想、判断待ちは GitHub Issues に置く。
- 今すぐ実装すると決めた作業だけ `docs/tickets/` に Ralph Loop チケットとして切り出す。
- 完了済みチケットは `docs/tickets/done/`、完了した事実は `CHANGELOG.md` を見る。

## 参照先

- backlog: GitHub Issues
- 親 Issue: #95
- 実行キュー: `docs/tickets/`
- 完了履歴: `CHANGELOG.md`
- 確定仕様: `docs/specs/` と `docs/decisions.md`
