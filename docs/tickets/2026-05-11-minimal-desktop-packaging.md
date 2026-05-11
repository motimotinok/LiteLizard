---
status: todo
started_at:
completed_at:
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

- [ ] 配布用 packaging ツールと設定が追加されている
- [ ] ローカルで macOS 向けのパッケージまたはアーカイブを生成できる
- [ ] 生成されたアプリが起動し、renderer と preload が読み込まれる
- [ ] 既存の dev / build / test コマンドを壊していない
- [ ] README に packaging コマンドと未署名配布の注意が短く書かれている

## 検証方法

- [ ] packaging script を実行し、成果物が生成されることを確認する
- [ ] 生成アプリの起動確認を行う
- [ ] `pnpm -w lint`
- [ ] `pnpm -w test`
- [ ] `pnpm -w build`

## 完了メモ

未着手。
