# 保存確定モデル

関連タスク: S-02
決定経緯: `docs/decisions.md` [2026-03-28] S-02

---

## 1. 基本方針

完全自動保存。明示保存（Ctrl+S）は提供しない。ユーザーは保存操作を意識せず、タイピングと内容に集中できる。

---

## 2. テキスト編集の自動保存

- **トリガー**: テキスト内容が変更されるたびにデバウンスタイマーをリセット
- **デバウンス時間**: **300ms**
- **保存対象**: エディタ上の現在のドキュメント全体（差分保存ではなく全体書き出し）
- **保存先**: 開いているファイルパスに上書き（`.md` / `.lzl` に応じた形式で）

```typescript
// 疑似コード
const SAVE_DEBOUNCE_MS = 300;
let saveTimer: ReturnType<typeof setTimeout> | null = null;

function onDocumentChange(document: LiteLizardDocument) {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveQueue.enqueue({ type: 'text', document, priority: 1 });
  }, SAVE_DEBOUNCE_MS);
}
```

---

## 3. DnD 並び替えの保存

- **トリガー**: ドロップ完了時に即確定（UI 上は即座に反映）
- **保存キュー**: テキスト編集と同じ保存キューに乗せるが、**優先度はテキスト編集より低い**
- **理由**: 並び替えはファイル全体の再構築を伴う可能性があり、テキスト編集の保存をブロックしない

```typescript
function onDragEnd(reorderedDocument: LiteLizardDocument) {
  // UI は即座に更新済み
  saveQueue.enqueue({ type: 'reorder', document: reorderedDocument, priority: 2 });
}
```

- **Undo との兼ね合い**: DnD 確定後の Undo で保存済みファイルとの不整合が生じる場合は、Undo 後に再度自動保存キューに乗せることで解決する。DnD の保存自体を遅延させる方式は、Undo 実装（S-08）で問題が判明した場合のフォールバックとして残す

---

## 4. 保存キュー

保存操作を直列化し、競合を防ぐ。

```typescript
interface SaveRequest {
  type: 'text' | 'reorder';
  document: LiteLizardDocument;
  priority: number; // 1 = 高（テキスト）, 2 = 低（並び替え）
}
```

- キューに同じファイルの保存リクエストが複数ある場合、最新のリクエストで上書き（古いリクエストは破棄）
- 保存中に新しいリクエストが来た場合、現在の保存完了後に最新リクエストを処理

---

## 5. Ctrl+S の扱い

**何もしない**。キーバインドを割り当てない。常に自動保存済みのため、明示保存の必要がない。

---

## 6. dirty インジケータ

**表示しない**。300ms デバウンスにより、ユーザーが「未保存かも」と感じる時間窓は実質存在しない。

---

## 7. エラー時の挙動（未決定）

保存失敗時の挙動は E-04 実装時に決定する。暫定方針:

- リトライ: 指数バックオフで3回まで
- 通知: 3回失敗後にトースト通知でユーザーに伝える
- データ保護: 未保存のドキュメントはメモリ上に保持し、次回保存成功まで破棄しない
