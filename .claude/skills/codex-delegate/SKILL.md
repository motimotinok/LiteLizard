---
name: codex-delegate
description: >
  Codex CLI に定型コード生成・変換・レビューを委譲するスキル。
  ユーザーが「Codexに任せて」「Codexでレビューして」「Codexで生成して」「Codexに投げて」と言ったとき、
  または単純・定型的な作業（テスト追加、型注釈付与、リファクタリング、コードレビュー）を
  ファイル単位・モジュール単位で行う場合は必ずこのスキルを使う。
  複数ファイルにまたがる設計変更・バグ調査・アーキテクチャ判断が必要な作業は対象外。
---

# codex-delegate スキル

Codex CLI（`.claude/hooks/codex-delegate.sh`）を使って定型作業を委譲する。
Claude Code が直接編集するより Codex に任せた方が良い場面：コンテキストが少なくて済む単純変換、
テンプレート的なコード追加、uncommitted changes のレビュー。

## モード選択

| やること | モード |
|---|---|
| テスト追加・型注釈・定型リファクタ・コード変換 | `gen` |
| uncommitted changes のコードレビュー | `review` |

---

## gen モード（コード生成・変換）

Codex がファイルを自動書き込みするため、**実行前に必ずユーザーへ確認する**。

1. ユーザーの指示から「対象ディレクトリ」と「Codex に渡すプロンプト」を決める
2. 実行前に確認する：
   - 対象ディレクトリ（デフォルト: `/Users/jane/liteLizard/claude`）
   - Codex に渡すプロンプト（日本語可）
3. 承認を得たら Bash で実行する：
   ```bash
   .claude/hooks/codex-delegate.sh gen /Users/jane/liteLizard/claude "（Codex へ渡すプロンプト）"
   ```
4. 完了後に `git diff` で変更を確認し、ユーザーに報告する
5. 意図と異なる変更があれば `git checkout <file>` で元に戻すことを提案する

---

## review モード（コードレビュー）

uncommitted changes（staged・unstaged・untracked）を Codex にレビューさせる。
ユーザーが「Codexでレビューして」と言ったときはこのモード。

1. Bash で実行する：
   ```bash
   .claude/hooks/codex-delegate.sh review /Users/jane/liteLizard/claude
   ```
2. 出力されたレビュー結果を要約してユーザーに報告する

---

## 注意事項

- Codex は nvm 管理の Node.js で動く。`codex` コマンドが見つからない場合は `source ~/.nvm/nvm.sh` を案内する（スクリプト内でも事前チェック済み）
- 他プロジェクトでも `DIR` 引数を変えれば流用できる
