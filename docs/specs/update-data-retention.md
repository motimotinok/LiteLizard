# アプリ更新時のローカルデータ保持仕様

関連タスク: #124
ステータス: stable
改訂: 2026-07-01 初版

---

LiteLizard の通常更新では、アプリ本体と Electron `userData` は別領域として扱う。DMG を入れ直しても、`appId` / `productName` / Electron の `userData` 解決が変わらない限り、ユーザー設定、API キー、Reading Agent、最近開いたプロジェクトは保持される前提とする。

## 1. 変えてはいけない識別子

現行の配布識別子は次の値を正とする。

| 項目 | 値 | 影響 |
|------|----|------|
| `build.appId` | `app.litelizard.desktop` | 署名、将来の自動更新、OS 側のアプリ識別 |
| `build.productName` | `LiteLizard` | Electron `userData` パス名、Keychain 表示名、配布物名 |

明示的な移行設計なしに `appId` または `productName` を変更しない。特に `productName` が変わると Electron の `app.getPath('userData')` が別ディレクトリになり、設定が消えたように見える可能性がある。

変更が必要な場合は、旧 `userData` から新 `userData` への移行、Keychain / safeStorage の復号可否、旧アプリとの同時存在、失敗時の再設定導線を別 Issue で設計してから実装する。

## 2. userData 保持対象

現行実装で `userData` に保存するファイルは次の通り。

| ファイル | 保存内容 | 実装 |
|----------|----------|------|
| `agents.json` | ユーザーが追加・編集した Reading Agent | `apps/desktop/src/main/agentStore.ts` |
| `agents.json.bak` | 不正または旧形式 `agents.json` の退避 | `apps/desktop/src/main/agentStore.ts` |
| `analysis-settings.json` | 既定 provider、モデル、Local LLM endpoint、確認省略、エディタ調整 | `apps/desktop/src/main/analysisSettingsStore.ts` |
| `app-store.json` | 直近フォルダ、最近開いたプロジェクト、active Reading Agent | `apps/desktop/src/main/appStore.ts` |
| `api-keys.bin` | `safeStorage` で暗号化した API キー | `apps/desktop/src/main/sessionVault.ts` |
| `api-keys.plaintext` | `safeStorage` 利用不可環境での API キー fallback | `apps/desktop/src/main/sessionVault.ts` |

プロジェクト本文と分析履歴はユーザーが選んだ作業フォルダ配下に保存される。`userData` ではなく、`.lzl` 文書と `<projectRoot>/.litelizard/analysis/` が保持対象である。

## 3. API キーと safeStorage

API キーは `safeStorage.isEncryptionAvailable()` が真なら `api-keys.bin` に保存し、`api-keys.plaintext` は削除する。利用不可の場合だけ `api-keys.plaintext` に JSON として保存し、`api-keys.bin` は削除する。

読み込み時は `api-keys.bin` を優先する。復号や JSON parse に失敗した場合は空の secrets として扱い、provider 設定上は API キー未設定になる。既存の UI は API キー未設定として設定導線を表示するため、ユーザーは再入力で復旧できる。

復号失敗時にファイルを自動削除しない。Keychain 状態、署名差し替え、OS 移行などで一時的に復号できないケースがあるため、破壊的な復旧はしない。

## 4. 更新検証チェック

自動更新または署名済み配布を導入する前に、最低限次を確認する。

- 旧ビルド相当で `agents.json`、`analysis-settings.json`、`app-store.json`、`api-keys.bin` または `api-keys.plaintext` を作る。
- 新ビルド相当で同じ `userData` を読み、Reading Agent、active Reading Agent、最近開いたプロジェクト、分析設定が保持されていることを確認する。
- `safeStorage` 利用可能環境では、更新後に `api-keys.bin` を復号して provider が `apiKeyConfigured: true` になることを確認する。
- `safeStorage` 利用不可または復号失敗を模擬した場合、API キー未設定として表示され、設定画面から再保存できることを確認する。
- `appId` / `productName` / `userData` の解決結果を変更していないことを確認する。

CLI で確認できる範囲は次のテストを最低限実行する。

```bash
pnpm --filter @litelizard/desktop test -- agentStore analysisSettingsStore sessionVault appStore
```

GUI / packaged app での実更新確認は `docs/release-checklist.md` の手動項目に従う。

## 5. 将来のアカウント・entitlement 方針

Premium アカウント、entitlement、OAuth セッションを追加する場合も、原則として Electron `userData` 配下に保存する。シークレットやセッショントークンは `safeStorage` を使い、復号できない場合は未ログイン状態として再ログイン導線を表示する。

entitlement はサーバー側を正とし、ローカル保存はオフライン時のキャッシュまたは最終確認結果に限定する。ローカルファイルだけで恒久的な有料状態を確定しない。

ログアウト、トークン失効、端末移行、署名変更、`appId` / `productName` 変更の扱いは、クラウド認証を実装する時点で別途仕様化する。
