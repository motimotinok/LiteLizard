# 認証・セッションフロー仕様

関連タスク: S-05
決定経緯: `docs/decisions.md` [2026-03-27] S-05

---

## 1. ログイン方式

OAuth のみを採用する。メール+パスワード、マジックリンクは提供しない。

OAuth プロバイダーの選定は A-01 着手時に決定する（Google / GitHub / その他）。

---

## 2. セッショントークンの保存

Electron の `safeStorage` API を使用してトークンを暗号化保存する。

```ts
import { safeStorage } from 'electron';

// 保存
const encrypted = safeStorage.encryptString(token);
fs.writeFileSync(tokenPath, encrypted);

// 読み込み
const encrypted = fs.readFileSync(tokenPath);
const token = safeStorage.decryptString(encrypted);
```

OS ごとのバックエンド:

| OS | 暗号化バックエンド |
|----|-----------------|
| macOS | Keychain |
| Windows | DPAPI |
| Linux | libsecret / kwallet |

保存先パス: `app.getPath('userData')/session.bin`（バイナリ、平文ではない）

---

## 3. 未ログイン時の挙動

### 3.1 変化する機能

| 機能 | 未ログイン | ログイン済み |
|------|-----------|-------------|
| 分析パネル | ログインボタン＋メッセージを表示 | 通常の分析 UI |

### 3.2 変化しない機能

エディタ、ファイル操作、エクスプローラー、DnD など分析パネル以外のすべての機能はログイン状態に関わらず動作する。

### 3.3 分析パネルの未ログイン表示

分析パネルを開いたとき、ログインしていない場合は以下を表示する:

- ログインボタン（OAuth フローを起動）
- メッセージ: 「分析機能を使用するにはログインが必要です」

分析結果 UI、モード選択 UI は表示しない。

---

## 4. セッション有効期限・更新

トークンのリフレッシュ方式は A-01（OAuth 実装）で決定する。

---

## 5. 未決定事項

| 項目 | 決定タイミング |
|------|-------------|
| OAuth プロバイダー選定 | A-01 着手時 |
| トークンのリフレッシュ方式 | A-01 着手時 |
| ログアウト処理 | A-02 着手時 |
