---
status: done
started_at: 2026-05-06T20:22:33+09:00
completed_at: 2026-05-06T20:25:49+09:00
---

# API キー設定経路の現行仕様確認と不足補完

## 背景

GitHub Issue #54 では、fresh な Electron 起動時に `getApiKeyStatus()` が `false` を返す一方で、renderer 側に API キーを設定する UI 経路がなく、解析機能を有効化できないことが指摘されていた。

その後、S-09 により解析機能はログイン不要のローカル完結方針になり、設定画面には OpenAI / Anthropic API キー、既定 provider / model、ローカル LLM 設定が追加されている。現在は Issue の前提が古くなっている可能性があるため、このチケットでは現行仕様で fresh 起動から解析可能状態へ進めるかを確認し、不足が残っていれば補完する。

## ゴール

API キー未設定またはローカル LLM 未設定の状態から、ユーザーが設定画面へ進み、解析に必要な provider 設定を保存できる。

## スコープ

- fresh 起動相当の状態で、解析パネルや設定画面から API キー / ローカル LLM 設定へ到達できるか確認する
- `apps/desktop/src/preload/ipcBridge.ts` と renderer 側設定 UI の接続を確認する
- `getApiKeyStatus` 相当の未設定判定と、設定済み判定が現在の `AnalysisSettings` 方針と矛盾していないか確認する
- 不足がある場合は、既存の左ツールバー設定画面と中央ワークスペース UI に沿って最小限補完する
- 必要に応じて renderer store / 設定画面 / IPC のテストを追加または更新する

## 非ゴール

- OAuth ログイン UI の実装
- 認証・サブスク機能の実装
- 設定画面全体の再設計
- LLM provider の新規追加
- GitHub Issue 運用、WBS、agent-ready ラベル運用への接続

## 受け入れ条件

- [x] API キー未設定時に、解析 UI から設定画面への導線がある
- [x] SettingsScreen で OpenAI / Anthropic API キー、既定 provider / model、ローカル LLM 設定を保存できる
- [x] 保存後、解析実行可否の判定が設定内容を反映する
- [x] fresh 起動相当の状態でも、ユーザーが詰まらず解析設定を完了できる
- [x] 既存の解析実行、Reading Agent、ローカル LLM 設定が壊れていない

## 検証方法

- [x] 関連する既存テストを確認する
- [x] 必要なテストを追加または更新する
- [x] `pnpm -w lint`
- [x] `pnpm -w test`
- [x] `pnpm -w build`

## 完了メモ

実装完了。

- AnalysisPane の API キー未設定時設定導線を `AnalysisSettingsRoute.test.tsx` で固定した。
- SettingsScreen のローカル LLM セクション直下に保存ボタンを追加し、Endpoint URL / 既定モデルの保存導線を明確にした。
- OpenAI / Anthropic API キー、既定 provider / model、ローカル LLM 設定の保存経路は既存 IPC / store 実装と関連テストで確認した。
- 検証: 関連 targeted test、`pnpm -w lint`、`pnpm -w test`、`pnpm -w build` 成功。
- 残課題なし。

## 元 Issue

- #54 API キー設定経路の欠如（解析機能が有効化できない）
- https://github.com/motimotinok/LiteLizard/issues/54
