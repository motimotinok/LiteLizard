---
status: todo
started_at:
completed_at:
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

- [ ] renderer が Google Fonts へ依存しない
- [ ] 必要なフォントがアプリ内アセットとして参照される
- [ ] オフラインでも本文と UI のフォント指定が破綻しない
- [ ] フォントライセンス上、同梱に問題がないことが確認されている
- [ ] build 後の asset 参照が壊れていない

## 検証方法

- [ ] 関連する既存テストを確認する
- [ ] 必要なテストを追加または更新する
- [ ] `pnpm -w lint`
- [ ] `pnpm -w test`
- [ ] `pnpm -w build`

## 完了メモ

未着手。

## 元 WBS

- R-22 Web フォントのローカル同梱
