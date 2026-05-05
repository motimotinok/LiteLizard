---
name: create-ralph-ticket
description: "LiteLizard の Ralph Loop 用ローカルチケットを docs/tickets/ 配下に Markdown として作成するスキル。ユーザーが「Ralph Loop のチケットを作って」「ralph チケットにして」「docs/tickets にチケットを作成して」「ローカルチケット化して」などと明示した時だけ使う。GitHub Issue は作らず、WBS も自動更新しない。"
---

# Create Ralph Ticket

LiteLizard の Ralph Loop 用チケットを `docs/tickets/` 配下に Markdown ファイルとして作成する。

このスキルは、ユーザーが明示的に Ralph Loop / ローカルチケット作成を依頼した時だけ使う。自律実行中に勝手に新規チケットを作らない。

## 方針

- GitHub Issue とは完全に分離する。
- `gh issue create` は使わない。
- `docs/wbs.md` は更新しない。
- チケットは LLM が 1 回の作業単位として扱える粒度にする。
- 実装手順を細かく固定せず、ゴール、スコープ、非ゴール、受け入れ条件、検証方法を中心に書く。
- 検証方法には、原則として `pnpm -w lint`、`pnpm -w test`、`pnpm -w build` を含める。

## ファイル配置

保存先:

```text
docs/tickets/
```

ファイル名:

```text
YYYY-MM-DD-short-title.md
```

日本語タイトルの場合も、ファイル名は英数字とハイフン中心の短い slug にする。

## テンプレート

```markdown
# <チケットタイトル>

## 背景

なぜこのチケットが必要かを書く。

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

作成したファイルパスと、チケットのゴールを 1 行で報告する。
