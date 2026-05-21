# LiteLizard NOW

最終更新: 2026-05-21

このファイルは LLM が最初に読む現在地。タスク台帳ではなく、詳細な backlog は GitHub Issues を見る。

## 現在の主目的

MVP を外部公開できる状態にする。まず macOS 向けの未署名 `.dmg` を GitHub Releases で配布し、note などから誘導する前提で整える。

## 優先判断

- #95 MVP 公開コントロールを親 Issue として見る。
- #100 の判断により、MVP は Apple Silicon 向け `arm64.dmg` 配布で進める。
- #93 provider contract の残確認を公開前必須として扱う。OpenAI / Anthropic は再確認済み、local-llm endpoint と UI 登録経由確認が残る。
- 公開直前は `docs/release-checklist.md` の自動検証と手動 GUI 確認を通す。
- #89 自動更新、#90 ランディングページ、#94 Gemini provider は原則 MVP 後候補。

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
