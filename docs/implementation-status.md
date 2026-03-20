# 実装状況（仕様 v003 対照）

最終更新: 2026-03-16

## ディレクトリ構造

```
apps/desktop/src/
├── main/
│   ├── main.ts                  — Electron メインプロセス
│   ├── apiBridge.ts             — API ブリッジ
│   ├── fileService.ts           — ファイル操作サービス
│   ├── ipc.ts                   — IPC ハンドラ
│   ├── ipcPathUtils.ts          — IPC パスユーティリティ
│   └── sessionVault.ts          — セッション管理
├── preload/
│   ├── preloadMockApi.ts        — モック API 定義
│   └── preloadMockData.ts       — モック初期データ
└── renderer/
    ├── main.tsx                 — エントリーポイント
    ├── App.tsx                  — アプリルート（自動保存等）
    ├── styles.css               — グローバルスタイル
    ├── global.d.ts              — 型宣言
    ├── components/
    │   ├── AnalysisPane.tsx      — 分析ペイン（段落カード・DnD・解析結果）
    │   ├── ExplorerPane.tsx      — ファイルツリー
    │   ├── LeftIconRail.tsx      — 左アイコンレール
    │   └── editor/
    │       ├── index.tsx         — エディター統合（視点切り替え）
    │       ├── EditorEmptyState.tsx
    │       ├── MacroView.tsx     — マクロ視点（章カード DnD）
    │       ├── MicroEditorView.tsx — ミクロ視点（Lexical エディタ）
    │       ├── components/
    │       │   └── ChapterCard.tsx
    │       ├── plugins/
    │       │   ├── ChapterCommandPlugin.tsx
    │       │   ├── DragHandlePlugin.tsx
    │       │   ├── LexicalEditorRefPlugin.tsx
    │       │   ├── StructureChromePlugin.tsx
    │       │   └── StructureStatePlugin.tsx
    │       └── utils/
    │           ├── ids.ts
    │           ├── nodeKeyMapping.ts
    │           └── structureBuilder.ts
    ├── hooks/
    │   └── useResizablePanel.ts — パネルリサイズフック
    ├── store/
    │   ├── useAppStore.ts       — Zustand ストア
    │   └── documentOps.ts       — ドキュメント操作
    ├── types/
    │   └── documentStructure.ts — ドキュメント構造型定義
    └── utils/
        └── arrayUtils.ts        — 配列ユーティリティ
```

---

## 実装済み

### エディターパネル
- **ミクロ視点**：`MicroEditorView.tsx` — Lexical エディタ、段落ごとにチャンク表示
- **マクロ視点**：`MacroView.tsx` — @dnd-kit による章カード一覧（`ChapterCard.tsx`）
- **視点切り替え**：`Ctrl/Cmd + ホイール` で micro ↔ macro スナップ切り替え（`editor/index.tsx`）
- **段落 DnD（ミクロ）**：`DragHandlePlugin.tsx` — portal + ResizeObserver、useDndMonitor
- **章 DnD（マクロ）**：`MacroView.tsx` — @dnd-kit/sortable
- **文字数表示**：エディターフッターに合計文字数

### 分析ペイン
- **段落カード**：`AnalysisPane.tsx` — 段落ごとにカード表示、クリックでエディター側スクロール連動
- **段落カード DnD**：AnalysisPane 内ドラッグ&ドロップ → `reorderParagraphs` 呼び出し
- **解析実行**：`useAppStore.runAnalysis()` — stale 段落を一括キューイング、pending/complete/failed ステータス管理
- **解析結果表示**：emotion / theme タグ、deepMeaning、confidence、analyzedAt

### エクスプローラーパネル
- **ファイルツリー表示**：`ExplorerPane.tsx` — フォルダ開閉、ファイル選択
- **新規ファイル / フォルダ作成**：ツールバーの「＋」ボタン + ポップオーバー
- **右クリックメニュー**：リネーム / 削除 / 新規作成
- **フォルダを開く**：`openFolder()` → OS ダイアログ → ツリー更新

### ファイル操作
- **ファイル読み込み**：`loadDocument()` — `.lzl` ファイルを開いてドキュメント復元
- **ファイル保存**：`saveNow()` — リビジョン競合チェック付き手動保存
- **自動保存**：`dirty` フラグがたったら 2.5 秒後に `saveNow()` を実行（`App.tsx`）
- **リネーム**：`renameEntry()` — 開いているファイルのパスも追従
- **削除**：`deleteEntry()` — 削除ファイルが開いていれば document をクリア

### 状態管理（Zustand v5）
- **ストア**：`useAppStore.ts`
- **ドキュメント操作**：`documentOps.ts`（updateParagraph / reorderParagraphs / reorderChapters / syncDocumentStructure）

### UIレイアウト
- **3カラム構成**：LeftIconRail / ExplorerPane（リサイズ可） / EditorPane / AnalysisPane（リサイズ可）
- **エディターモード**：writing / structure / reader の3モード、`Cmd/Ctrl+Shift+M` でサイクル切り替え
- **チャットパネル**：`Cmd/Ctrl+Shift+A` でトグル開閉

### モック・ブラウザ対応
- **モックAPI**：`preloadMockApi.ts` — ファイル管理・ドキュメントCRUD・モック解析すべて実装済み
- **モック初期データ**：`preloadMockData.ts`
- **認証フラグ**：`apiKeyConfigured` フラグ管理、未設定時は解析を無効化
- **モックAPI自動注入**：ブラウザ起動時に `main.tsx` でモックAPIを自動セットアップ（T1）
- **AnalysisPane 生成ボタン**：全体「生成」ボタン（`runAnalysis`）・カード個別「↺」ボタン（`runAnalysisFor`）（T2）
- **起動時ドキュメント自動展開**：ブラウザ起動時に welcome.md を自動で開く（T3）

---

## 部分実装・仕様との差異

| 項目 | 状況 | 詳細は |
|------|------|--------|
| ファイル形式 | 現状 `.md`（仕様は `.lzl`） | `docs/decisions.md` 参照 |
| APIキー管理 | クライアント側に実装（仕様§9と差異） | `docs/decisions.md` 参照 |
| 章 CRUD | 追加・並び替えは実装済み。削除・吸収マージは未実装 | — |
| ログイン UI | フラグのみ管理、画面は未実装 | — |
| Undo / Redo | テキスト編集のみ対応。DnD並び替えは未対応 | — |

---

## 未実装（MVP スコープ内だが未着手）

現時点で MVP ブロッカーとなる未実装項目はなし。

---

## 将来実装（MVP スコープ外）

- 縦書き / 横書き切り替え
- 分析ペイン：章サマリー表示
- `.lzl` 内部フォーマット策定
- ID 重複検出・自動修復
- DnD 並び替えの Undo 対応
