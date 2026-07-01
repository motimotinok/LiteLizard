---
name: triage-issue-backlog
description: "LiteLizard の GitHub Issue backlog を整理・優先度確認するスキル。ユーザーが「次に何をやるべき」「Issue を整理して」「優先度を見て」「backlog を見て」「公開前に残っているものを見て」などと依頼したときに使う。`NOW.md`、open Issues、`CHANGELOG.md` を読み、次の 1 件または小さな候補群を提示する。原則 non-mutating で、Issue 作成・コメント・ラベル変更は明示依頼がある時だけ行う。"
---

# Triage Issue Backlog

GitHub Issues を LiteLizard の backlog として読み、次に見るべき候補や整理方針を提示する。

## 基本方針

- 原則として non-mutating に動く
- `NOW.md`、open Issues、`CHANGELOG.md` を確認する
- 次の 1 件、または必要最小限の候補群に絞って提示する
- GitHub Issue、CHANGELOG、仕様文書の役割を混ぜない
- `agent-ready` / `in-progress` ラベル運用は退役済みとして扱う

## 読むもの

- `NOW.md`: 現在の主目的と親 Issue
- `gh issue list --state open --limit 100 --json number,title,labels,updatedAt,url`: open Issues
- 必要に応じて `gh issue view <number> --json title,body,labels,comments,url`: 候補 Issue の詳細
- `CHANGELOG.md`: 完了済みの事実

## 判断基準

- P0 / P1 は P2 より優先する
- #95 のような親 Issue は、実行対象ではなく判断や一覧の入口として扱う
- Issue が実装済みに見える場合は、コード・CHANGELOGで確認してから「close 確認候補」として出す
- 仕様判断が重いものは、実装候補ではなく「人間判断候補」として出す

## しないこと

- 明示依頼なしに Issue を作らない
- 明示依頼なしに Issue へコメントしない
- 明示依頼なしにラベルを変更しない
- Issue を自動 close しない
- `NOW.md` を Issue 一覧で膨らませない

## 報告形式

目的に合わせて、次のいずれかで短く報告する。

- **次の 1 件**: 推奨 Issue、理由、次アクション
- **候補群**: 2〜5 件の候補、優先順、判断が必要な点
- **整理結果**: 重複、実装済み疑い、blocked

Issue を処理した作業が完了している場合は、close するかをユーザーに確認する。
