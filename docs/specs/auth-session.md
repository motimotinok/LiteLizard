# 認証・セッションフロー仕様

関連タスク: S-05, S-09
決定経緯: `docs/decisions.md` [2026-03-27] S-05, [2026-03-30] S-09
改訂: 2026-03-30 S-09 によりローカル完結主軸に改訂

> **S-09 方針**: 分析機能はログイン不要で利用可能（外部 API キーまたはローカル LLM）。クラウドサーバーログイン（OAuth）は将来の拡張パスとして残す。

---

## 1. 分析機能の利用方式

分析機能はローカル完結が主軸。ログインなしで利用可能。

| 方式 | ログイン | 実装時期 |
|------|---------|---------|
| 外部 API キー（OpenAI / Anthropic 等） | **不要** | MVP |
| ローカル LLM（Ollama 等） | **不要** | MVP or P2 |
| クラウドサーバー（OAuth） | 必要 | 将来拡張 |

### 1.1 クラウドログイン（将来）

OAuth のみを採用する。メール+パスワード、マジックリンクは提供しない。

OAuth プロバイダーの選定は A-01 着手時に決定する（Google / GitHub / その他）。

---

## 2. safeStorage によるシークレット管理

Electron の `safeStorage` API を使用して、以下のシークレットを暗号化保存する:

- **外部 API キー**（MVP）: ユーザーが設定画面で登録した OpenAI / Anthropic 等の API キー
- **セッショントークン**（将来）: OAuth ログイン後のトークン

```ts
import { safeStorage } from 'electron';

// 保存
const encrypted = safeStorage.encryptString(secret);
fs.writeFileSync(secretPath, encrypted);

// 読み込み
const encrypted = fs.readFileSync(secretPath);
const secret = safeStorage.decryptString(encrypted);
```

OS ごとのバックエンド:

| OS | 暗号化バックエンド |
|----|-----------------|
| macOS | Keychain |
| Windows | DPAPI |
| Linux | libsecret / kwallet |

保存先パス:
- API キー: `app.getPath('userData')/api-keys.bin`
- セッショントークン（将来）: `app.getPath('userData')/session.bin`

---

## 3. 分析機能の利用条件と UI 制御

### 3.1 利用条件

分析機能を利用するには、以下のいずれかが設定されている必要がある:

1. 外部 API キーが登録済み
2. ローカル LLM のエンドポイントが設定済み
3. クラウドサーバーにログイン済み（将来）

### 3.2 未設定時の挙動

API キー未設定 かつ ローカル LLM 未設定の場合、分析パネルを開くと以下を表示する:

- 設定ボタン（API キー設定画面を開く）
- メッセージ: 「分析機能を使用するには API キーの設定が必要です」

分析結果 UI、モード選択 UI は表示しない。

### 3.3 変化しない機能

エディタ、ファイル操作、エクスプローラー、DnD など分析パネル以外のすべての機能は、API キー設定状態に関わらず動作する。

---

## 4. セッション有効期限・更新（将来）

OAuth トークンのリフレッシュ方式は A-01（OAuth 実装）着手時に決定する。

---

## 5. 未決定事項

| 項目 | 決定タイミング |
|------|-------------|
| API キー設定 UI の詳細レイアウト | L-01 着手時 |
| ローカル LLM 対応モデルの要件 | L-08 着手時 |
| OAuth プロバイダー選定 | A-01 着手時（将来） |
| トークンのリフレッシュ方式 | A-01 着手時（将来） |
| ログアウト処理 | A-02 着手時（将来） |
