# Ralph Loop

LiteLizard の GitHub Issue 運用とは分離した、ローカルチケット駆動の自律開発プロンプト。

チケットは `docs/tickets/` 配下の Markdown ファイルとして管理する。GitHub Issue、`agent-ready`、`in-progress`、`docs/agent-flow.md`、`prompts/agent-pickup.md` の運用には依存しない。

## やるべきこと

- `docs/tickets/` から次に着手すべきチケットを 1 件だけ選ぶ。チケットの front matter `status` は `todo` / `wip` / `done` のいずれかにする。
- `status: wip` のチケットが 1 件ある場合は、新規チケットを選ばず、そのチケットだけを継続する。
- `status: wip` のチケットが複数ある場合は異常状態として作業を止め、どのチケットを継続するべきか報告する。
- `status: done` のチケットは選ばない。
- `status: todo` のチケットを選んだら、実装前に `status: wip` と `started_at` を更新する。時刻は `YYYY-MM-DDTHH:mm:ss+09:00` 形式で書く。
- 選んだチケット本文に書かれたゴール、スコープ、非ゴール、受け入れ条件、検証方法を読む。
- 既存コード、関連仕様、`docs/wbs.md`、`CHANGELOG.md`、`docs/decisions.md` を必要な範囲で確認する。
- チケットの受け入れ条件を満たす最小変更を実装する。
- 実装後に得た、今後も再利用できる安定した学びがある場合だけ、`AGENTS.md` または該当する `.codex/skills/*/SKILL.md` に最小限追記する。
- 完了したチケットは受け入れ条件と検証方法のチェックを更新し、`status: done` と `completed_at` を更新したうえで、実装結果、実行した検証、残課題を短く追記する。時刻は `YYYY-MM-DDTHH:mm:ss+09:00` 形式で書く。

## 検証条件

完了判断では、チケット本文の検証方法に加えて、必ず既存テストと全体チェックを確認する。

- 変更前または実装前に、関連する既存テストを確認する。
- 変更内容に応じて、必要なテストを追加または更新する。
- 実装後に `pnpm -w lint` を実行し、成功させる。
- 実装後に `pnpm -w test` を実行し、成功させる。
- 実装後に `pnpm -w build` を実行し、成功させる。
- 失敗したチェックがある場合は原因を修正し、成功するまで再実行する。
- Electron UI の手動確認が必要な変更では、ブラウザ版 localhost ではなく、Electron 前提の確認方法またはテストで検証する。
- 最後に差分をセルフレビューし、受け入れ条件、非ゴール、不要な変更混入、テスト不足を確認する。

## やらないこと

- GitHub Issue をチケットとして扱わない。
- `agent-ready` / `in-progress` ラベル運用を使わない。
- `docs/agent-flow.md` や `prompts/agent-pickup.md` の手順をこのフローに持ち込まない。
- `prompts/ralph-loop.md` をループ中の自己改善対象にしない。
- チケットに書かれていない大きな仕様変更や別タスクを混ぜない。
- 完了メモの残課題を、同じループ内の次タスクとして扱わない。必要なら別チケット候補として残すだけにする。
- 失敗している lint / test / build を無視して完了扱いしない。
- `--no-verify` やテスト削除で検証を回避しない。
- 一時的な作業メモや今回限りの判断を `AGENTS.md` に固定しない。
