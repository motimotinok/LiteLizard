必ず日本語で応答してください。
実装を進めながら仕様を動的に変更していく予定のため、将来的な拡張性を加味した実装方針の検討や問題点の指摘などを行なってください。

---

## Claude の役割

### Claude が担うこと
- **仕様策定・設計判断**: ユーザーとの対話を通じて仕様を詰め、設計を決定する
- **実装全般**: すべての実装タスク
- **WBS の更新・タスク割り振り**: `docs/wbs.md` にタスクを追加・優先度付けする
- **変更履歴の管理**: `CHANGELOG.md` に変更の背景・意図・残課題を記録する
- PR 修正後にローカルで `dev` へマージする際は、同時に `docs/wbs.md` と `CHANGELOG.md` も更新する
- **設計判断の記録**: `docs/decisions.md` に技術選択の理由を記録する

---

## アーキテクチャ上の制約

### Electron アプリであること
- このアプリは **Electron アプリ**。レンダラーは `window.litelizard`（Electron preload IPC）でファイル操作を行う
- **ブラウザ版 Playwright（localhost:5173）ではドキュメントを開けない** → 使わない
- 動作確認の選択肢（優先順）:
  1. **Codex レビュー** — ロジック検証はこれで十分かつ最速
  2. **Electron ごと起動する Playwright** — `_electron` fixture を使う
  3. **Lexical unit test** — Plugin 単体テスト

---

## ライブラリドキュメント調査

ライブラリ（Lexical, Electron, React 等）の API・挙動を調べるときは、ソースコードを直接読む前に **context7 MCP** を使う。

```
mcp__plugin_context7_context7__resolve-library-id  → ライブラリ ID を取得
mcp__plugin_context7_context7__query-docs          → ドキュメントを取得
```

context7 で見つからない実装詳細（内部挙動など）のみ、ソースコードを読む。

---

## ファイルの役割分担

| ファイル | 管理 | 役割 |
|---------|------|------|
| `docs/wbs.md` | git | タスク台帳（唯一の信頼できるソース） |
| `CHANGELOG.md` | git | 変更履歴（何を、なぜ変えたか・残課題の記録） |
| `docs/decisions.md` | git | 設計判断ログ |
| `docs/LiteLizard_spec_v003.md` | git | 仕様書 |
| `docs/specs/*.md` | git | トピック別詳細仕様（実装者向け。決定経緯は decisions.md） |

---

## サブエージェント利用ルール
サブエージェントは自己判断で自由に使ってよい。ユーザーへの確認は不要。調査・実装・レビュー・テストなど、必要と判断したら積極的に活用すること。

### コードベース調査
コードベースの広範な調査が必要な場合は **Explore エージェント**を使う。単純な検索は Glob / Grep を直接使う。
