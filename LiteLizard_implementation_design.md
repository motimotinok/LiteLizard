# LiteLizard 実装設計書 v0.1

最終更新: 2026-02-12

## 1. 目的
- ローカルでエッセイを編集しながら、段落ごとに `light`（本文）と `lizard`（AI分析）を並列管理する。
- 段落のドラッグ&ドロップ並び替えを前提に、正本を `*.litelizard.json` とする。

## 2. スコープ（MVP）
- Electronデスクトップアプリ（macOS先行）
- フォルダを開く、ファイルツリー表示、Markdownインポート
- 2カラム編集（左: light、右: lizard）
- 解析実行ボタン（手動）
- 自動保存（3秒デバウンス）
- 中継API経由でLLM分析

## 3. ファイル形式
- 正本: `*.litelizard.json`
- 互換: `*.md`（インポート/エクスポート）
- 正式スキーマ: `/Users/jane/devidea/liteLizard/LiteLizard_schema_v1.json`

## 4. クライアント構成
- Renderer（React）
  - EditorPane: 段落カード編集
  - AnalysisPane: lizard表示
  - ExplorerPane: ファイルツリー
- Main（Electron）
  - FileService: 読み書き、watch
  - AuthBridge: セッション管理
  - ApiBridge: 中継API呼び出し

## 5. 段落モデル
- 段落IDは作成時に `p_<random>` を採番
- 並び順は `order` で管理
- DnD時は `order` のみ更新し、`id` は不変
- 変更された段落は `lizard.status = stale` に設定

## 6. API設計（中継API）
### 6.1 認証
- 方式: メールリンク認証
- クライアントは短命アクセストークンを保持
- すべての分析APIは `Authorization: Bearer <token>` 必須

### 6.2 エンドポイント
1. `POST /v1/analysis/paragraphs`
- 入力: documentId, personaMode, paragraphs[]
- 出力: paragraphs[]（idごとの emotion/theme/deepMeaning/confidence）

2. `GET /v1/me/usage`
- 入力: なし（トークンからユーザー特定）
- 出力: 当日/当月の使用量（request数, inputToken, outputToken, estimatedCost）

3. `POST /v1/auth/email-link/request`
- メールリンク送信

4. `POST /v1/auth/email-link/verify`
- リンク検証してトークン発行

## 7. 悪用対策（後付け容易な最小実装）
MVPで必ず実装する項目:
- 全分析リクエストに `userId` を紐づける
- UsageLogを保存（request数/トークン/推定コスト）
- 分析処理を単一ミドルウェアに集約
- 429系エラーを標準化

推奨の初期制限値（調整前提）:
- レート制限: 10 req/min/user, 100 req/hour/user
- 同時実行: 2 jobs/user
- 日次クォータ: 200,000 input tokens/user/day
- ファイル入力制限: 1 reqあたり最大20段落、1段落10,000文字

## 8. サーバーデータモデル（最小）
1. `users`
- id, email, created_at, status

2. `api_usage_daily`
- user_id, ymd, request_count, input_tokens, output_tokens, estimated_cost

3. `analysis_requests`
- request_id, user_id, model, status, created_at, finished_at, error_code

4. `rate_limit_counters`（Redis等）
- key(user/ip), window, count

## 9. 自動保存仕様
- 入力変更時に dirty=true
- 最終入力から3秒で保存実行
- 保存成功で dirty=false、失敗時はUIにエラー表示
- アプリ終了時に dirty=true なら同期保存してから終了

## 10. Markdown入出力仕様
- import
  - 空行区切りで段落化
  - コードブロック内は分割しない
- export
  - `light.text` を order順に連結して `.md` 生成
  - `lizard` はmdに埋め込まずJSONに保持

## 11. 実装順序
1. Electron + React 土台
2. `.litelizard.json` ローダ/セーバ
3. ファイルツリー + DnD段落UI
4. 3秒デバウンス自動保存
5. 中継API連携（認証なしモック）
6. メールリンク認証
7. レート制限/クォータ/usage表示
8. エラーハンドリング・監査ログ

## 12. 受け入れ条件（MVP）
- フォルダを開いて文書を作成/編集/自動保存できる
- 段落をDnDで並び替えても分析データが段落IDに追従する
- 解析実行で右カラムに3軸が表示される
- ログインなしでは分析APIを叩けない
- 制限超過時に429とユーザー向けメッセージが返る
