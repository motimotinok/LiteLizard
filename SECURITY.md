# セキュリティに関する説明

LiteLizard は、ローカルファイル、Electron IPC、API キー、外部 provider / Local LLM への送信を扱うデスクトップアプリです。このドキュメントは、現行実装における脆弱性報告方法と安全上の前提を説明します。

このドキュメントは、正式なセキュリティ監査報告書ではありません。外部公開前の利用者・協力者向けに、報告先と注意点を分かる形にするための技術メモです。

## 脆弱性の報告方法

脆弱性と思われる問題を見つけた場合は、次のいずれかの方法で報告してください。

- GitHub の Security Advisories / private vulnerability reporting が利用できる場合は、リポジトリの非公開報告機能から報告してください
- 非公開報告機能が使えない場合は、`https://github.com/motimotinok/LiteLizard` の Issue で「脆弱性報告の相談」として連絡してください。その場合、API キー、原稿本文、再現に不要な個人情報、未公開の攻撃手順の詳細は公開 Issue に書かないでください

報告には、影響範囲、再現手順、期待される挙動、実際の挙動、利用 OS、LiteLizard の version / commit が分かる範囲で含まれていると調査しやすくなります。

## サポート対象バージョン

現時点の LiteLizard は公開準備中の pre-release 扱いです。セキュリティ修正は、原則として最新の開発版と、今後作成される最新の配布版を対象にします。

古いローカル build や過去の試験配布版へ個別に修正を backport することは、現時点では保証しません。公開版の配布を開始した後に、必要に応じてこの方針を更新します。

## 現行の安全上の前提

### ローカルファイル操作

- LiteLizard はユーザーが選択したプロジェクトディレクトリを作業範囲として扱います
- Electron main process のファイル系 IPC では、project root の検出、`path.resolve`、`fs.realpath` による検証で、プロジェクト外パスや symlink 経由の外部参照を拒否する方針です
- 原稿本文と分析結果は、ユーザーのローカルファイルとして保存されます。保存場所の詳細は [`PRIVACY.md`](./PRIVACY.md) を参照してください

### API キー

- OpenAI / Anthropic の API キーは Electron `safeStorage` が利用可能な環境では暗号化され、Electron userData 配下の `api-keys.bin` に保存されます
- `safeStorage` が利用できない環境では、互換のため `api-keys.plaintext` に平文で保存されます。この場合、OS アカウントやファイル権限の保護に依存します
- LiteLizard は API キーを LiteLizard 独自サーバーへ送信しません。設定された provider への HTTP リクエストでのみ使用します

### 外部 provider / Local LLM への送信

- 分析機能を実行した場合、対象段落、コンテキスト段落、Reading Agent の system prompt、モデル設定などが、選択中の OpenAI / Anthropic / Local LLM endpoint に送信されます
- Local LLM endpoint はユーザーが指定した URL に送信されます。ローカルマシン上の endpoint か、別のリモート endpoint かは LiteLizard 側では保証しません
- 送信先 provider 側のデータ保持や学習利用の扱いは、各 provider の規約・設定に依存します

### Electron IPC

- renderer からのファイル操作は `window.litelizard` preload bridge 経由で main process に委譲します
- main process 側でパスと documentId を検証し、分析 sidecar などの生成ファイル名に不正な ID が入らないようにします
- 今後 IPC チャンネルを追加する場合も、renderer から渡されたパス・ID・URL を信頼せず、main process 側で検証する方針を維持します

## 対象外

- LiteLizard は現時点で脆弱性報奨金制度を提供していません
- Apple Developer ID 署名、notarization、自動更新、配布インフラの完全なセキュリティ設計は、今後の公開準備タスクで扱います
- 依存パッケージ全体のライセンス監査や包括的なサプライチェーン監査は、このドキュメントの範囲外です

## 変更について

セキュリティ上の前提や報告方法が変わった場合は、このドキュメントと `CHANGELOG.md` を更新します。
