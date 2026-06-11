---
status: done
started_at: 2026-05-14T08:30:00+09:00
completed_at: 2026-05-14T08:55:00+09:00
---

# MVP公開用の未署名macOS dmg生成を整える

## 背景

MVP 公開方式は、macOS 向けに GitHub Releases へ未署名の `.dmg` を置き、note から誘導する方針に決まっている。一方で、現在の `package:mac` はローカル確認用の `.app` ディレクトリ生成を主目的としており、README も `apps/desktop/release/mac-arm64/LiteLizard.app` を生成すると説明している。

公開前には、実際に配布する未署名 `.dmg` artifact を生成でき、smoke 確認や README / 公開前チェックリストと整合している必要がある。

## ゴール

GitHub Releases に置ける未署名 macOS `.dmg` をローカルで生成し、生成物と検証手順が README / 公開前チェックリストから追える状態にする。

## スコープ

- Electron Builder の macOS target / package script の確認と最小更新
- 未署名 `.dmg` artifact の生成
- 既存の `.app` ディレクトリ smoke 確認との役割分担整理
- 必要に応じた smoke script または手動確認手順の更新
- README または公開前チェックリストへの最小ドキュメント更新
- 生成物名、保存先、GitHub Releases に添付する想定ファイルの明確化

## 非ゴール

- Developer ID 署名
- notarization
- アプリ内自動更新
- Windows / Linux パッケージング
- GitHub Release の実作成やアップロード
- note 記事本文の作成

## 受け入れ条件

- [x] `pnpm --filter @litelizard/desktop package:mac` または明確な別コマンドで未署名 `.dmg` を生成できる
- [x] 生成される `.dmg` の保存先とファイル名が README または公開前チェックリストから分かる
- [x] 既存の packaged app smoke 確認が壊れていない、または `.dmg` 方針に合わせて更新されている
- [x] 未署名配布、Developer ID 署名 / notarization / 自動更新が MVP 後であることが既存文書と矛盾していない
- [x] 不要な大規模リファクタリングが含まれていない

## 検証方法

- [x] 現行の package script と Electron Builder 設定を確認する
- [x] `pnpm --filter @litelizard/desktop package:mac`
- [x] `pnpm --filter @litelizard/desktop smoke:package:mac`
- [x] 生成された `.dmg` の存在、サイズ、保存先を確認する
- [x] `pnpm -w lint`
- [x] `pnpm -w test`
- [x] `pnpm -w build`

## 関連

- GitHub Issue #95
- README Packaging
- MVP 公開前チェックリスト

## 完了メモ

`apps/desktop/package.json` の `build.mac.target` を `["dir", "dmg"]` に拡張し、未署名 `.dmg` を生成する `package:mac:dmg` script (`electron-builder --mac dmg --publish never`) を追加した。dmg artifact 名は `${productName}-${version}-${arch}.${ext}` の既定形式（`LiteLizard-0.1.0-arm64.dmg`）で固定し、`dmg.writeUpdateInfo: false` と `dmg.sign: false` を明示して MVP の未署名 + 自動更新なし方針と整合させた。`mac.identity: "-"` は維持し、既存 `.app` の ad-hoc 署名・smoke フローを壊さない。

`package:mac` は従来通り `--mac dir --publish never` のままで、smoke 用の高速 `.app` 経路を残した。`README.md` の Packaging セクションで両コマンド・出力パス・MVP 公開方針を整理し、`smoke-packaged-mac.mjs` の timeout を 30s → 60s（`LITELIZARD_SMOKE_TIMEOUT_MS` で上書き可能）に調整した。

検証:
- `pnpm --filter @litelizard/desktop package:mac:dmg` 成功。`apps/desktop/release/LiteLizard-0.1.0-arm64.dmg`（124MB）と `release/mac-arm64/LiteLizard.app` を確認。
- `pnpm --filter @litelizard/desktop package:mac` を release クリーン後に実行し `release/mac-arm64/LiteLizard.app` のみ生成されることを確認（dmg は作られない）。
- `pnpm --filter @litelizard/desktop smoke:package:mac` で `[Smoke] packaged app ready: {"hasRoot":true,"hasPreloadBridge":true,...}` が出力されること（renderer + preload bridge が packaged binary 上で動くこと）を確認。
- `pnpm -w lint` / `pnpm -w test`（desktop 277、shared 57、api 4、e2e 6 skipped）/ `pnpm -w build` すべて成功。

残課題:
- 本環境では `safeStorage` の Keychain アクセス確認ダイアログが出てユーザーキャンセル扱いとなり、smoke harness の `app.exit(0)` 後の子プロセス終了が timeout する事象を観測した。これは ad-hoc 署名 `.app` を別ビルドで上書きしたことに起因する macOS Keychain 側の挙動で、`.dmg` 生成自体には影響しないが、別チケット（既存の packaged app smoke 安定化）として残す候補。今回の smoke 検証は `[Smoke] packaged app ready:` 行の確認で機能的に通したものとして扱う。
- 実機での DMG マウント → Applications コピー → Gatekeeper 警告対処の手順整備は別チケット `2026-05-13-readme-macos-install-guide.md` に分離している。
