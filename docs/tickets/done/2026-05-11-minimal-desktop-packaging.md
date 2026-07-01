---
status: done
started_at: 2026-05-12T13:56:17+09:00
completed_at: 2026-05-12T14:11:28+09:00
---

# デスクトップ配布パッケージの最小設定

## 背景

LiteLizard は Electron アプリとして通常の `pnpm --filter @litelizard/desktop build` はできるが、外部公開に使うインストーラや配布アーカイブを生成する設定がまだない。公開準備として、まずローカルで再現可能な最小パッケージ生成を整える。

## ゴール

Mac 向けを第一対象に、LiteLizard のパッケージ済みアプリまたは配布用アーカイブをローカルで生成できる。

## スコープ

- Electron 向け packaging ツールを選定し、最小設定を追加する
- app name、version、entry point、renderer / preload / main の成果物パスを配布設定に反映する
- macOS 向けの最小成果物を生成できる script を追加する
- 生成物に不要な開発ファイルが入りすぎないように確認する
- README に公開準備用の packaging コマンドを短く追記する

## 非ゴール

- Apple Developer ID 署名や notarization はこのチケットでは完了条件にしない
- 自動更新は扱わない
- GitHub Release への自動アップロードは扱わない
- Windows / Linux の配布品質までは保証しない
- アプリアイコンやブランド素材の完成は別タスクに分ける

## 受け入れ条件

- [x] 配布用 packaging ツールと設定が追加されている
- [x] ローカルで macOS 向けのパッケージまたはアーカイブを生成できる
- [x] 生成されたアプリに renderer と preload の成果物が含まれる
- [x] 既存の dev / build / test コマンドを壊していない
- [x] README に packaging コマンドと未署名配布の注意が短く書かれている

## 検証方法

- [x] packaging script を実行し、成果物が生成されることを確認する
- [x] 生成アプリの bundle / asar 内容と codesign 検証を行う
- [x] `pnpm -w lint`
- [x] `pnpm -w test`
- [x] `pnpm -w build`

## 完了メモ

`electron-builder` を desktop workspace に追加し、`pnpm --filter @litelizard/desktop package:mac` で `apps/desktop/release/mac-arm64/LiteLizard.app` を生成できるようにした。Electron / builder の cache は repo 内 `tmp/` に向け、sandbox でも再現しやすい形にした。

成果物は `app.asar` に `dist/main`、`dist/preload/preload.cjs`、`dist/renderer/index.html` と production dependency の `@litelizard/shared/dist` が含まれることを確認した。`shared/src`、test、sourcemap、tsbuildinfo は除外した。`codesign --verify --deep --strict` も成功。

検証: `pnpm --filter @litelizard/desktop package:mac`、app.asar 内容確認、`codesign --verify --deep --strict --verbose=2 apps/desktop/release/mac-arm64/LiteLizard.app`、`pnpm -w lint`、`pnpm -w test`、`pnpm -w build`。

残課題: Codex シェルでは `open` が Calculator に対しても `kLSNoExecutableErr` になり、Electron GUI の直接起動も `SIGABRT` で落ちるため、通常の macOS デスクトップ経路での `.app` 起動確認は `docs/tickets/2026-05-12-packaged-app-gui-smoke.md` に分離した。
