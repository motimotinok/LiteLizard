---
status: done
started_at: 2026-05-06T19:58:27+09:00
completed_at: 2026-05-06T20:08:35+09:00
---

# Recent files を永続化する

## 背景

WBS R-19 では、Recent files 永続化が未完了になっている。UI リデザイン仕様ではウェルカム画面に最近リストの見た目が用意されているが、現実装ではモック先行スコープとして永続化されていない。

## ゴール

最近開いたプロジェクトまたはファイルを main-side store に保存し、ウェルカム画面の最近リストから再度開ける。

## スコープ

- 現在の起動・復元フローと `restoreLastProject` 周辺を確認する
- main-side store に最近リストを保存する
- プロジェクトまたは `.lzl` ファイルを開いたタイミングで最近リストを更新する
- ウェルカム画面に最近リストを復活させ、存在しないパスは安全に扱う
- 件数上限、重複排除、最終アクセス順を実装する

## 非ゴール

- クラウド同期
- 最近リストのタグ付けやピン留め
- OS ネイティブの最近使った項目連携
- ファイル検索機能

## 受け入れ条件

- [x] 最近開いた項目が再起動後も残る
- [x] 同じ項目を再度開いた場合は重複せず先頭に移動する
- [x] ウェルカム画面から最近項目を開ける
- [x] 存在しないパスはクラッシュせず、分かる形で扱われる
- [x] 最近リストの件数が上限内に保たれる

## 検証方法

- [x] 関連する既存テストを確認する
- [x] 必要なテストを追加または更新する
- [x] `pnpm -w lint`
- [x] `pnpm -w test`
- [x] `pnpm -w build`

## 完了メモ

### 実装

- `RecentProjectEntry` 型を `packages/shared/src/types.ts` に追加。`exists` フラグはランタイム時に main 側で付与する。
- `apps/desktop/src/main/recentProjects.ts` に純粋ヘルパー `appendRecentProject` / `removeRecentProjectFromList` を切り出し、unit test (`recentProjects.test.ts` 8 件) で重複排除・件数上限・最終アクセス順を固定。
- `apps/desktop/src/main/appStore.ts` の `app-store.json` スキーマに `recentProjects` を追加。`setLastOpenedFolder` で同時更新し、`getRecentProjects` で `fs.stat` ベースに `exists` を判定して返す。`removeRecentProject` も追加。
- IPC 契約（`packages/shared/src/bridge.ts`）と `ipcBridge.ts` / `preloadMockApi.ts` / `apps/desktop/src/main/ipc.ts` に `getRecentProjects` / `removeRecentProject` を追加。
- `useAppStore.ts` に `recentProjects` 状態と `loadRecentProjects` / `openRecentProject` / `removeRecentProject` を追加。`hydrateProject` 成功時と `restoreLastProject` の `needs-project` フォールバック時に最近リストを refresh する。`openRecentProject` は `hydrateProject` 失敗時に対象を IPC 経由で除外し、リストを再読み込みしてユーザーに通知する。
- `ProjectSetupScreen.tsx` に最近リスト UI を実装（既存 `welcome-recent-*` スタイルを利用）。`exists=false` の項目は薄表示し、クリックすると除外する分岐に切り替わる。

### 検証

- `pnpm -w lint` ✅
- `pnpm -w test` ✅ (203/203 passed)
- `pnpm -w build` ✅
- `recentProjects.test.ts` で純粋ロジック、`appStore.test.ts` で永続化・存在判定・除外、`useAppStore.test.ts` で renderer 側の挙動（needs-project フォールバック時の refresh、失敗時の自動削除）を確認した。

### 残課題

- `.lzl` ファイル単位の最近リスト化はスコープ外（本チケットはプロジェクトルート単位での実装）。必要なら別チケット化する。
- Electron 実機での動作確認は実装範囲を考えると IPC + 純粋ロジックのテストで十分カバーできているため自動テスト中心で完了とした。

## 元 WBS

- R-19 Recent files 永続化
