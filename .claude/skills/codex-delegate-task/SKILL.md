---
name: codex-delegate-task
description: "Codex にタスクを委譲するためのスキル。WBS のタスクを Codex 用の TASK.md に書き出し、wbs.md の担当を更新する。「Codexにタスクを渡して」「Codexに委譲して」「Codex用のTASKを書いて」「次のタスクをCodexに振って」と言われたとき、または WBS でCodex向けタスクを特定した後に使う。codex-delegate（単体タスク実行スキル）とは別物。"
---

# Codex Task Delegation — Codex へのタスク委譲スキル

WBS (`docs/wbs.md`) から Codex に適したタスクを選定し、Codex の実行キュー (`/Users/jane/litelizard/codex/PROJECTMEMORY/TASK.md`) に書き出す。

---

## Step 1: 委譲判断

以下を**すべて**満たすタスクが Codex に適している:

- 入出力が明確で、完了条件をテストまたは目視で検証できる
- 設計判断・仕様策定が不要（既存パターンの踏襲・定型実装）
- 変更対象ファイルが明確に限定できる

**適する例**: テスト追加、CSS 調整、型修正、既存コンポーネントへの小機能追加
**適さない例**: Lexical 統合、ストア設計変更、複数ファイルにまたがる設計判断

---

## Step 2: TASK.md を書く

`/Users/jane/litelizard/codex/PROJECTMEMORY/TASK.md` を**上書き**する（Codex は常にこのファイルの先頭から実行する）。

テンプレートは `/Users/jane/litelizard/codex/PROJECTMEMORY/agent-prompts/TASK.md` を参照。以下が最低限の構造:

```markdown
## 🖥️ ダッシュボード
Wave N — 実行待ち（M タスク）
進捗: ✅ 0 / 🔄 0 / ⬜ M

## 📋 現在の Wave

### Wave N（並列実行）

> Wave 内のタスクはすべて**ファイル競合なし**で並列実行可能。
> 各タスクのスコープ制約を厳守し、指定外のファイルは変更しないこと。

#### Task: {wbs.md のタスクID} — {タスク名}
- **状態**: ⬜
- **変更ファイル**: `path/to/file.tsx`
- **スコープ制約**: 上記ファイルのみ変更可
- **指示**:
  > 実装内容の具体的な説明。
- **完了条件**: 「〜できる」「〜になっている」形式
```

### Wave 構成のルール

- **同一ファイルを触るタスク同士は別 Wave** に配置する（HARD/SOFT 問わず）
- 依存関係があるタスクも別 Wave にし、前提条件を明記する
- 各 Wave 内のタスク数は 3〜5 個を目安にする

### 競合マトリクス

複数タスクがある場合、競合状況を明示する:

```markdown
## 🔗 競合マトリクス

| | ID-A | ID-B | ID-C |
|------|------|------|------|
| ID-A | — | — | — |
| ID-B | — | — | SOFT |
| ID-C | — | SOFT | — |
```

---

## Step 3: WBS を更新

`docs/wbs.md` の該当タスクの担当を `Codex` に設定する。

---

## Step 4: ユーザーに通知

以下をユーザーに伝える:

> Codex の TASK.md を更新しました。Codex セッションで実行してください。

タスクの一覧（ID・タスク名・Wave 配置）を簡潔に報告する。
