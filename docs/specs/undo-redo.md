# Undo/Redo 対象範囲と実装方針

関連タスク: S-08
決定経緯: `docs/decisions.md` [2026-04-03] S-08

---

## 1. 対象操作

以下のすべての操作を Undo/Redo の対象とする。

| 操作 | 分類 |
|------|------|
| テキスト入力・削除 | テキスト編集 |
| 章の削除・追加 | 構造操作 |
| 段落の統合（Backspace） | 構造操作 |
| 段落の分割（Enter） | 構造操作 |
| DnD による章・段落の並び替え | 構造操作 |

---

## 2. 実装方針: Zustand 統合 Command スタック方式

### 2.1 基本構造

```typescript
interface UndoCommand {
  lexicalStateJson: string;        // editor.getEditorState().toJSON()
  documentSnapshot: LiteLizardDocument;  // Zustand の document
}

// Zustand store に追加
interface UndoState {
  undoStack: UndoCommand[];
  redoStack: UndoCommand[];
  pushUndo: (cmd: UndoCommand) => void;
  undo: () => void;
  redo: () => void;
}
```

- スタック上限: **50件**（超過時は古い順に破棄）

### 2.2 Lexical HistoryPlugin の無効化

- `MicroEditorView.tsx` の `<HistoryPlugin />` を削除
- 代わりに自前の `UndoPlugin` を追加する（§2.3 参照）
- Lexical 内部の `UNDO_COMMAND` / `REDO_COMMAND` をキャンセルするか、グローバルハンドラに委譲する

### 2.3 UndoPlugin の責務

テキスト編集時に Lexical の `ON_CHANGE_COMMAND` を購読し、変更ごとに `pushUndo()` を呼ぶ。

**テキスト編集の Undo 粒度**: Lexical のデフォルトグループ単位を踏襲する（個別キーストロークではなく、一定の無操作期間で自動グループ化される単位）。実装上は Lexical の履歴変化タイミングに合わせてスナップショットを取る。

### 2.4 構造操作の扱い

`ChapterCommandPlugin.tsx`（章削除・段落統合/分割）および DnD ハンドラ（`DragHandlePlugin.tsx`、`MacroView.tsx`）の各操作実行**直前**に `pushUndo()` を呼ぶ。

```typescript
// 操作前にスナップショットを保存してから実行
store.pushUndo({
  lexicalStateJson: editor.getEditorState().toJSON(),
  documentSnapshot: structuredClone(store.document),
});
// → 操作を実行
```

### 2.5 Undo/Redo の復元処理

```typescript
undo: () => {
  const cmd = undoStack.pop();
  if (!cmd) return;
  redoStack.push(currentSnapshot());
  editor.setEditorState(editor.parseEditorState(cmd.lexicalStateJson));
  store.setDocument(cmd.documentSnapshot);
}
```

- Lexical の `editor.parseEditorState()` + `editor.setEditorState()` でエディタを復元
- Zustand の `document` を同時に置き換える

---

## 3. キーボードショートカット

- `Ctrl+Z` / `Cmd+Z`: Undo
- `Ctrl+Y` / `Cmd+Shift+Z`: Redo
- App レベルのグローバルキーハンドラで `store.undo()` / `store.redo()` を呼ぶ
- Lexical に Ctrl+Z が到達しないようインターセプト（`COMMAND_PRIORITY_HIGH` または `keydown` で `preventDefault`）

---

## 4. MVP スコープ外

- DnD 並び替えの Undo はアーキテクチャ上は対象だが、R-03 実装時に実現可否・優先度を再判断する
- ファイル保存操作の Undo（保存済みの内容を元に戻す）は対象外
