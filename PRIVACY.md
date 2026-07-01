# プライバシーに関する説明

LiteLizard はデスクトップ執筆環境として、ユーザーの原稿や分析結果をローカルファイルとして扱います。本ドキュメントは、現行実装上どのデータがどこに保存され、どの操作でどの外部サービスにデータが送信されるかを、実装事実ベースで説明することを目的としています。

このドキュメントは、弁護士レビュー済みの正式なプライバシーポリシーではありません。個人情報保護法や各国法制への完全準拠を保証するものでもありません。LiteLizard のデータ取り扱いを利用者が理解するための、技術的な参考資料として位置付けています。

## ローカルに保存されるデータ

### 原稿本文

- 保存先: ユーザーが選択したプロジェクトディレクトリ配下のファイル（`.lzl` 形式を含む）
- LiteLizard のプロジェクト内保存は、ユーザーが選択したプロジェクトディレクトリ配下に対して行います
- テキスト import はユーザーが選択した `.txt` / `.md` ファイルを読み込み、プロジェクト内に `.lzl` として保存します
- テキスト export はユーザーが保存ダイアログで選んだ任意の場所に `.txt` を書き出します
- 原稿を LiteLizard 自体のサーバーへ送信することはありません（後述「外部送信」を参照）

### 分析結果

- 保存先: 各プロジェクトディレクトリ配下の `.litelizard/analysis/<documentId>_<世代>.json`
- 分析結果は世代別の JSON ファイルとしてローカルに保存されます
- 分析結果に含まれるのは、対象段落 ID、Reading Agent が返した解釈テキスト、信頼度、使用モデル名、生成時刻などです

### アプリ設定ファイル

LiteLizard は OS の Electron userData ディレクトリ配下に次のファイルを保存します。userData の実際の場所は OS によって異なります（macOS では `~/Library/Application Support/LiteLizard/` 相当）。

- `app-store.json`: 最後に開いたフォルダ、最近開いたプロジェクトの一覧、選択中の Reading Agent ID
- `analysis-settings.json`: 既定 provider、各 provider の既定モデル名、Local LLM の endpoint URL とモデル名、コンテキストポリシー、エディタ調整値
- `agents.json`: Reading Agent の定義（名前・役割・system prompt 等）
- `api-keys.bin` または `api-keys.plaintext`: API キー（後述）

### API キーの保存

- 利用環境で Electron `safeStorage` が利用可能な場合、API キーは OS のキーチェーン由来の鍵で暗号化され、`<userData>/api-keys.bin` に保存されます
- `safeStorage` が利用できない環境では、互換のため `<userData>/api-keys.plaintext` に平文で保存されます。この場合、API キーはファイルシステム上でそのまま読み取れる状態になります
- LiteLizard は API キーを LiteLizard 自体のサーバーへ送信しません。API キーは、設定された OpenAI / Anthropic への HTTP リクエストヘッダでのみ使用されます
- Local LLM endpoint への接続では、現行実装上 API キーは使用しません

## 外部送信されるデータ

LiteLizard は段落分析または Reading Agent の dry-run を実行したときに限り、設定された外部 provider または Local LLM endpoint に対して、本文とコンテキスト段落を送信します。送信先と送信内容は次の通りです。

### OpenAI を使う場合

- 送信先: `https://api.openai.com`（OpenAI 公式 SDK 経由）
- 送信内容: 解析対象段落の本文、コンテキストポリシーに従って組み立てられた前段落の本文、Reading Agent の system prompt、使用モデル名
- 認証: 設定画面で保存した OpenAI API キーを Authorization ヘッダとして送信

### Anthropic を使う場合

- 送信先: `https://api.anthropic.com/v1/messages`
- 送信内容: OpenAI と同様の本文・コンテキスト・system prompt・モデル名
- 認証: 設定画面で保存した Anthropic API キーを `x-api-key` ヘッダとして送信

### Local LLM を使う場合

- 送信先: ユーザーが設定画面で指定した endpoint URL（例: Ollama 互換の `http://localhost:11434`）の `/api/generate`
- 接続確認を実行した場合のみ、同じ endpoint URL の `/api/tags` にもリクエストします
- 送信内容: 解析対象段落の本文、コンテキスト段落、Reading Agent の system prompt、モデル名
- 送信先は完全にユーザー側で決まります。LiteLizard はその endpoint がローカルマシンかリモートかを問わず、設定された URL に対して HTTP リクエストを送信します

### 送信されるコンテキスト範囲

- 「分析実行前のコンテキスト量見積もり確認」など今後の改善対象となる動作も含めて、現状はコンテキストポリシー（`document` / `chapter` スコープと `lastN` などの上限設定）に基づいて、対象段落より前の段落を一定数まとめて送信します
- ユーザーは設定画面でコンテキストの範囲と上限を変更できます

### 外部 provider 側の取り扱いについて

LiteLizard は、送信したデータが各 provider のサーバー側でどのように保存・利用されるかを制御できません。OpenAI、Anthropic、その他 Local LLM endpoint の運営者のプライバシー条件・データ保持条件は、それぞれの公式情報を参照してください。

## LiteLizard 自体のサーバーに送信しない範囲

- LiteLizard には独自のクラウドサーバーは存在しません。原稿本文、分析結果、API キー、設定ファイルを LiteLizard 運営者へ送信する経路はありません
- アプリ内に telemetry / analytics の SDK（Sentry、PostHog、Amplitude など）は組み込まれていません
- 「最近開いたプロジェクト」や「選択中の Reading Agent」などの利用履歴は、すべてローカルファイルとしてユーザーのマシン上にのみ保存されます

## データの削除

- 原稿本文と分析結果は、対応するプロジェクトディレクトリを削除することで完全に削除できます
- アプリ設定ファイルは、Electron userData ディレクトリ配下のファイルを直接削除することで初期化できます
- API キーは設定画面から個別の provider のキーを消去するか、`api-keys.bin` / `api-keys.plaintext` を直接削除することで取り除けます

## 変更について

LiteLizard の機能が追加・変更された場合、データの取り扱いも変わる可能性があります。重要な変更がある場合は `CHANGELOG.md` で告知します。
