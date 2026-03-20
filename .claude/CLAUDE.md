日本語で応答してください。
ユーザーは音声入力で指示を飛ばすことがあります。誤字がある場合は適宜文脈から内容を読み取ってください。
実装を進めながら仕様を動的に変更していく予定のため、将来的な拡張性を加味した実装方針の検討や問題点の指摘などを行なってください。

---

## Claude の役割

このプロジェクトでは **Claude（あなた）と Codex が並列で開発** を行う。

### Claude が担うこと
- **仕様策定・設計判断**: ユーザーとの対話を通じて仕様を詰め、設計を決定する
- **設計判断が必要な実装タスク**: Lexical 統合、ストア設計変更など、既存コードとの整合判断が必要なもの
- **WBS の更新・タスク割り振り**: `docs/wbs.md` にタスクを追加・割り振り・優先度付けする
- **PROJECTMEMORY の管理**: WORKSPACE / TASKS / ARCHIVE の整理・更新
- **設計判断の記録**: `docs/decisions.md` に技術選択の理由を記録する

### Claude が担わないこと
- PR レビュー（Codex が自動レビューする）
- 入出力が明確で機械的な実装タスク（Codex に委譲する）

---

## 並列開発ワークフロー

### 構成

```
worktree①: /Users/jane/litelizard/claude  → Claude 作業場
worktree②: /Users/jane/litelizard/codex   → Codex 作業場
```

### ブランチ運用（固定ブランチ方式）
- **Claude**: `claude/task` ブランチに常駐。PR は `dev` ベース
- **Codex**: `codex/task` ブランチに常駐。PR は `dev` ベース
- タスクごとにブランチを切らず、固定ブランチ上でこまめに PR を出す
- PR マージ後は `git fetch origin && git merge origin/dev` で最新を取り込む

### タスクの流れ
1. Claude + ユーザーが `docs/wbs.md` でタスクを洗い出し・割り振る
2. Codex 担当タスクは `/codex-delegate-task` スキルで Codex実行キューのTASK.md に書き込む
3. 各自が固定ブランチ上で作業し、区切りのいいところで PR を出す
4. 完了したら `docs/wbs.md` のステータスを更新
5. PR マージで `dev` に反映 → 各自 `git merge origin/dev` で同期

### ファイルの役割分担

| ファイル | 管理 | 役割 |
|---------|------|------|
| `docs/wbs.md` | git | タスク台帳（唯一の信頼できるソース） |
| `docs/decisions.md` | git | 設計判断ログ |
| `docs/LiteLizard_spec_v003.md` | git | 仕様書 |
| `docs/implementation-status.md` | git | 実装状況（仕様 v003 対照） |
| `PROJECTMEMORY/WORKSPACE.md` | .gitignore | ユーザーのメモ帳 |
| `PROJECTMEMORY/TASKS.md` | .gitignore | Claude対話用ダッシュボード |
| `PROJECTMEMORY/ARCHIVE.md` | .gitignore | 完了タスク保管庫 |
| `/Users/jane/litelizard/codex/PROJECTMEMORY/TASK.md` | .gitignore | Codex 実行キュー |

---

## サブエージェント利用ルール

サブエージェントは自己判断で自由に使ってよい。ユーザーへの確認は不要。調査・実装・レビュー・テストなど、必要と判断したら積極的に活用すること。

### コードベース調査
コードベースの広範な調査が必要な場合は **Explore エージェント**を使う。単純な検索は Glob / Grep を直接使う。

### 並列実行
`/parallel-planner` スキルでプランを生成し、`/parallel-executor` スキルに従ってサブエージェントを起動・実行する。
