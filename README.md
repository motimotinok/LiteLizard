# LiteLizard

LiteLizard は、文章を「生成する」ためではなく、文章がどう読まれるかを観測するためのデスクトップ執筆環境です。

## コンセプト

文章を書く主体は、あくまでも人間です。

LiteLizard は、書き手が自分の文章と向き合うための静かな場所を保ちながら、AI が段落単位で伴走できるようにすることを目指しています。AI はひとつの固定された役割ではなく、仮想読者、編集者、添削者、読みの観測者など、書き手が必要とする視点を切り替えながら担います。

LiteLizard では、AI を単一の評価者としてではなく、切り替え可能な複数の観測器として扱います。書き手は、編集者、仮想読者、批判的な読者、全肯定の伴走者など、目的に応じた視点を選びながら、自分の文章の読まれ方を確認できます。

中心にあるのは「読まれ方を観測する」という考え方です。

分析内容をアプリ側で一律に決めず、ユーザーが評価者と基準を設計するための原則は [`docs/specs/analysis-philosophy.md`](./docs/specs/analysis-philosophy.md) にまとめています。

書き手は、段落ごとに本文と AI の読みを並べて確認できます。読者にはどう受け取られそうか、どのような解釈が起きそうか、どこに違和感や弱さがあるか、どの方向に直す余地があるか。そうした情報を、AI に文章の主導権を渡すのではなく、書き手自身が判断するための材料として扱います。

AI に対してただ「この文章はどうですか」と聞くと、過度に肯定的な応答になったり、逆に問題点を無限に列挙したりして、書き手がどこへ進めばよいのかわからなくなることがあります。LiteLizard では、プロンプトによって分析の観点を方向づけ、構造化された視点から文章を読むことで、感想・解釈・添削提案をより扱いやすい形で返すことを重視します。

UI はミニマルで、執筆の邪魔をしないことを大切にします。一方で、必要なときには読者視点、編集視点、構造分析、修正の方向性などを深く掘り下げられる。複雑な機能を前面に並べるのではなく、書き手が必要な深さまで潜れる道具であることを目指します。

今後のUI実装で守る視覚・操作上の判断基準は [`DESIGN.md`](./DESIGN.md) にまとめています。

## macOS へのインストール

MVP 公開版は、未署名の macOS `.dmg` として GitHub Releases から配布しています。配布対象は Apple Silicon Mac（arm64）のみです。

動作確認済み環境は **macOS Tahoe 26.5.1** です。これ以外の macOS バージョンでは実機確認を行っておらず、現時点では動作を保証していません。対応可能な macOS の下限を推測で広げず、確認済み環境を公開上のサポート範囲とします。

配布ファイルは `LiteLizard-latest-arm64.dmg`（常に最新版を指す固定ファイル名）です。Developer ID 署名、notarization、自動更新は MVP 後の対応です。

1. [`Releases`](https://github.com/motimotinok/LiteLizard/releases/tag/mvp-latest) または LP の常時最新版リンク `https://github.com/motimotinok/LiteLizard/releases/download/mvp-latest/LiteLizard-latest-arm64.dmg` から `LiteLizard-latest-arm64.dmg` をダウンロードします。
2. ダウンロードした `.dmg` をダブルクリックして開きます。
3. 表示された `LiteLizard.app` を `Applications` フォルダへドラッグします。
4. `Applications` フォルダの `LiteLizard.app` を右クリックまたは Control キーを押しながらクリックし、`開く` を選びます。
5. macOS の警告が出たら、アプリ名が `LiteLizard.app` であることを確認してから、もう一度 `開く` を選びます。
6. 初回起動後、作業用のフォルダを選びます。LiteLizard はそのフォルダ配下に `.litelizard/` と `.lzl` 文書を保存します。
7. 分析機能を使う場合は、左側の歯車アイコンから `設定` を開き、OpenAI / Anthropic の API キー、または Local LLM の endpoint とモデル名を保存します。

未署名アプリのため、通常のダブルクリックでは Gatekeeper の警告で起動できない場合があります。まずは上記の右クリックまたは Control クリックからの `開く` を使ってください。

### 更新の確認

LiteLizard は本格的なアプリ内自動更新を持ちません。起動時に GitHub Releases の `mvp-latest` を参照し、新しいバージョンがある場合だけ左下サイドバーの歯車アイコンに**青い丸（バッジ）**だけが付きます。バッジが付いた状態で歯車を押すと、設定画面の `LiteLizard について` タブが開きます。そこから `最新版 .dmg をダウンロード` を押すとブラウザが [`LiteLizard-latest-arm64.dmg`](https://github.com/motimotinok/LiteLizard/releases/download/mvp-latest/LiteLizard-latest-arm64.dmg) のダウンロードを開始します。`GitHub Releases を開く` で [`Releases`](https://github.com/motimotinok/LiteLizard/releases/tag/mvp-latest) ページに移動することもできます。最新版を取り込むには `.dmg` を再ダウンロードして、上記のインストール手順をやり直してください。バッジは次回起動時に最新版を取り込んでいれば自動で消えます。

それでも起動できない場合だけ、Terminal で次のコマンドを実行します。この操作は `LiteLizard.app` だけを対象にしてください。`/Applications` 全体や他のアプリを対象にしないでください。

```sh
xattr -dr com.apple.quarantine /Applications/LiteLizard.app
```

その後、もう一度 `Applications` フォルダから `LiteLizard.app` を開きます。

## 開発

詳細仕様: `docs/LiteLizard_spec_v003.md`

### Workspaces

- `apps/api`: 互換性・テスト用に残している legacy API
- `apps/desktop`: Electron + React のデスクトップアプリ
- `packages/shared`: 共有型、API 契約、JSON schema
- `tests/e2e`: Electron 起動の Playwright smoke test

### Quick start

Node.js 24（`.nvmrc` は `24.13.0`）と pnpm 9.12.3 を使用します。Electron 42のツールチェーンはNode.js 22.12.0未満では動作しません。

1. Node.js を切り替え: `nvm use`
2. 依存関係をインストール: `pnpm install`
3. デスクトップアプリを起動: `pnpm --filter @litelizard/desktop dev`

デスクトップの起動・パッケージコマンドは、Node.js 22.12.0未満で実行された場合、nvmまたはnodebrewにインストール済みの対応Nodeを自動検出します。対応Nodeが見つからない場合はNode.js 24をインストールしてから再実行してください。

`apps/api` の test/dev/start は、Node.js 切替後に古い ABI の `better-sqlite3` が残っていた場合、現在のNode向けに自動再ビルドしてから起動する。

### Test

- Unit/integration: `pnpm test`
- E2E: `RUN_E2E_ELECTRON=1 pnpm --filter @litelizard/e2e test`

### Packaging

- ローカル smoke 用の未署名 `.app` 生成: `pnpm --filter @litelizard/desktop package:mac`
  - 出力先: `apps/desktop/release/mac-arm64/LiteLizard.app`
  - `pnpm --filter @litelizard/desktop smoke:package:mac` で packaged binary の起動を確認できます。
- 公開用の未署名 `.dmg` 生成: `pnpm --filter @litelizard/desktop package:mac:dmg`
  - 出力先: `apps/desktop/release/LiteLizard-latest-<arch>.dmg`（例: `LiteLizard-latest-arm64.dmg`）
  - LP からの常時最新版リンクを成立させるため、ファイル名は `latest` 固定にしています。実際のバージョンは Release body / アプリの「LiteLizard について」タブで確認できます。
  - GitHub Releases にはこの `.dmg` を添付します。
  - 制限された実行環境で `hdiutil: create failed - 装置が構成されていません` になる場合は、macOS自体の故障とは限らない。`hdiutil` がディスクイメージ用デバイスを使える通常のターミナルまたは許可済み環境で再実行する。

MVP 公開では未署名の `.dmg` を GitHub Releases に置く方針です。Developer ID 署名、notarization、自動更新は MVP 後の対応です。未署名配布のため初回起動時に macOS Gatekeeper の警告が出る前提です。

公開前に確認する自動検証コマンド・手動 GUI 手順・公開判断の未決事項は [`docs/release-checklist.md`](./docs/release-checklist.md) にまとめています。

## プライバシー

LiteLizard がどのデータをローカルに保存し、どの操作で外部 provider にデータを送信するかは [`PRIVACY.md`](./PRIVACY.md) にまとめています。

## セキュリティ

脆弱性の報告方法、サポート対象バージョン、API キー・ローカルファイル・外部 provider 送信に関する安全上の前提は [`SECURITY.md`](./SECURITY.md) にまとめています。

## ライセンス

LiteLizard 本体のソースコードは MIT License で配布します。詳細はルートの [`LICENSE`](./LICENSE) を参照してください。

renderer に同梱しているフォント（Shippori Mincho / Noto Sans JP / IBM Plex Sans / JetBrains Mono）は SIL Open Font License 1.1 に従う独立した著作物です。フォント単体のライセンスは [`apps/desktop/src/renderer/assets/fonts/LICENSES.md`](./apps/desktop/src/renderer/assets/fonts/LICENSES.md) を参照してください。
