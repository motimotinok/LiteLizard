日本語で応答してください。
ユーザーは音声入力で指示を飛ばすことがあります。誤字がある場合は適宜文脈から内容を読み取ってください。
実装を進めながら仕様を動的に変更していく予定のため、将来的な拡張性を加味した実装方針の検討や問題点の指摘などを行なってください。

## CLAUDE.md 更新ルール

- **実装を進めたとき・仕様変更があったときは必ずこのファイルの「実装状況」セクションを更新すること。**
- 追加・変更・削除した機能をそれぞれ記載する。
- 仕様（docs/LiteLizard_spec_v003.md）との差異が生じた場合は「仕様との差異」に明記する。

---

## 実装状況（仕様 v003 対照）

最終更新: 2026-03-04

### ✅ 実装済み

#### エディターパネル
- **ミクロ視点**：`MicroEditorView.tsx` — Lexical エディタ、段落ごとにチャンク表示
- **マクロ視点**：`MacroView.tsx` — @dnd-kit による章カード一覧（`ChapterCard.tsx`）
- **視点切り替え**：`Ctrl/Cmd + ホイール` で micro ↔ macro スナップ切り替え（`index.tsx`）
- **段落 DnD（ミクロ）**：`DragHandlePlugin.tsx` — portal + ResizeObserver、useDndMonitor
- **章 DnD（マクロ）**：`MacroView.tsx` — @dnd-kit/sortable
- **文字数表示**：エディターフッターに合計文字数

#### 分析ペイン
- **段落カード**：`AnalysisPane.tsx` — 段落ごとにカード表示、クリックでエディター側スクロール連動
- **段落カード DnD**：AnalysisPane 内ドラッグ&ドロップ → `reorderParagraphs` 呼び出し
- **解析実行**：`useAppStore.runAnalysis()` — stale 段落を一括キューイング、pending/complete/failed ステータス管理
- **解析結果表示**：emotion / theme タグ、deepMeaning、confidence、analyzedAt

#### エクスプローラーパネル
- **ファイルツリー表示**：`ExplorerPane.tsx` — フォルダ開閉、ファイル選択
- **新規ファイル / フォルダ作成**：ツールバーの「＋」ボタン + ポップオーバー
- **右クリックメニュー**：リネーム / 削除 / 新規作成
- **フォルダを開く**：`openFolder()` → OS ダイアログ → ツリー更新

#### ファイル操作
- **ファイル読み込み**：`loadDocument()` — `.lzl` ファイルを開いてドキュメント復元
- **ファイル保存**：`saveNow()` — リビジョン競合チェック付き手動保存
- **自動保存**：`dirty` フラグがたったら 2.5 秒後に `saveNow()` を実行（`App.tsx`）
- **リネーム**：`renameEntry()` — 開いているファイルのパスも追従
- **削除**：`deleteEntry()` — 削除ファイルが開いていれば document をクリア

#### 状態管理（Zustand）
- **ストア**：`useAppStore.ts`
- **ドキュメント操作**：`documentOps.ts`（updateParagraph / reorderParagraphs / reorderChapters / syncDocumentStructure）

#### UIレイアウト
- **3カラム構成**：LeftIconRail / ExplorerPane（リサイズ可） / EditorPane / AnalysisPane（チャットパネル、リサイズ可）
- **エディターモード**：writing / structure / reader の3モード、`Cmd/Ctrl+Shift+M` でサイクル切り替え
- **チャットパネル**：`Cmd/Ctrl+Shift+A` でトグル開閉

#### 認証
- `apiKeyConfigured` フラグ管理、`saveApiKey` / `clearApiKey` / `bootstrapApiKeyStatus` を実装済み
- 未ログイン時は解析を無効化（statusMessage 表示のみ）

---

### ⚠️ 部分実装・仕様との差異

| 項目 | 状況 | 備考 |
|------|------|------|
| ファイル形式 | 現状 `.md` を扱っている（`titleFromPath` が `.md` を除去） | 仕様は `.lzl`。移行タイミング未決定 |
| APIキー管理 | クライアント側に `saveApiKey` を実装 | 仕様§9では「クライアント側に個別 API キー設定画面は持たない」と定義。実装が先行 |
| 章 CRUD | 章の追加（ChapterCommandPlugin）・並び替え（reorderChapters）は実装済み | 章の削除・吸収マージは未実装 |
| ログイン UI | フラグのみ管理、ログイン画面 UI は未実装 | |
| Undo / Redo | Lexical のテキスト編集は標準 Undo/Redo 対応 | DnD 並び替えの Undo は未実装 |

---

### ❌ 未実装（MVP スコープ内だが未着手）

- 縦書き / 横書き切り替え（仕様上は「将来実装」）
- 分析ペイン：章サマリー表示（仕様上は「将来実装」）
- `.lzl` 内部フォーマット策定（仕様§13 は未策定）
- ID 重複検出・自動修復
- 全体解析ボタン UI（ロジックは実装済み、UI の配置は未定）
