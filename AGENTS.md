## **必ず日本語で応答してください。**
実装を進めながら仕様を動的に変更していく予定のため、将来的な拡張性を加味した実装方針の検討や問題点の指摘などを行なってください。

---

## Codex の役割

### Codex が担うこと
- **仕様策定・設計判断**: ユーザーとの対話を通じて仕様を詰め、設計を決定する
- **実装全般**: すべての実装タスクを Codex が担う
- **タスク管理**: 新規タスクは原則 GitHub Issue として管理し、`docs/wbs.md` への新規追加はユーザーが明示した場合だけ行う
- **WBS の更新**: 既存 WBS タスクの完了反映や整合性更新を行う
- **変更履歴の管理**: `CHANGELOG.md` に変更の背景・意図・残課題を記録する
- PR 修正後にローカルで `dev` へマージする際は、`CHANGELOG.md` を更新し、既存 WBS タスクに紐づく場合だけ `docs/wbs.md` も更新する
- **設計判断の記録**: `docs/decisions.md` に技術選択の理由を記録する

---

## 作業方針

- ゴール、成功条件、制約、検証方法を先に確認する
- 既存コード、仕様、WBS、CHANGELOG を根拠に判断する
- 実装経路は必要以上に固定せず、既存設計に沿って最小変更を選ぶ
- 可能な範囲でテスト、ビルド、レビューを行い、結果を報告する
- 不明点は勝手に大きく解釈せず、影響が大きい場合だけユーザーに確認する
- 後から湧いた新規タスク・残課題は、明示がなければ WBS ではなく GitHub Issue に残す
- タスク完了時に、今回の作業で得た再利用可能な学びを振り返る。次回以降の精度向上に効く具体的な改善があれば、`AGENTS.md` または該当する `.codex/skills/*/SKILL.md` に最小限の追記を行う
- 自己改善の追記は、安定した運用ルール・再発防止・検証手順の改善に絞る。一時的な作業メモ、今回限りの判断、未確定の実験フローは `AGENTS.md` に固定しない

---

## アーキテクチャ上の制約

### Electron アプリであること
- このアプリは **Electron アプリ**。レンダラーは `window.litelizard`（Electron preload IPC）でファイル操作を行う
- **ブラウザ版 Playwright（localhost:5173）ではドキュメントを開けない** → 使わない
- 動作確認の選択肢（優先順）:
  1. **Codex レビュー** — ロジック検証はこれで十分かつ最速
  2. **Electron ごと起動する Playwright** — `_electron` fixture を使う
  3. **Lexical unit test** — Plugin 単体テスト

### renderer の SSR テスト時の zustand 注意
- 既存の renderer テストは `renderToStaticMarkup` を使う node 環境のテストが多い。zustand v5 の `useStore` は SSR 時に `useSyncExternalStore` の `getServerSnapshot` を経由し、**ストアの初期状態**を返す。`useAppStore.setState(...)` で値を変えても `renderToStaticMarkup` 内の `useAppStore(selector)` には反映されない。
- ストア値で分岐する JSX を SSR テストで検証したいときは、props 駆動の小コンポーネントに分離してそちらを直接 `renderToStaticMarkup` する。AnalysisPane 配下の `ChapterSummaryList` がその例。

---

## ファイルの役割分担

| ファイル | 管理 | 役割 |
|---------|------|------|
| `docs/wbs.md` | git | 既存タスク台帳（新規追加は明示依頼時のみ） |
| `CHANGELOG.md` | git | 変更履歴（何を、なぜ変えたか・残課題の記録） |
| `docs/decisions.md` | git | 設計判断ログ |
| `docs/LiteLizard_spec_v003.md` | git | 仕様書 |
| `docs/specs/*.md` | git | トピック別詳細仕様（実装者向け。決定経緯は decisions.md） |
| `docs/agent-flow.md` | git | 自律エージェント運用ルール（ラベル定義・衝突判定・PR ルール） |
| `prompts/agent-pickup.md` | git | リモート VM 上で自律実行するエージェント向けプロンプト本体 |

---

## 自律エージェント運用

GitHub Issue を自律エージェント（Web Claude Code, クラウド Codex 等）が拾って PR を作るフローを採用している。詳細ルールは `docs/agent-flow.md`、エージェントが読む実行プロンプトは `prompts/agent-pickup.md` を参照。

主要な点:
- `agent-ready` ラベルが付いた Issue だけが自律エージェントの対象
- `in-progress` ラベル付きは着手中。同時 in-progress 上限は 2
- ブランチは必ず `dev` から切り、PR の base も `dev` を指定
- 完了時は `update-wbs-changelog` スキル経由で `CHANGELOG.md`（および該当 WBS 行）を更新し、PR 差分に含める

## Ralph Loop

`prompts/ralph-loop.md` を使う Ralph Loop は、GitHub Issue 駆動の自律エージェント運用とは別のローカルチケット運用として扱う。未完了チケットは `docs/tickets/`、完了済みチケットは `docs/tickets/done/` に置き、Ralph Loop 中に発見した具体的な残課題・バグ・追加改善は同プロンプトの制約に従って `docs/tickets/` に新規 `todo` チケットとして残してよい。GitHub Issue、`agent-ready`、`in-progress`、`docs/agent-flow.md`、`prompts/agent-pickup.md` の運用には混ぜない。

---

## サブエージェント利用ルール

サブエージェントは自己判断で自由に使ってよい。ユーザーへの確認は不要。調査・実装・レビュー・テストなど、必要と判断したら積極的に活用すること。

### コードベース調査
コードベースの広範な調査が必要な場合は **Explore エージェント**を使う。単純な検索は Glob / Grep を直接使う。
