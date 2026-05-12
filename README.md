# LiteLizard

LiteLizard は、文章を「生成する」ためではなく、文章がどう読まれるかを観測するためのデスクトップ執筆環境です。

## コンセプト

文章を書く主体は、あくまでも人間です。

LiteLizard は、書き手が自分の文章と向き合うための静かな場所を保ちながら、AI が段落単位で伴走できるようにすることを目指しています。AI はひとつの固定された役割ではなく、仮想読者、編集者、添削者、読みの観測者など、書き手が必要とする視点を切り替えながら担います。

LiteLizard では、AI を単一の評価者としてではなく、切り替え可能な複数の観測器として扱います。書き手は、編集者、仮想読者、批判的な読者、全肯定の伴走者など、目的に応じた視点を選びながら、自分の文章の読まれ方を確認できます。

中心にあるのは「読まれ方を観測する」という考え方です。

書き手は、段落ごとに本文と AI の読みを並べて確認できます。読者にはどう受け取られそうか、どのような解釈が起きそうか、どこに違和感や弱さがあるか、どの方向に直す余地があるか。そうした情報を、AI に文章の主導権を渡すのではなく、書き手自身が判断するための材料として扱います。

AI に対してただ「この文章はどうですか」と聞くと、過度に肯定的な応答になったり、逆に問題点を無限に列挙したりして、書き手がどこへ進めばよいのかわからなくなることがあります。LiteLizard では、プロンプトによって分析の観点を方向づけ、構造化された視点から文章を読むことで、感想・解釈・添削提案をより扱いやすい形で返すことを重視します。

UI はミニマルで、執筆の邪魔をしないことを大切にします。一方で、必要なときには読者視点、編集視点、構造分析、修正の方向性などを深く掘り下げられる。複雑な機能を前面に並べるのではなく、書き手が必要な深さまで潜れる道具であることを目指します。

## 開発

詳細仕様: `docs/LiteLizard_spec_v003.md`

### Workspaces

- `apps/api`: 互換性・テスト用に残している legacy API
- `apps/desktop`: Electron + React のデスクトップアプリ
- `packages/shared`: 共有型、API 契約、JSON schema
- `tests/e2e`: Electron 起動の Playwright smoke test

### Quick start

1. 依存関係をインストール: `pnpm install`
2. デスクトップアプリを起動: `pnpm --filter @litelizard/desktop dev`

### Test

- Unit/integration: `pnpm test`
- E2E: `RUN_E2E_ELECTRON=1 pnpm --filter @litelizard/e2e test`

### Packaging

- macOS 向けの未署名ローカルパッケージ生成: `pnpm --filter @litelizard/desktop package:mac`

このコマンドは `apps/desktop/release/mac-arm64/LiteLizard.app` を生成します。Developer ID 署名と notarization は未対応のため、外部配布前に別途対応が必要です。

## プライバシー

LiteLizard がどのデータをローカルに保存し、どの操作で外部 provider にデータを送信するかは [`PRIVACY.md`](./PRIVACY.md) にまとめています。

## セキュリティ

脆弱性の報告方法、サポート対象バージョン、API キー・ローカルファイル・外部 provider 送信に関する安全上の前提は [`SECURITY.md`](./SECURITY.md) にまとめています。

## ライセンス

LiteLizard 本体のソースコードは MIT License で配布します。詳細はルートの [`LICENSE`](./LICENSE) を参照してください。

renderer に同梱しているフォント（Shippori Mincho / Noto Sans JP / IBM Plex Sans / JetBrains Mono）は SIL Open Font License 1.1 に従う独立した著作物です。フォント単体のライセンスは [`apps/desktop/src/renderer/assets/fonts/LICENSES.md`](./apps/desktop/src/renderer/assets/fonts/LICENSES.md) を参照してください。
