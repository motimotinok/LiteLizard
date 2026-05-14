---
status: done
started_at: 2026-05-14T19:13:19+09:00
completed_at: 2026-05-14T19:17:59+09:00
---

# プロジェクトフォルダ選択の安全範囲と新規フォルダ作成導線を整える

## 背景

MVP 公開前の手動確認中、アプリ起動時のプロジェクトフォルダ選択で、通常ユーザーが開くべきではない macOS のシステム領域やコード / 内部フォルダに見える場所まで選択できることが分かった。

また、フォルダ選択時に新規フォルダを作成する導線が見当たらず、LiteLizard 用の新しい作業フォルダをその場で作りたい場合に不便になっている。LiteLizard は選択フォルダ配下に `.litelizard/` や `.lzl` ファイルを書き込むため、危険または不自然な場所を選びにくくし、新しい作業フォルダを作りやすくする。

## ゴール

初回起動またはフォルダ選択時に、通常ユーザーが安全な作業フォルダを選びやすく、不適切なフォルダを選んだ場合は理由が分かる形で止められる。

## スコープ

- 起動時 / プロジェクト選択時のフォルダ選択 UI
- Electron の folder picker 設定
- フォルダ選択後の安全性チェックとユーザー向けエラー表示
- 新規フォルダ作成導線の追加または同等に分かりやすい作成方法の提示
- 前回フォルダ復元 / Recent projects との整合確認
- 関連する main / renderer / preload test の追加または更新

## 非ゴール

- 既存プロジェクト管理の保存形式変更
- `.lzl` 文書形式の変更
- Recent projects 全体の再設計
- macOS 以外の配布対応
- すべての危険パスを完全に網羅する高度な権限管理

## 受け入れ条件

- [x] フォルダ選択時に新規フォルダを作成できる、またはユーザーが新規作業フォルダを作るための明確な導線がある
- [x] macOS のシステム領域など、LiteLizard の作業場所として不適切なフォルダを選んだ場合に、そのまま通常プロジェクトとして進まない
- [x] 不適切なフォルダを選んだ場合、理由が分かる日本語メッセージが表示される
- [x] 通常のユーザーフォルダ配下では、既存通りプロジェクトを開ける
- [x] 既存の前回フォルダ復元 / Recent projects の基本挙動を壊していない
- [x] 不要な大規模リファクタリングが含まれていない

## 検証方法

- [x] 関連する既存テストを確認する
- [x] 必要な main / renderer / preload test を追加または更新する
- [x] Electron folder picker 設定と renderer fallback は IPC / renderer tests で確認し、実 GUI 手動確認項目は `docs/release-checklist.md` に反映する
- [x] `pnpm -w lint`
- [x] `pnpm -w test`
- [x] `pnpm -w build`

## 関連

- GitHub Issue #98
- GitHub Issue #93 の人間伴走チェック中に発見
- MVP 公開前の初回体験 / プロジェクトフォルダ選択 UX

## 完了メモ

実装結果:
- `openFolder` の Electron folder picker に `createDirectory`、button label、説明 message を追加し、新しい作業フォルダを作りやすくした。
- `projectManager.assertProjectLocationSafe` を追加し、ルート、macOS システム領域、`.git` / `.litelizard` / `node_modules`、LiteLizard 開発用 checkout に見えるフォルダをプロジェクト初期化前に拒否するようにした。
- 不適切なフォルダ選択時は renderer が `OPEN_FOLDER_FAILED` / `PROJECT_LOCATION_UNSAFE` の内部 prefix を外し、日本語理由を ProjectSetupScreen 側の状態メッセージとして表示するようにした。
- `docs/specs/project-management.md`、`docs/release-checklist.md`、`CHANGELOG.md` を更新した。

実行した検証:
- 追加前に `pnpm --filter @litelizard/desktop test -- ipc projectManager useAppStore` で関連既存テストを確認し、追加テストの失敗を確認。
- `pnpm --filter @litelizard/desktop test -- ipc projectManager useAppStore ProjectSetupScreen`
- `pnpm -w lint`
- `pnpm -w test`（E2E 6 件は既存どおり skipped）
- `pnpm -w build`
- `git diff --check`

残課題:
- OS ネイティブの folder picker を含む実 GUI 手動確認は Codex では未実施。公開前の `docs/release-checklist.md` で人間が確認する。
