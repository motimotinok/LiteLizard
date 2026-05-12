---
status: done
started_at: 2026-05-12T00:00:00+09:00
completed_at: 2026-05-12T22:30:00+09:00
---

# 初回起動と前回ディレクトリ復元の保存先挙動

## 背景

GitHub Issue #91 から切り出した公開前タスク。

LiteLizard はローカルファーストの Electron アプリとして、フォルダをプロジェクトの保存先として扱う。公開前には、初回起動時に保存先を選び、次回以降は直前に開いていたディレクトリを自然に復元する挙動を明確にしておく必要がある。

## ゴール

初回起動時は保存先ディレクトリを選択でき、2 回目以降は直前に開いていたディレクトリを自動で開く。復元できない場合は、ユーザーが別の保存先を選び直せる。

## スコープ

- 既存の `restoreLastProject()` / `hydrateProject()` / Recent files / project 管理の現状を確認する
- 直前に開いていたディレクトリを起動時に復元する挙動を公開前仕様として固定する
- 復元先が存在しない、読み込めない、権限がない場合の復旧導線を整える
- 保存先選択後に `.litelizard/` と `.lzl` 読み書きが期待通り動くことを確認する
- 必要に応じて仕様ドキュメントまたは決定ログを更新する

## 非ゴール

- クラウド同期やアカウント機能は扱わない
- 複数ワークスペースを同時に開く機能は作らない
- `.lzl` フォーマットの大幅変更はしない
- 大規模な既存ファイル移行フローは含めない

## 受け入れ条件

- [x] 初回起動時の保存先選択ルールが明確になっている
- [x] 2 回目以降に直前のディレクトリを自動復元する
- [x] 復元失敗時にエラーを握りつぶさず、ユーザーが保存先を選び直せる
- [x] 保存先に書き込み可能か確認している
- [x] Recent files や project 管理と矛盾しない
- [x] 既存の `.lzl` 読み書きが壊れていない

## 検証方法

- [x] project 管理 / app store / Recent files まわりの既存テストを確認する
- [x] 初回起動、前回ディレクトリ復元、復元失敗の回帰テストを追加または更新する
- [ ] Electron 起動による復元導線の手動確認は未実施（自動テストで代替）
- [x] `pnpm -w lint`
- [x] `pnpm -w test`
- [x] `pnpm -w build`

## 完了メモ

- `docs/specs/project-management.md` §5–§9 に復元失敗時の挙動と書き込み可否プローブを公開前仕様として固定し、`docs/decisions.md` に決定ログを追加した。
- `projectManager.ts` に `assertProjectWritable` を追加し、`.litelizard/.write-probe-<pid>-<rand>` を書き込み・即削除して書き込み可否を判定する。`ensureProject` と `listTree` IPC ハンドラで呼ぶことで、新規 / 復元の両経路で検出する。
- `main/appStore.removeRecentProject` を拡張し、削除対象が `lastOpenedFolder` と一致する場合は `lastOpenedFolder` を `null` にクリアする。renderer の `restoreLastProject` は復元失敗時に `removeRecentProject(failedPath)` を呼んで Recent と `lastOpenedFolder` を整合させる。
- 検証は `projectManager.test.ts` / `main/appStore.test.ts` / `renderer/useAppStore.test.ts` の単体テストでカバー（書き込み不可フォルダの検出 / `lastOpenedFolder` クリア / 復元失敗時の Recent 整合）。`pnpm -w lint` / `test` / `build` すべて成功。
- 残課題: Electron 起動での手動確認、署名済みインストーラ・パッケージ配布タスク（別チケット）に乗せる前提。書き込み権限テストの読み取り専用 chmod シナリオは POSIX のみ（Windows は別途）。
