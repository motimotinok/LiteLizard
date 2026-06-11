---
status: done
started_at: 2026-05-12T08:16:00+09:00
completed_at: 2026-05-12T08:18:00+09:00
---

# MIT ライセンスを追加する

## 背景

LiteLizard を外部公開するにあたり、リポジトリと配布物の利用条件を明確にする必要がある。現状はルートに `LICENSE` がなく、第三者がコードをどこまで利用・改変・再配布できるかが分かりにくい。

## ゴール

ルートに MIT License を追加し、README からライセンスを確認できる状態にする。

## スコープ

- ルートに `LICENSE` を追加する
- ライセンス本文は標準的な MIT License を使う
- 著作権者名と年を現状に合わせて記載する
- README にライセンスへの短い案内を追加する
- bundled fonts など、別ライセンスの同梱物がある場合は混同しないように確認する

## 非ゴール

- 独自ライセンスや利用規約は作らない
- 商標・ブランド利用ポリシーは扱わない
- 依存パッケージ全体のライセンス監査はこのチケットでは完了条件にしない
- 法務レビュー済み文書として断定しない

## 受け入れ条件

- [x] ルートに `LICENSE` が追加されている
- [x] MIT License の標準本文が使われている
- [x] 著作権表示の年と権利者名が妥当である
- [x] README からライセンスを確認できる
- [x] font asset など既存の個別ライセンス表示と矛盾していない

## 検証方法

- [x] `LICENSE` の本文と著作権表示を確認する
- [x] README のリンクまたは記述が正しく表示されることを確認する
- [x] `pnpm -w lint`
- [x] `pnpm -w test`
- [x] `pnpm -w build`

## 完了メモ

- ルートに `LICENSE`（MIT, Copyright (c) 2026 motimotinok）を追加した。著作権者名は git author の `motimotinok` を採用。
- README の「開発」セクション直下に「ライセンス」見出しを追加し、`LICENSE` と既存の bundled font 用 `apps/desktop/src/renderer/assets/fonts/LICENSES.md`（SIL Open Font License 1.1）への導線を分けて明記した。
- bundled fonts は OFL 1.1 の独立著作物として README で別記し、MIT 本文と矛盾しないことを確認。
- 検証: `pnpm -w lint` / `pnpm -w build` / `pnpm -w test`（desktop 249 件、shared 46 件、api 4 件、e2e 6 skipped）すべて成功。
- 残課題なし。
