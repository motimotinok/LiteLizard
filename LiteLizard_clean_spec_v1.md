# LiteLizard クリーン仕様書 v1

最終更新: 2026-02-12

## 1. プロダクト目的
- エッセイ執筆時に、段落ごとに本文（`light`）とAI分析（`lizard`）を並列表示し、読者視点の不安を減らす。
- 執筆中の段落をドラッグ&ドロップで並び替え、構成推敲をしやすくする。

## 2. MVPスコープ
- Electronデスクトップアプリ（macOS先行）
- フォルダを開く方式（ファイルツリー表示）
- `*.litelizard.json` の編集・保存
- 2カラムUI（左: `light` 編集 / 右: `lizard` 表示）
- 解析実行ボタン（手動）
- `stale` 段落への提案再解析バッジ
- 自動保存（3秒デバウンス）
- 中継API経由の段落分析

## 3. データ形式
- 正本: `*.litelizard.json` のみ
- `.md` 保存/入出力はMVPスコープ外
- スキーマ: `/Users/jane/devidea/liteLizard/LiteLizard_schema_v1.json`

## 4. ドキュメントモデル
- 段落単位で `id` / `order` / `light` / `lizard` を保持
- 段落IDは不変（DnD時も不変）
- `light.text` 更新時に `lizard.status = stale`
- `lizard.status` 遷移:
  - `pending -> complete | failed`
  - 本文変更時: `stale`
  - 再解析開始時: `pending`

## 5. API仕様（中継API）

### 5.1 認証
- メールリンク認証
- すべての分析APIは `Authorization: Bearer <token>` 必須
- トークンはクライアント側で暗号化ローカルファイルに保存
- 鍵はOSログイン情報由来鍵（PBKDF2またはArgon2）で導出

### 5.2 エンドポイント
1. `POST /v1/analysis/paragraphs`
- 指定段落のみ再分析

2. `GET /v1/me/usage`
- 当日/当月の利用量表示

3. `POST /v1/auth/email-link/request`
- メールリンク送信

4. `POST /v1/auth/email-link/verify`
- メールリンク検証・トークン発行

### 5.3 `POST /v1/analysis/paragraphs` リクエスト
```json
{
  "documentId": "doc_abc123",
  "personaMode": "general-reader",
  "promptVersion": "v1.0.0",
  "paragraphs": [
    {
      "paragraphId": "p_a1b2c3",
      "order": 3,
      "text": "誰も私を見ていないのに、全員に見られている気がした。"
    }
  ]
}
```

必須:
- `documentId`
- `promptVersion`
- `paragraphs[].paragraphId`
- `paragraphs[].text`

送信対象:
- `stale` 段落のみ

### 5.4 成功レスポンス（`200`）
```json
{
  "requestId": "req_01HXYZ",
  "documentId": "doc_abc123",
  "personaMode": "general-reader",
  "promptVersion": "v1.0.0",
  "results": [
    {
      "paragraphId": "p_a1b2c3",
      "emotion": ["不安", "緊張"],
      "theme": ["対人不安", "自己意識"],
      "deepMeaning": "過去の評価体験が現在の知覚を増幅している可能性。",
      "confidence": 0.79,
      "model": "gpt-4o-mini",
      "analyzedAt": "2026-02-12T09:30:00.000Z",
      "promptVersion": "v1.0.0"
    }
  ]
}
```

### 5.5 失敗ポリシー
- 部分失敗は許容しない（all-or-nothing）
- 対象段落のうち1件でも失敗したらAPI全体を失敗
- クライアントは反映0件で再試行導線を表示

### 5.6 HTTPステータス
- `200` 成功
- `400` 入力不正 / 競合（`REVISION_MISMATCH` 含む）
- `401` 未認証
- `429` 制限超過
- `500` サーバー障害（上流LLM障害含む）

失敗レスポンス例:
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

## 6. 保存・競合・破損対応
- 自動保存: 最終入力から3秒デバウンス
- 競合制御: `revision` 必須の楽観ロック
- 保存時に `revision` 不一致なら `400 + REVISION_MISMATCH`
- 破損対応: 起動時にJSON Schema検証、破損時は自動復旧せず手動復旧導線を表示

## 7. 悪用対策・監査
- 全分析リクエストに `userId` を紐づけ
- 使用量ログ保存（request数/token数/cost）
- 本文は監査ログに保存しない
- 保持期間: 30日
- 制限（初期値）:
  - 10 req/min/user
  - 100 req/hour/user
  - 同時2ジョブ/user
  - 200,000 input tokens/day/user
  - 1 req 最大20段落、1段落最大10,000文字

## 8. クライアント構成
- Renderer（React）
  - EditorPane
  - AnalysisPane
  - ExplorerPane
- Main（Electron）
  - FileService
  - AuthBridge
  - ApiBridge

## 9. 実装順序
1. Electron + React 土台
2. `.litelizard.json` ローダ/セーバ
3. ファイルツリー + DnD段落UI
4. 3秒デバウンス自動保存
5. 中継API連携（モック）
6. メールリンク認証
7. レート制限/クォータ/usage表示
8. エラーハンドリング・監査ログ

## 10. 受け入れ条件（MVP）
- フォルダを開いて文書を作成/編集/自動保存できる
- 段落DnD後も分析データが段落IDに追従する
- 解析実行で右カラムに3軸を表示できる
- ログインなしでは分析APIを呼べない
- 制限超過時に `429` とユーザー向けメッセージを返す
- 部分失敗時に反映0件で再試行導線を表示する

## 11. 実装開始時の参照ファイル
- クリーン仕様: `/Users/jane/devidea/liteLizard/LiteLizard_clean_spec_v1.md`
- スキーマ: `/Users/jane/devidea/liteLizard/LiteLizard_schema_v1.json`
- 詳細設計: `/Users/jane/devidea/liteLizard/LiteLizard_implementation_design.md`
