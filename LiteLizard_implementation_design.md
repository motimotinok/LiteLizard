# LiteLizard 実装設計書 v0.2

最終更新: 2026-02-12（v0.2）

## 1. 目的
- ローカルでエッセイを編集しながら、段落ごとに `light`（本文）と `lizard`（AI分析）を並列管理する。
- 段落のドラッグ&ドロップ並び替えを前提に、正本を `*.litelizard.json` とする。

## 2. スコープ（MVP）
- Electronデスクトップアプリ（macOS先行）
- フォルダを開く、ファイルツリー表示、`*.litelizard.json` 編集
- 2カラム編集（左: light、右: lizard）
- 解析実行ボタン（手動）
- 自動保存（3秒デバウンス）
- 中継API経由でLLM分析

## 3. ファイル形式
- 正本: `*.litelizard.json` のみ
- `.md` 保存・入出力はMVPスコープ外（将来拡張）
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
- `light.text` が変更された段落は `lizard.status = stale` に設定

## 6. API設計（中継API）
### 6.1 認証
- 方式: メールリンク認証
- クライアントは短命アクセストークンを保持
- すべての分析APIは `Authorization: Bearer <token>` 必須

### 6.2 エンドポイント
1. `POST /v1/analysis/paragraphs`
- 目的: 指定段落のみ再分析する

2. `GET /v1/me/usage`
- 目的: 当日/当月の利用量表示

3. `POST /v1/auth/email-link/request`
- 目的: メールリンク送信

4. `POST /v1/auth/email-link/verify`
- 目的: メールリンク検証とトークン発行

### 6.3 リクエスト/レスポンス契約（案）
#### Request: `POST /v1/analysis/paragraphs`
```json
{
  "documentId": "doc_abc123",
  "personaMode": "general-reader",
  "paragraphs": [
    {
      "paragraphId": "p_a1b2c3",
      "order": 3,
      "text": "誰も私を見ていないのに、全員に見られている気がした。"
    }
  ]
}
```

必須項目:
- `documentId`
- `paragraphs[].paragraphId`
- `paragraphs[].text`

#### Success Response: `200 OK`
```json
{
  "requestId": "req_01HXYZ",
  "documentId": "doc_abc123",
  "personaMode": "general-reader",
  "results": [
    {
      "paragraphId": "p_a1b2c3",
      "emotion": ["不安", "緊張"],
      "theme": ["対人不安", "自己意識"],
      "deepMeaning": "過去の評価体験が現在の知覚を増幅している可能性。",
      "confidence": 0.79,
      "model": "gpt-4o-mini",
      "analyzedAt": "2026-02-12T09:30:00.000Z"
    }
  ]
}
```

#### Failure Policy（確定）
- 部分失敗は許容しない。
- 対象段落のうち1件でも失敗したら、API全体を失敗として返す。
- クライアントはレスポンスを反映せず、再試行を促す。

#### Failure Response例: `400/401/429/500`
```json
{
  "requestId": "req_01HXYZ",
  "error": {
    "code": "ANALYSIS_ABORTED",
    "message": "At least one paragraph failed. No results were applied.",
    "retryable": true
  }
}
```

## 7. 悪用対策（MVP必須）
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
- request_id, user_id, document_id, paragraph_count, model, status, created_at, finished_at, error_code

4. `rate_limit_counters`（Redis等）
- key(user/ip), window, count

## 9. 自動保存仕様
- 入力変更時に dirty=true
- 最終入力から3秒で保存実行
- 保存成功で dirty=false、失敗時はUIにエラー表示
- アプリ終了時に dirty=true なら同期保存してから終了

## 10. 実装順序
1. Electron + React 土台
2. `.litelizard.json` ローダ/セーバ
3. ファイルツリー + DnD段落UI
4. 3秒デバウンス自動保存
5. 中継API連携（認証なしモック）
6. メールリンク認証
7. レート制限/クォータ/usage表示
8. エラーハンドリング・監査ログ

## 11. 受け入れ条件（MVP）
- フォルダを開いて文書を作成/編集/自動保存できる
- 段落をDnDで並び替えても分析データが段落IDに追従する
- 解析実行で右カラムに3軸が表示される
- ログインなしでは分析APIを叩けない
- 制限超過時に429とユーザー向けメッセージが返る
- 部分失敗時は1件も反映せず、再試行導線を表示する

## 12. 確定（v0.3）
1. 状態遷移（採用: 案A）
- `pending -> complete | failed`
- 本文変更時に `stale`
- 再解析開始時に `pending`

2. HTTPステータス設計（採用: 案B）
- `200` 成功
- `400` 入力不正（欠損/型不正）
- `401` 未認証
- `429` 制限超過
- `500` サーバー障害（上流LLM障害を含む）

3. クライアントのトークン保存場所（採用: 案B）
- 暗号化ローカルファイル

4. 再解析トリガー（採用: 案B）
- 手動 + `stale` 段落への提案再解析バッジ

## 13. 追加確定（v0.4）
1. 同時編集の競合制御（採用: 案A）
- `revision` を用いた楽観ロックを採用
- 保存リクエストに `revision` を必須化
- サーバーと不一致時は `400` + `REVISION_MISMATCH`

2. 解析APIタイムアウトと再試行（採用: 案A）
- サーバータイムアウト: 10秒
- クライアント再試行: 1回

3. 暗号化ローカルファイルの鍵管理（採用: 案A）
- OSログイン情報由来の鍵導出（PBKDF2またはArgon2）
- トークン暗号文のみをローカル保存

4. ファイル破損時リカバリ（採用: 案C）
- 起動時にJSON Schema検証を実施
- 破損時は自動復旧せず、手動復旧導線を表示

5. 解析対象段落の送信方式（採用: 案A）
- `stale` 段落のみ送信

6. 監査ログと保持期間（採用: 案A）
- 本文は保存しない
- メタデータ（request数/token数/cost/時刻/userId）のみ30日保持

7. プロンプトバージョン管理（採用: 案A）
- `promptVersion` をAPIリクエストに必須付与
- 解析結果にも使用 `promptVersion` を保存

8. 配布・更新方式（採用: 案A）
- macOS向け手動配布（zip/dmg）
- 更新は手動更新のみ（MVP時点）
