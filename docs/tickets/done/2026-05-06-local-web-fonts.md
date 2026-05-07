---
status: done
started_at: 2026-05-07T08:00:43+09:00
completed_at: 2026-05-07T08:04:21+09:00
---

# Web フォントをローカル同梱する

## 背景

WBS R-22 では、Web フォントのローカル同梱が未完了になっている。現在の renderer HTML は Google Fonts を参照しているため、オフライン環境やネットワーク制限下で意図したタイポグラフィにならない可能性がある。

## ゴール

UI リデザイン仕様で使うフォントをアプリ内アセットとして同梱し、オフラインでも表示が破綻しない。

## スコープ

- `apps/desktop/src/renderer/index.html` と CSS のフォント参照を確認する
- ライセンス上同梱可能なフォントファイルを renderer assets として配置する
- `@font-face` で Shippori Mincho / Noto Sans JP / IBM Plex Sans / JetBrains Mono 相当の参照をローカル化する
- ネットワーク上の Google Fonts 依存を取り除く
- フォント読み込み失敗時も既存 fallback で読めるようにする

## 非ゴール

- 新しいデザインテーマの追加
- 任意フォント選択機能
- フォントサブセット最適化の本格運用
- OS 別の完全一致レンダリング保証

## 受け入れ条件

- [x] renderer が Google Fonts へ依存しない
- [x] 必要なフォントがアプリ内アセットとして参照される
- [x] オフラインでも本文と UI のフォント指定が破綻しない
- [x] フォントライセンス上、同梱に問題がないことが確認されている
- [x] build 後の asset 参照が壊れていない

## 検証方法

- [x] 関連する既存テストを確認する
- [x] 必要なテストを追加または更新する
- [x] `pnpm -w lint`
- [x] `pnpm -w test`
- [x] `pnpm -w build`

## 完了メモ

renderer の Google Fonts preconnect / stylesheet 参照を削除し、`styles.css` にローカル `@font-face` を追加した。フォント asset は `apps/desktop/src/renderer/assets/fonts/` に配置し、ライセンス確認メモを `LICENSES.md` に残した。

実行した検証:

- `pnpm --filter @litelizard/desktop test -- fontAssets`（実装前に失敗、実装後に成功）
- `pnpm -w lint`
- `pnpm -w test`
- `pnpm -w build`

残課題: なし。

## 元 WBS

- R-22 Web フォントのローカル同梱
