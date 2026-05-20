---
name: create-ralph-ticket
description: "LiteLizard の Ralph Loop 用ローカルチケットを docs/tickets/ 配下に Markdown として作成するスキル。ユーザーが「Ralph Loop のチケットを作って」「ralph チケットにして」「docs/tickets にチケットを作成して」「ローカルチケット化して」などと明示した時、GitHub Issue から今すぐ実装する作業へ切り出す時、または Ralph Loop 中にプロンプトが許可する具体的な残課題・バグ・追加改善をチケット化する時に使う。Issue はクローズせず、退役済み WBS も更新しない。"
---

# Create Ralph Ticket

LiteLizard の Ralph Loop 用チケットを `docs/tickets/` 直下に Markdown ファイルとして作成する。

このスキルは、ユーザーが明示的に Ralph Loop / ローカルチケット作成を依頼した時に使う。Ralph Loop の自律実行中は、`prompts/ralph-loop.md` が許可している範囲でだけ新規チケットを作成してよい。

## 方針

- GitHub Issue backlog から今すぐ実装する作業を切り出す場合は、Source Issue 番号/URLをチケットに残す。
- `gh issue create` / `gh issue close` は使わない。
- チケット作成時にも完了時にも、元 Issue を自動 close しない。
- WBS は退役済みのため、`docs/old/wbs.md` は更新しない。
- Ralph Loop 実行中に作成するのは、今回の作業で実際に確認した具体的な残課題、バグ、追加改善だけにする。
- 作成するチケットは、同じ Ralph Loop 内では次タスクとして扱わない。次回以降の候補にする。
- チケットは LLM が 1 回の作業単位として扱える粒度にする。
- 新規チケットは `docs/tickets/` 直下に作成し、`docs/tickets/done/` には作成しない。
- `docs/tickets/done/` は Ralph Loop が完了済みチケットを移動するための置き場として扱う。
- 実装手順を細かく固定せず、ゴール、スコープ、非ゴール、受け入れ条件、検証方法を中心に書く。
- チケットの front matter に `status: todo`、空の `started_at`、空の `completed_at` を必ず入れる。
- `started_at` / `completed_at` は Ralph Loop が更新する欄で、値が入る場合は `YYYY-MM-DDTHH:mm:ss+09:00` 形式にする。
- 検証方法には、原則として `pnpm -w lint`、`pnpm -w test`、`pnpm -w build` を含める。

## ファイル配置

新規チケットの保存先:

```text
docs/tickets/
```

完了済みチケットの移動先:

```text
docs/tickets/done/
```

ファイル名:

```text
YYYY-MM-DD-short-title.md
```

日本語タイトルの場合も、ファイル名は英数字とハイフン中心の短い slug にする。

## テンプレート

```markdown
---
status: todo
started_at:
completed_at:
---

# <チケットタイトル>

## 背景

なぜこのチケットが必要かを書く。

Source Issue: ある場合は `#番号 URL` を書く。ない場合は `なし` と書く。

## ゴール

完了時に実現されている状態を書く。

## スコープ

このチケットで扱う範囲を書く。

## 非ゴール

このチケットではやらないことを書く。

## 受け入れ条件

- [ ] 観測可能な完了条件を書く
- [ ] 既存機能を壊していないことを書く

## 検証方法

- [ ] 関連する既存テストを確認する
- [ ] 必要なテストを追加または更新する
- [ ] `pnpm -w lint`
- [ ] `pnpm -w test`
- [ ] `pnpm -w build`

## 完了メモ

未着手。
```

## 作成後の報告

作成したファイルパス、チケットのゴール、Source Issue の有無を 1 行で報告する。元 Issue がある場合でも、このスキルでは close しない。
