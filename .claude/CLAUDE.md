日本語で応答してください。
ユーザーは音声入力で指示を飛ばすことがあります。誤字がある場合は適宜文脈から内容を読み取ってください。
実装を進めながら仕様を動的に変更していく予定のため、将来的な拡張性を加味した実装方針の検討や問題点の指摘などを行なってください。

---

## PROJECTMEMORY/ ファイル構成

| ファイル | 所有者 | 役割 |
|---|---|---|
| `PROJECTMEMORY/WORKSPACE.md` | ユーザー | 思考・懸念・アイデアのブレインダンプ。形式不問。Claudeがチャット開始時に読んでTASKS.mdへ整理する |
| `PROJECTMEMORY/TASKS.md` | Claude | タスクリスト（実行タスク / 懸念 / アイデアボックス / 完了済み）。ユーザーは直接編集しない |
| `PROJECTMEMORY/DECISIONS.md` | Claude | 技術選択の理由・却下した代替案・仕様との意図的な差異のログ。同じ議論を繰り返さないための記録 |
| `PROJECTMEMORY/ARCHIVE.md` | Claude | TASKS.mdの完了済みが10件を超えたら古い順に移動する長期保管庫。通常は読まなくてよい |

---

## チャット開始時のルール

1. **`PROJECTMEMORY/WORKSPACE.md` を読む**
   - 「📥 インボックス」に未処理の内容があれば分類して処理する：
     - 実行可能なもの → `PROJECTMEMORY/TASKS.md` の「📋 実行タスク」に優先度順で挿入
     - 懸念・リスク → `TASKS.md` の「⚠️ 懸念・リスク」セクションへ
     - アイデア → `TASKS.md` の「💡 アイデアボックス」へ
     - 文脈・背景情報のみ → TASKS.mdには追加しない（WORKSPACEに残す）
   - 処理した内容は「📦 処理済み」セクションへ移動する（日付つき）

2. **`PROJECTMEMORY/TASKS.md` を読む**
   - 以下の3行サマリーをユーザーに提示する：
     1. ダッシュボードのタスク名（今すぐやること）
     2. その次のタスク名
     3. 全体進捗（完了N件 / 残りN件）

3. **タスク完了時**
   - 該当タスクを `✅ 完了済みタスク` セクションに移動する
   - **ダッシュボードを次の最優先タスクに更新する**（必須）
   - 完了済みが10件を超えたら古い順から `PROJECTMEMORY/ARCHIVE.md` へ移動する

## タスク優先度の判断ルール

- **優先度はClaudeが開発者視点で客観的に決定する**
  - ブロッカー（他タスクの前提になるもの）を最優先
  - 次に、公開目標に直接影響するもの
  - 工数が少なく効果が大きいものを上位に
- **ユーザーが明示的に指定した場合はその意向を最優先にする**
- **新規タスク追加時**: WORKSPACEから抽出 → 優先度判断 → 実行タスクリストの適切な位置に挿入 → ダッシュボードが影響を受けるなら更新する

## タスク粒度ルール

- **1タスク = 30分以内で完了できる単位** を原則とする
- 大きな作業はこの単位に分割してからタスクリストに追加する
- **例外**: 実機確認・外部サービス待ち・録画作業など、性質上これ以上分割できないタスクはそのまま1タスクとして記載してよい（その場合は工数に「半日」「バッファ込み」等を明記する）

---

## 実装状況（仕様 v003 対照）

最終更新: 2026-03-05

### ✅ 実装済み

#### エディターパネル
- **ミクロ視点**：`MicroEditorView.tsx` — Lexical エディタ、段落ごとにチャンク表示
- **マクロ視点**：`MacroView.tsx` — @dnd-kit による章カード一覧（`ChapterCard.tsx`）
- **視点切り替え**：`Ctrl/Cmd + ホイール` で micro ↔ macro スナップ切り替え（`editor/index.tsx`）
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

#### 状態管理（Zustand v5）
- **ストア**：`useAppStore.ts`
- **ドキュメント操作**：`documentOps.ts`（updateParagraph / reorderParagraphs / reorderChapters / syncDocumentStructure）

#### UIレイアウト
- **3カラム構成**：LeftIconRail / ExplorerPane（リサイズ可） / EditorPane / AnalysisPane（リサイズ可）
- **エディターモード**：writing / structure / reader の3モード、`Cmd/Ctrl+Shift+M` でサイクル切り替え
- **チャットパネル**：`Cmd/Ctrl+Shift+A` でトグル開閉

#### モック・ブラウザ対応
- **モックAPI**：`preloadMockApi.ts` — ファイル管理・ドキュメントCRUD・モック解析すべて実装済み
- **モック初期データ**：`preloadMockData.ts`
- **認証フラグ**：`apiKeyConfigured` フラグ管理、未設定時は解析を無効化

---

### ⚠️ 部分実装・仕様との差異

| 項目 | 状況 | 詳細は |
|------|------|--------|
| ファイル形式 | 現状 `.md`（仕様は `.lzl`） | `DECISIONS.md` 参照 |
| APIキー管理 | クライアント側に実装（仕様§9と差異） | `DECISIONS.md` 参照 |
| 章 CRUD | 追加・並び替えは実装済み。削除・吸収マージは未実装 | — |
| ログイン UI | フラグのみ管理、画面は未実装 | — |
| Undo / Redo | テキスト編集のみ対応。DnD並び替えは未対応 | — |

---

### ❌ 未実装（MVP スコープ内だが未着手）

- 全体解析ボタン UI（`runAnalysis()` のロジックは実装済み）
- ブラウザ起動時のモックAPI自動注入（`main.tsx`）← **GitHub Pages 公開のブロッカー**
- AnalysisPane の「生成」ボタン ← **GitHub Pages 公開のブロッカー**

---

### 将来実装（MVP スコープ外）

- 縦書き / 横書き切り替え
- 分析ペイン：章サマリー表示
- `.lzl` 内部フォーマット策定
- ID 重複検出・自動修復
- DnD 並び替えの Undo 対応
