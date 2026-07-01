---
status: done
started_at: 2026-05-07T08:36:48+09:00
completed_at: 2026-05-07T08:51:37+09:00
---

# エディター Tweaks 切替 UI を実装する

## 背景

WBS R-17 では、Tweaks 切替 UI が未完了になっている。UI リデザイン仕様では、明朝/ゴシック、本文サイズ、行間、黄ばみ強度、パネル横並び/オーバーレイを後続タスクとして分離している。

## ゴール

設定画面から執筆表示の主要 Tweaks を変更でき、エディター表示に反映される。

## スコープ

- `docs/specs/ui-redesign-minimal.md` の Tweaks 方針を確認する
- SettingsScreen の未実装タブまたは既存構造に沿って Tweaks UI を追加する
- 明朝/ゴシック、本文サイズ、行間、黄ばみ強度、分析パネル表示方式を保存・反映する
- 設定の保存先は既存 store / main-side store の設計に沿って最小追加する
- レイアウト崩れや読みづらさが出ない範囲に値を制限する

## 非ゴール

- UI 全面リデザイン
- テーマ機能全般の実装
- 任意 CSS 入力
- クラウド同期

## 受け入れ条件

- [x] 明朝/ゴシックを切り替えられる
- [x] 本文サイズを安全な範囲で変更できる
- [x] 行間を安全な範囲で変更できる
- [x] 黄ばみ強度を安全な範囲で変更できる
- [x] 分析パネルの横並び/オーバーレイ方針を切り替えられる、または未対応項目として明確に分離されている
- [x] 設定が再起動後も復元される

## 検証方法

- [x] 関連する既存テストを確認する
- [x] 必要なテストを追加または更新する
- [x] `pnpm -w lint`
- [x] `pnpm -w test`
- [x] `pnpm -w build`

## 完了メモ

実装済み。

- shared の `AnalysisSettings` に `editorTweaks` を追加し、main-side settings store と preload mock で既定値補完・安全範囲クランプ・保存復元を行うようにした。
- SettingsScreen のエディタタブに明朝/ゴシック、本文サイズ、行間、黄ばみ強度、分析パネル表示方式の UI を追加した。
- renderer は保存済み Tweaks を CSS 変数としてエディター本文の書体・サイズ・行間・紙面色、分析パネルの side / overlay 配置へ反映する。
- 検証: targeted tests、`pnpm -w lint`、`pnpm -w test`、`pnpm -w build` 成功。
- 残課題: Electron 上での手動表示確認は未実施。

## 元 WBS

- R-17 Tweaks 切替 UI
