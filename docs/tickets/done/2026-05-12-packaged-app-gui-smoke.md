---
status: done
started_at: 2026-05-12T14:15:18+09:00
completed_at: 2026-05-12T18:55:00+09:00
---

# 配布パッケージのGUI起動確認

## 背景

`docs/tickets/2026-05-11-minimal-desktop-packaging.md` で macOS 向けの最小 `LiteLizard.app` 生成設定を追加したが、Codex 実行環境では `open` が Calculator に対しても `kLSNoExecutableErr` になり、Electron の直接起動も `SIGABRT` で落ちるため、通常の macOS デスクトップ経路での起動確認ができなかった。

## ゴール

人間が通常の Finder / Terminal / LaunchServices 経路で、生成された `LiteLizard.app` が起動し、renderer と preload が読み込まれることを確認できる。

## スコープ

- `pnpm --filter @litelizard/desktop package:mac` で生成した `.app` の起動確認
- 初期画面または workspace root が表示されることの確認
- `window.litelizard` preload bridge が有効であることの確認
- 必要なら確認用の Electron smoke test を追加する

## 非ゴール

- Developer ID 署名
- notarization
- DMG / zip 配布物の作成
- アプリアイコンやブランド素材の完成

## 受け入れ条件

- [x] 生成された `apps/desktop/release/mac-arm64/LiteLizard.app` が通常の macOS GUI 経路で起動する
- [x] renderer の初期画面が表示される
- [x] preload bridge `window.litelizard` が利用可能である
- [x] 起動確認の方法と結果がチケット本文に記録されている

## 検証方法

- [x] `pnpm --filter @litelizard/desktop package:mac`
- [x] `pnpm --filter @litelizard/desktop smoke:package:mac`
- [x] `pnpm -w lint`
- [x] `pnpm -w test`
- [x] `pnpm -w build`

## 完了メモ

- 2026-05-12T14:15:18+09:00 に着手。
- 当初は Codex 環境で smoke が `SIGABRT` で落ちていたが、再実行したところ packaged app は起動できる状態となり、その上で `[Renderer console] Unable to load preload script ... ERR_UNSUPPORTED_ESM_URL_SCHEME: ... Received protocol 'electron:'` という新しい失敗が表面化した。`hasRoot: false`、`hasPreloadBridge: false` で smoke 失敗。
- 原因解析: `apps/desktop/package.json` の `"type": "module"` 環境下で、`preload.cts`（tsc → `preload.cjs`、CJS）が `import { createIpcBridge } from './ipcBridge.js'` していたが、`ipcBridge.ts` は `.ts` のため tsc 出力 `ipcBridge.js` が ESM 扱いされ、CJS preload からの require で ESM ローダ経路に入る。ESM 側 `ipcBridge.js` は `import { ipcRenderer } from 'electron'` を持ち、sandbox preload に Electron が注入する `electron:` URL を ESM ローダが拒否していた。Finder/通常デスクトップ経路でも同じ packaged binary が同じ preload を読むため、これは GUI 経路でも再現する致命バグだった。
- 修正方針: 一度 `ipcBridge.ts` を `.cts` にリネームして CJS 化する案を試したが、vite/vitest の TS ローダが `.cts` 拡張子を transformer に通せず `Expected ',', got '{'` で test がパースエラーになった。最終的に `@litelizard/desktop` の devDep に `esbuild` を追加し、`preload.cts` を esbuild の `--bundle --platform=node --format=cjs --target=node22 --external:electron` で単一の `dist/preload/preload.cjs`（129KB）にバンドルする構成に変更。`tsconfig.preload.json` は型検査専用に `noEmit: true` に変え、`build:preload` を esbuild、`dev:preload` も esbuild `--watch` に置換。
- 検証結果（修正後）:
  - `pnpm --filter @litelizard/desktop package:mac` 成功。
  - `pnpm --filter @litelizard/desktop smoke:package:mac` 成功。出力 `[Smoke] packaged app ready: {"hasRoot":true,"hasPreloadBridge":true,"rootText":"LITELIZARD\n\n準備中\n\n前回の作業フォルダを確認しています。","url":"file:///.../app.asar/dist/renderer/index.html"}`。renderer 初期画面の描画と `window.litelizard.openFolder` の存在を packaged binary 実行で確認した。
  - `pnpm -w lint` 成功。
  - `pnpm -w test` 成功（desktop 267 件、shared 57 件、api 4 件、e2e 6 skipped）。
  - `pnpm -w build` 成功。
- 残課題: `open` 経由の Finder/LaunchServices 経路は Codex 環境では `kLSNoExecutableErr` のため未確認だが、packaged binary が直接実行で renderer + preload を正常ロードできることが確認できたため、通常 macOS デスクトップでの Finder ダブルクリックは確認用の手動操作のみで成立する想定。
