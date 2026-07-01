# GitHub Release 運用手順

LiteLizard MVP の配布は、GitHub Actions の `MVP Release` workflow が `mvp-latest` Release を上書き更新する方式で行う。Developer ID 署名、notarization、アプリ内自動更新、Windows / Linux 配布はこの手順の対象外。

## 現在の公開方式

- Workflow: `.github/workflows/release.yml` の `MVP Release`
- Trigger: `main` への push、または `workflow_dispatch`
- Release tag: `mvp-latest`
- Release title: `LiteLizard MVP latest v<APP_VERSION>`
- Asset: `LiteLizard-latest-arm64.dmg`
- 対象環境: Apple Silicon Mac (arm64)
- 動作確認済み環境: macOS Tahoe 26.5.1

`LiteLizard-latest-arm64.dmg` は固定ファイル名で、常に `mvp-latest` の最新 asset を指す。古い versioned DMG 名を手順やリンクに戻さない。

## バージョンと Release 本文

`MVP Release` workflow は `apps/desktop/scripts/prepare-release-version.mjs` に `GITHUB_RUN_NUMBER` を渡し、ビルド前にアプリバージョンを決める。同じ workflow run の再実行では同じ version になり、新しい run では patch が進む。

workflow 内では package 後に `.app` の `CFBundleShortVersionString` を読み、算出した `APP_VERSION` と一致しない場合は Release 作成前に失敗する。Release title と Release body も同じ `APP_VERSION` を使うため、手動で Release 本文だけを書き換えて version を合わせる運用にはしない。

Release body に最低限含める内容:

```md
LiteLizard MVP の最新ビルドです (v<APP_VERSION>, commit <SHORT_SHA>)。

- 対象: Apple Silicon Mac (arm64) のみ
- 動作確認済み: macOS Tahoe 26.5.1
- その他の macOS バージョン: 未検証のため動作保証外です
- 形式: 未署名の `.dmg` です。初回起動時は Finder で右クリック → 「開く」で承認してください
- 更新: アプリ内自動更新には未対応です。最新版は本ページから `.dmg` を再ダウンロード・再インストールしてください
- インストール手順: リポジトリ README の "macOS インストール" 節を参照

このリリースは `main` 更新時に自動で上書き更新されます。
```

## 自動で確認されること

`MVP Release` workflow は次の順で失敗時に停止する。

1. `pnpm install --frozen-lockfile`
2. `pnpm --filter @litelizard/shared build`
3. `pnpm -w lint`
4. `pnpm -w test`
5. `pnpm -w build`
6. `pnpm --filter @litelizard/desktop package:mac:dmg`
7. packaged app version と `APP_VERSION` の一致確認
8. `apps/desktop/release/LiteLizard-latest-arm64.dmg` の存在確認
9. `mvp-latest` Release の作成または更新、既存 asset の削除、DMG upload

自動検証で十分なのは、依存解決、lint、テスト、workspace build、DMG 生成、アプリ内 version と Release version の一致、Release asset の存在まで。

## 人間が確認すること

公開前の GUI 操作、未署名アプリの起動、初回フォルダ選択、provider 設定、分析実行、更新後のローカルデータ保持は workflow だけでは確認できない。手動確認は `docs/release-checklist.md` に従う。

特に更新後の保持対象は `docs/specs/update-data-retention.md` を根拠にする。`appId`、`productName`、Electron `userData` の保存先を変える変更がある場合は、通常の Release 手順ではなくデータ移行を含む別判断として扱う。

## 失敗時の入口

GitHub Actions で失敗した場合は、まず `MVP Release` workflow の failed step を見る。CLI で確認する場合は次の順で原因を狭める。

```sh
gh run list --workflow "MVP Release" --limit 5
gh run view <run-id> --log
```

よく見る場所:

- install / build / test 失敗: 該当 step の log とローカルの同じ `pnpm` command
- DMG が見つからない: `apps/desktop/package.json` の `build.mac.artifactName` と workflow の `LiteLizard-latest-arm64.dmg`
- version mismatch: `prepare-release-version.mjs` の出力、`package.json` に書かれた version、`Info.plist` の `CFBundleShortVersionString`
- Release 更新失敗: `permissions.contents: write`、`GH_TOKEN`、`mvp-latest` Release の既存 asset

ローカルの制限環境で `hdiutil: create failed - 装置が構成されていません` になる場合は、macOS 自体の故障と断定しない。通常の macOS Terminal または許可済み環境で `pnpm --filter @litelizard/desktop package:mac:dmg` を再実行し、`apps/desktop/release/LiteLizard-latest-arm64.dmg` の存在まで確認する。

## 変更時に守ること

- `RELEASE_TAG` を変える場合は README、LP、更新確認 IPC、Release URL を同時に移行する。
- asset 名を変える場合は README、LP、`updateChecker`、release checklist、workflow の `Locate DMG artifact` を同時に移行する。
- `appId` / `productName` を変える場合は `docs/specs/update-data-retention.md` に沿って userData 移行を別タスク化する。
- Release 本文の対象 OS や対応範囲は、実機確認済み範囲より広げない。
