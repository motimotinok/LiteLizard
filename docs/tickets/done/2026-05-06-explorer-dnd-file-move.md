---
status: done
started_at: 2026-05-07T08:19:57+09:00
completed_at: 2026-05-07T08:25:32+09:00
---

# エクスプローラーで DnD ファイル移動を実装する

## 背景

WBS R-13 では、エクスプローラー DnD ファイル移動が未完了になっている。現在のプロジェクトエクスプローラーは `.lzl` ファイルやフォルダを表示できるが、ファイルをドラッグしてフォルダ間で移動する操作は未整備である。

## ゴール

エクスプローラー上で `.lzl` ファイルをフォルダへドラッグし、実ファイルと解析データの整合を保ったまま移動できる。

## スコープ

- `ExplorerPane.tsx` と file IPC の現在の移動・リネーム API を確認する
- 必要なら main / preload / shared bridge にファイル移動 API を追加する
- `.lzl` ファイルをフォルダへ DnD したときに移動できるようにする
- 移動後にエクスプローラー一覧、現在開いている文書パス、解析データ参照が破綻しないようにする
- 同名ファイル衝突や不正パスは安全に拒否する

## 非ゴール

- フォルダ自体の DnD 移動
- OS ファイルマネージャーからの外部ファイルドロップ
- 複数選択移動
- エクスプローラー全体の再設計

## 受け入れ条件

- [x] `.lzl` ファイルを別フォルダへ DnD で移動できる
- [x] 移動先に同名ファイルがある場合は上書きせず、安全に失敗する
- [x] プロジェクトルート外への移動は拒否される
- [x] 移動後にエクスプローラーが更新される
- [x] 開いている文書を移動した場合も保存先パスが整合する

## 検証方法

- [x] 関連する既存テストを確認する
- [x] 必要なテストを追加または更新する
- [x] `pnpm -w lint`
- [x] `pnpm -w test`
- [x] `pnpm -w build`

## 完了メモ

Explorer のファイル行を draggable にし、フォルダ行または root の空き領域への drop で `moveEntry` を呼ぶようにした。
main / preload / renderer store / mock bridge に `moveEntry(sourcePath, destinationFolderPath)` を追加し、同名ファイル衝突、プロジェクト外、別 project root、フォルダ source を拒否する。
開いている `.lzl` を移動した場合は `currentFilePath` と document source を更新し、解析 sidecar も移動する。
検証: `pnpm --filter @litelizard/shared build`、`pnpm --filter @litelizard/desktop test -- ipc ipcBridge preloadMockApi useAppStore`、`pnpm -w lint`、`pnpm -w test`、`pnpm -w build` 成功。
残課題: Electron 上の手動ドラッグ操作確認は未実施。

## 元 WBS

- R-13 エクスプローラー DnD ファイル移動
