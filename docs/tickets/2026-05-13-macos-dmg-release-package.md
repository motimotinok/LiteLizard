---
status: todo
started_at:
completed_at:
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

- [ ] `pnpm --filter @litelizard/desktop package:mac` または明確な別コマンドで未署名 `.dmg` を生成できる
- [ ] 生成される `.dmg` の保存先とファイル名が README または公開前チェックリストから分かる
- [ ] 既存の packaged app smoke 確認が壊れていない、または `.dmg` 方針に合わせて更新されている
- [ ] 未署名配布、Developer ID 署名 / notarization / 自動更新が MVP 後であることが既存文書と矛盾していない
- [ ] 不要な大規模リファクタリングが含まれていない

## 検証方法

- [ ] 現行の package script と Electron Builder 設定を確認する
- [ ] `pnpm --filter @litelizard/desktop package:mac`
- [ ] `pnpm --filter @litelizard/desktop smoke:package:mac`
- [ ] 生成された `.dmg` の存在、サイズ、保存先を確認する
- [ ] `pnpm -w lint`
- [ ] `pnpm -w test`
- [ ] `pnpm -w build`

## 関連

- GitHub Issue #95
- README Packaging
- MVP 公開前チェックリスト

## 完了メモ

未着手。
