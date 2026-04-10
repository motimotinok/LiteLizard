---
name: codex-batch
description: >
  大規模タスクを分解し Codex CLI で並列バッチ処理するスキル。
  タスク分解 → Plan エージェント並列プランニング → タスクリスト Markdown 生成 →
  codex exec 並列実行 → レビュー → 修正再実行のサイクルを回す。
  「Codexでバッチ処理して」「タスクリストをCodexで実行して」「一括で実装して」
  「Codexで並列実行して」と言われたとき、または多数の独立した定型タスクを
  Codex CLI で一括処理したい場面で使う。
---

# codex-batch スキル

大規模タスクを分解し、Codex CLI (`codex exec`) で並列バッチ処理する。

```
タスク分解 → Plan 並列プランニング → tasklist.md 生成
  → codex-batch.sh 実行 → レビュー → fix-tasklist.md → 再実行
```

---

## Step 1: タスク分解

ユーザーの大規模タスクを分析し、独立したサブタスクに分解する。

分解のガイドライン:
- 1タスク = 1ファイルまたは1つの小さな変更単位
- 複数ファイルにまたがる変更は避ける（codex exec は単一コンテキスト）
- ファイル競合がないことを確認する（同じファイルを複数タスクが変更しない）
- 各タスクは他タスクの結果に依存しない（ステートレス）

分解結果をリストとして整理する（タスク名 + 対象ファイル + 概要）。

---

## Step 2: 並列プランニング

各サブタスクに対して **Plan エージェントを並列起動**する。

```
Agent(subagent_type="Plan", run_in_background=true) x N
```

各 Plan エージェントへのプロンプトには以下を含める:
- サブタスクの目的と要件
- 対象ファイルパス
- 既存コードの関連箇所
- 制約事項

Plan エージェントの結果から、**1行で完結する実装指示**を作成する。
1行には以下を全て含める: 何をするか + 対象ファイル + 具体的な実装方針。

---

## Step 3: タスクリスト Markdown の作成

Plan エージェントの結果をもとに、タスクリスト Markdown を作成する。

保存先: `tmp/codex-batch/<batch-name>/tasklist.md`

### フォーマット

```markdown
---
dir: /Users/jane/litelizard/claude
concurrency: 3
---

src/components/Foo.tsx にエラーバウンダリを追加する。React.ErrorBoundary でラップし、エラー時は「読み込みに失敗しました」と表示する fallback を作成する。対象ファイル: src/components/Foo.tsx
src/utils/bar.ts に formatCurrency 関数を追加する。Intl.NumberFormat を使い通貨コードと数値を受け取って文字列を返す。対象ファイル: src/utils/bar.ts
```

### ルール

- **1行1タスク、改行なし** — sh の `while read` で直接読み取れる
- frontmatter: `dir`（作業ディレクトリ）、`concurrency`（並列数、デフォルト 3）
- 本文の各行がそのまま `codex exec` のプロンプトになる
- 空行・`#` で始まるコメント行は無視される
- 各行に十分なコンテキストを詰める（何をするか + 対象ファイル + 実装方針）

---

## Step 4: バッチ実行

Bash で以下を実行する:

```bash
bash .claude/skills/codex-batch/codex-batch.sh tmp/codex-batch/<batch-name>/tasklist.md
```

### オプション

```bash
bash .claude/skills/codex-batch/codex-batch.sh tasklist.md [-j 5] [-d /path/to/dir]
```

- `-j N`: 並列数を上書き（frontmatter の concurrency より優先）
- `-d DIR`: 作業ディレクトリを上書き（frontmatter の dir より優先）

### 実行中の挙動

- 各タスクの出力: `tmp/codex-batch-logs/<timestamp>/task_NN_result.txt`
- 全体ログ: `tmp/codex-batch-logs/<timestamp>/task_NN.log`
- 個別タスク失敗時も他タスクは継続
- `--full-auto` でサンドボックス内全操作を自動承認（タスクを止めない）
- 完了時にサマリー出力（成功/失敗数、失敗タスク詳細、ログパス）

---

## Step 5: レビュー

バッチ実行完了後、Claude Code 本体が全体レビューを行う。

1. `git diff` で変更差分を確認する
2. 以下の観点でレビュー:
   - 各タスクの実装が意図通りか
   - タスク間の整合性（型の一貫性、import の整合性）
   - 不要な変更や副作用がないか
3. 失敗タスクのログを確認する
4. 問題点をリストアップする

---

## Step 6: 修正タスクリスト → 再実行

レビューで問題が見つかった場合:

1. 修正内容を Step 3 と同じフォーマットで `tmp/codex-batch/<batch-name>/fix-tasklist.md` に書き込む
2. 同じスクリプトで再実行:
   ```bash
   bash .claude/skills/codex-batch/codex-batch.sh tmp/codex-batch/<batch-name>/fix-tasklist.md
   ```
3. 再度 `git diff` で確認し、問題がなければ完了

---

## 注意事項

- Codex は nvm 管理の Node.js で動く。`codex` が見つからない場合はスクリプト内で `source ~/.nvm/nvm.sh` を試行する
- 並列数のデフォルトは 3。API レート制限に注意し必要に応じて調整する
- 各 codex exec プロセスはステートレス（前のタスクの結果を知らない）
- ファイル競合が想定される場合は `/parallel-planner` で事前分析すること
- codex-delegate との違い: codex-delegate は単発委譲、codex-batch は複数タスクの一括処理
