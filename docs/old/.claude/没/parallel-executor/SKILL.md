---
name: parallel-executor
description: "parallel-plannerで生成された並列実行プランを実行するスキル。implementer x N（並列）→ マージ → integration-reviewer → debugger のパイプラインを実行する。「プランを実行して」「Waveを実行して」「並列実行開始」「さっきのプランで進めて」と言われたとき、または/parallel-plannerの出力後に実行フェーズに移る場面で必ず使う。プランの生成にはparallel-plannerを使う。"
---

# Parallel Executor — 並列プラン実行スキル

`/parallel-planner` で生成されたプラン（または同等の並列実行プラン）を受け取り、Wave 単位で implementer パイプラインを実行する。

**重要: サブエージェントは他のサブエージェントを生成できない。** パイプラインの各ステップは Claude 本体（メインスレッド）が直接起動・制御する。

---

## パイプライン構成

```
implementer x N（並列、isolation: worktree）
  └─ 各 implementer 内で: 実装 → テスト → codex-delegate レビュー → 修正ループ
       ↓
SubagentStop フック発火 → 親が per-implementer でマージ + クリーンアップ
       ↓
integration-reviewer x 1（dev 上、isolation なし）
  └─ 全体整合チェック → 指摘リスト出力
       ↓
debugger x 1（dev 上、isolation なし）— 指摘がある場合のみ
  └─ 指摘に基づき修正
```

---

## Wave 実行手順

各 Wave について以下を実行する。

### Step 0: 準備

- dev を最新化: `git fetch origin && git merge origin/dev`

### Step 1: implementer（並列実行）

- Wave 内の全タスクの **implementer** を `run_in_background: true` で**並列起動**する
- implementer は frontmatter に `isolation: worktree` が設定されているため、Claude Code が自動的に一時的な git worktree を作成する
- 各プロンプトにはタスク情報（指示・スコープ制約・完了条件・テスト要否）を含める
- 全タスクの完了通知を待つ
- 各エージェントの結果（**worktree パス**・**ブランチ名**・変更ファイルリスト・実装内容の要約・レビュー結果）を保持する

### Step 2: マージ + クリーンアップ

`SubagentStop` フックが発火し、additionalContext でマージ指示が親に通知される。

各 implementer の完了ごとに:
1. implementer の結果からブランチ名・worktree パスを取得
2. メインディレクトリで dev にマージ:
   ```
   cd /Users/jane/litelizard/claude
   git merge <branch>
   ```
3. worktree とブランチをクリーンアップ:
   ```
   git worktree remove <worktree-path>
   git branch -d <branch>
   ```
4. コンフリクト発生時はユーザーに報告（planner でファイル競合は排除済みのため通常は発生しない）

> **注意**: `isolation: worktree` で起動した場合、変更がなければ worktree は自動削除されるが、
> implementer は必ず変更を行うため worktree は残る。親が明示的にクリーンアップする必要がある。

### Step 3: integration-reviewer（統合レビュー）

- 全 implementer のマージ完了後に **integration-reviewer** を起動する
- **`isolation` は指定しない** — マージ済みの dev 上で全体整合をレビューする
- プロンプトには全 implementer の変更ファイルリストと実装要約を含める
- 問題がなければ完了。問題があれば指摘リストを受け取る

### Step 4: debugger（修正）— 指摘がある場合のみ

- integration-reviewer が指摘を出した場合のみ **debugger** を起動する
- **`isolation` は指定しない** — dev 上で直接修正する
- 修正後、必要に応じて integration-reviewer を再起動する（最大2回）

### Step 5: 次の Wave に進む

- Wave 間に依存がある場合、前 Wave の該当成果物が正しく生成されていることを検証してから次 Wave を開始する

### Step 6: 全 Wave 完了後、ユーザーに結果を報告する

---

## 各サブエージェントへ渡す情報

### implementer

| 項目 | 必須 |
|------|------|
| タスクの目的と完了条件 | 必須 |
| 変更対象ファイルの明示的リスト（スコープ制約） | 必須 |
| テスト要否 | 必須 |
| 関連する仕様・decisions.md の参照先 | 該当する場合 |

### integration-reviewer

| 項目 | 必須 |
|------|------|
| 全 implementer の変更ファイルリスト | 必須 |
| 各 implementer の実装内容の要約 | 必須 |
| Wave 内のタスク一覧 | 必須 |

### debugger

| 項目 | 必須 |
|------|------|
| integration-reviewer の指摘リスト（全文） | 必須 |
| 対象ファイルパス | 必須 |

---

## スコープ制約の厳守

- 各 implementer には**プランで指定されたファイルのみ変更可能**という制約を明示すること
- テストファイル（`*.test.ts`, `*.test.tsx`）は暗黙的にスコープに含まれる
- **メモリ書き込みの制約**: 並列起動するサブエージェントのプロンプトには**「メモリの更新は行わないこと」**を明記する
