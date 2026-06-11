---
status: done
started_at: 2026-05-14T08:40:22+09:00
completed_at: 2026-05-14T09:53:46+09:00
---

# フォルダを開いた直後の初期案内画面残りを修正する

## 背景

2026-05-12 の dev GUI 確認で、フォルダ選択ダイアログから作業フォルダを開いたあと、`.litelizard/` は作成されているにもかかわらず、画面側がまだ「フォルダを開く」初期案内または「準備中」の表示に留まる挙動が観測された。

リロードすると同じフォルダは workspace として復元され、エクスプローラーも表示されたため、フォルダ作成・保存自体ではなく、選択直後の state 更新、復元、または loading 表示解除まわりの不整合である可能性が高い。

## ゴール

ユーザーがフォルダを選択した直後に、追加操作なしで workspace 画面へ遷移し、選択したフォルダのツリーが表示される。

## スコープ

- フォルダ選択直後の `openFolder` / `hydrateProject` / `restoreLastProject` まわりの状態遷移確認
- `.litelizard/` 作成後に `startupState` と `rootPath` が正しく反映されることの修正
- 「準備中」表示や初期案内画面が残るケースの再現テスト追加または更新
- Electron dev 起動または Electron E2E による実機に近い確認

## 非ゴール

- 最近開いたフォルダ一覧の大きな再設計
- フォルダ選択 UI の全面変更
- packaged app 固有の起動確認
- ブラウザ版 localhost 単体でのドキュメント操作確認

## 受け入れ条件

- [x] フォルダ選択ダイアログで新規または既存の LiteLizard 作業フォルダを選ぶと、リロードなしで workspace 画面へ遷移する
- [x] 選択したフォルダ配下のファイル・フォルダツリーがエクスプローラーに表示される
- [x] `.litelizard/config.json` 作成後に初期案内画面へ戻らない
- [x] 失敗時は「フォルダを開けなかった」理由がユーザーに分かる statusMessage になる
- [x] 既存の前回フォルダ復元と最近開いたフォルダ機能を壊していない

## 検証方法

- [x] 関連する既存テストを確認する
- [x] 必要な renderer store / Electron E2E テストを追加または更新する
- [ ] Electron dev 起動でフォルダ選択直後の画面遷移を確認する
- [x] `pnpm -w lint`
- [x] `pnpm -w test`
- [x] `pnpm -w build`

## 完了メモ

起動時の `restoreLastProject()` が遅れて完了した場合に、手動 `openFolder()` / `hydrateProject()` で ready になった状態を古い復元結果で上書きできる競合を確認した。

`projectOpenRequestId` を追加し、最新のフォルダオープン要求だけが `startupState` / `rootPath` / `tree` を更新できるようにした。あわせて loading 画面の説明文は固定文言ではなく `statusMessage` を表示するようにした。

検証:

- `pnpm --filter @litelizard/desktop test -- useAppStore`
- `pnpm -w lint`
- `pnpm -w test`（e2e 6 skipped）
- `pnpm -w build`

残課題:

- Electron 実機でのフォルダ選択 GUI 確認は未実施。今回の原因だった非同期競合は renderer store の回帰テストで固定済み。
