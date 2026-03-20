---
name: parallel-executor
description: "parallel-plannerで生成された並列実行プランを実行するスキル。Wave単位でサブエージェント（plan-executor → feature-test-writer → code-reviewer → debugger）をチェーン実行する。「プランを実行して」「Waveを実行して」「並列実行開始」「さっきのプランで進めて」と言われたとき、または/parallel-plannerの出力後に実行フェーズに移る場面で必ず使う。プランの生成にはparallel-plannerを使う。"
---

# Parallel Executor — 並列プラン実行スキル

`/parallel-planner` で生成されたプラン（または同等の並列実行プラン）を受け取り、Wave 単位でサブエージェントをチェーン実行する。

**重要: サブエージェントは他のサブエージェントを生成できない。** チェーンの各ステップは Claude 本体（メインスレッド）が直接起動・制御する。

---

## エージェントチェーン

各タスクは以下の順序でサブエージェントをチェーン実行する:

```
plan-executor → feature-test-writer → code-reviewer → debugger
                                            ↑              ↓
                                            └──────────────┘
                                          問題解消までループ（最大3回）
```

1. **plan-executor**（実装）— プランの指示に従いコーディング。スコープ外のファイル変更は禁止
2. **feature-test-writer**（テスト）— 実装された機能の要件ベーステストを作成・実行
3. **code-reviewer**（レビュー）— 実装とテストをレビュー。問題なければ LGTM → 完了。問題あれば指摘事項を出す
4. **debugger**（修正）— code-reviewer の指摘をもとに修正。修正後 → 再び code-reviewer へ

---

## チェーンレベル

タスクサイズに応じてチェーンの段数を調整する。

| レベル | 対象 | チェーン構成 |
|--------|------|-------------|
| **Full** | 新機能追加、複数ファイル変更、ロジック変更 | plan-executor → feature-test-writer → code-reviewer → debugger（通常フロー） |
| **Light** | 単一ファイルの小規模変更（10〜50行程度）、スタイル修正、既存パターンの踏襲 | plan-executor → code-reviewer（テスト省略、問題あれば debugger 1回のみ） |
| **Direct** | 変更10行以下、型修正、typo修正、設定値変更、import追加 | plan-executor のみ（レビュー・テスト省略） |

**判断基準:** S かつ変更ファイル1個 → Light or Direct / M 以上 → Full / 迷ったら Full

---

## Wave 実行手順

各 Wave について以下を実行する:

1. **Step 1: plan-executor（実装）**
   - Wave 内の全タスクの `plan-executor` を `run_in_background: true` で**並列起動**する
   - 各プロンプトにはタスク情報（指示・スコープ制約・完了条件）を含める
   - 全タスクの完了通知を待つ

2. **Step 2: feature-test-writer（テスト）** — Full チェーンのみ
   - Step 1 完了後、Full チェーンのタスクに対して `feature-test-writer` を並列起動する
   - プロンプトには Step 1 の実装結果（変更ファイル・実装内容の要約）を含める
   - 全タスクの完了通知を待つ

3. **Step 3: code-reviewer（レビュー）** — Full / Light チェーン
   - Step 2 完了後（Light は Step 1 完了後）、`code-reviewer` を並列起動する
   - プロンプトにはレビュー対象ファイルリストを必ず含める
   - 全タスクの完了通知を待つ

4. **Step 4: debugger（修正）** — レビューで指摘があったタスクのみ
   - code-reviewer が指摘を出したタスクに対して `debugger` を起動する
   - 修正後、再度 code-reviewer を起動する（review-debug ループ、最大3回）

5. **次の Wave に進む**
   - Wave 間に依存がある場合、前 Wave の該当成果物が正しく生成されていることを検証してから次 Wave を開始する

6. **全 Wave 完了後、ユーザーに結果を報告する**

---

## 各サブエージェントへ渡す情報

| 項目 | 必須 |
|------|------|
| タスクの目的と完了条件 | 必須 |
| 変更対象ファイルの明示的リスト（スコープ制約） | 必須 |
| レビュー対象ファイルリスト（code-reviewer 用） | 必須 |
| 関連する仕様・decisions.md の参照先 | 該当する場合 |
| 前段エージェントの出力 | チェーン2段目以降 |

---

## スコープ制約の厳守

- 各タスクのサブエージェントには**プランで指定されたファイルのみ変更可能**という制約を明示すること
- テストファイル（`*.test.ts`, `*.test.tsx`）は暗黙的にスコープに含まれる
- **メモリ書き込みの制約**: 並列起動するサブエージェントのプロンプトには**「メモリの更新は行わないこと」**を明記する
