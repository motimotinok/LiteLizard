## **必ず日本語で応答してください。**
実装を進めながら仕様を動的に変更していく予定のため、将来的な拡張性を加味した実装方針の検討や問題点の指摘などを行なってください。

---

## Codex の役割

- **仕様策定・設計判断**: ユーザーとの対話を通じて仕様を詰め、設計を決定する
- **実装全般**: すべての実装タスクを Codex が担う
- **タスク管理**: 思いつき・未着手・公開準備・将来構想・判断待ちは GitHub Issues に backlog として集約する
- **現在地の整理**: LLM が最初に見る入口は `NOW.md` とし、詳細な backlog は GitHub Issues を参照する
- **変更履歴の管理**: 完了したコード・仕様・UI・テスト変更は `CHANGELOG.md` に背景・意図・検証・残課題を記録する
- **設計判断の記録**: 確定した技術選択は `docs/decisions.md` に理由を記録する

---

## 作業方針

- ゴール、成功条件、制約、検証方法を先に確認する
- 既存コード、仕様、`NOW.md`、GitHub Issues、`CHANGELOG.md` を根拠に判断する
- UI の実装・調整・レビューでは `DESIGN.md` を読み、現行実装と競合する場合は文書内の移行方針に従う
- 実装経路は必要以上に固定せず、既存設計に沿って最小変更を選ぶ
- 可能な範囲でテスト、ビルド、レビューを行い、結果を報告する
- 不明点は勝手に大きく解釈せず、影響が大きい場合だけユーザーに確認する
- 小さいが明確な未着手タスクや、今すぐ実装しない必須作業は、ユーザーから別の保存先を明示されない限り GitHub Issue に記録する
- 仕様検討・将来構想・外部参照として残したいものも GitHub Issue を使う
- Issue を処理した作業が終わったら、Issue をクローズするかどうかをユーザーに確認する
- タスク中または完了時に、再利用可能な学び・作業ルール・プロンプト改善点が見つかった場合は、`AGENTS.md` または該当する `.codex/skills/*/SKILL.md` に最小限の追記を行ってよい
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

### リポジトリ衛生
- リポジトリにコミットするファイル（コード・設定・ドキュメント・テスト・スクリプト・チケット・CHANGELOG など何であれ）にユーザー固有の絶対パスを書かない。`/Users/<name>/...`、`/home/<name>/...`、`C:\Users\<name>\...` などは別環境（CI、他開発者、別 OS）で必ず壊れる。開発機固有設定は `~/.npmrc` などホーム配下に逃がし、コード内では `os.homedir()` / `path.join(...)` / 環境変数 / プロジェクト相対パスで表現する。例: `.npmrc` に `store-dir=/Users/jane/...` を書いて CI が `EACCES: mkdir '/Users'` で連続失敗した事例あり。

### renderer の SSR テスト時の zustand 注意
- 既存の renderer テストは `renderToStaticMarkup` を使う node 環境のテストが多い。zustand v5 の `useStore` は SSR 時に `useSyncExternalStore` の `getServerSnapshot` を経由し、**ストアの初期状態**を返す。`useAppStore.setState(...)` で値を変えても `renderToStaticMarkup` 内の `useAppStore(selector)` には反映されない。
- ストア値で分岐する JSX を SSR テストで検証したいときは、props 駆動の小コンポーネントに分離してそちらを直接 `renderToStaticMarkup` する。AnalysisPane 配下の `ChapterSummaryList` がその例。

---

## ファイルの役割分担

| ファイル | 役割 |
|---------|------|
| `README.md` | プロダクトのコンセプト、開発構成、起動・テスト方法の入口 |
| `DESIGN.md` | UI の見た目・操作感・モード設計・AIの見せ方に関する現行の判断基準 |
| `NOW.md` | LLM が最初に読む現在地。主目的、優先判断、見るべき親 Issueだけを短く示す |
| GitHub Issues | 思いつき、未着手、公開準備、将来構想、判断待ちを置く backlog |
| `docs/tickets/done/*.md` | 退役済み Ralph Loop の完了履歴。参照のみで更新しない |
| `CHANGELOG.md` | 完了した変更の履歴（何を、なぜ変えたか・検証・残課題） |
| `docs/decisions.md` | 設計判断ログ |
| `docs/LiteLizard_spec_v003.md` | 仕様書 |
| `docs/specs/*.md` | トピック別詳細仕様（実装者向け。決定経緯は decisions.md） |
| 退役済み Product Map | `docs/old/` 配下に履歴参照のみで残す。更新しない |
| `docs/old/wbs.md` | 退役済み WBS。履歴参照のみで更新しない |
| `docs/old/agent-flow.md` | 退役済み GitHub Issue 自律エージェント運用 |
| `prompts/old/agent-pickup.md` | 退役済み Issue pickup プロンプト |
| `prompts/old/ralph-loop.md` | 退役済み Ralph Loop プロンプト |
| `scripts/old/ralph-loop.sh` | 退役済み Ralph Loop 実行スクリプト |
| `.codex/skills/old/create-ralph-ticket/` | 退役済み Ralph チケット作成スキル |

---

## GitHub Issue / WBS の扱い

- GitHub Issue は、小さいが明確な未着手タスク、今すぐ実装しない必須作業、公開準備、将来構想、検討メモ、判断待ち、外部参照を置く backlog として使う
- Issue は LLM が後で読んで判断できる backlog カードにする。ゴール、制約・非ゴール、受け入れ条件、検証方法は残し、細かい実装手順や変更ファイルは原則固定しない
- 大きなテーマは #95 のような親 Issue にし、必要に応じて実装可能な子 Issue へ分ける
- Issue を処理した作業が終わったら、close するかどうかをユーザーに質問する。明示指示なしに自動 close しない
- `agent-ready` / `in-progress` ラベル運用は退役済み。参照が必要な場合は `docs/old/agent-flow.md` と `prompts/old/agent-pickup.md` を見る
- `docs/old/wbs.md` は退役済み。新規追加・完了更新はしない

## タスク化の流れ

- 思いつき、将来方向、公開準備、判断待ちは、ユーザーから別の保存先を明示されない限り GitHub Issue に記録する
- 次にやることを選ぶときは、`NOW.md`、open Issues、`CHANGELOG.md` を見て候補を絞る
- 実装すると決めた Issue は、追加のローカルチケットを作らず、その Issue のゴール・制約・受け入れ条件を作業単位として扱う
- 完了したコード・仕様・UI・テスト変更は `CHANGELOG.md` に記録する

関連スキル:

- `create-backlog-issue`: 思いつき・未着手・将来構想・判断待ちを GitHub Issue backlog に記録する
- `triage-issue-backlog`: `NOW.md` と open Issues を見て、次の候補や整理方針を提示する
- `update-now`: 現在地や公開方針が変わったときだけ `NOW.md` を短く更新する
- `update-changelog`: 完了した変更を `CHANGELOG.md` に記録する
