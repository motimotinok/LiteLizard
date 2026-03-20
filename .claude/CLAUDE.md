日本語で応答してください。
ユーザーは音声入力で指示を飛ばすことがあります。誤字がある場合は適宜文脈から内容を読み取ってください。
実装を進めながら仕様を動的に変更していく予定のため、将来的な拡張性を加味した実装方針の検討や問題点の指摘などを行なってください。

---

## Claude の役割

このプロジェクトでは **Claude（あなた）と Codex が並列で開発** を行う。

### Claude が担うこと
- **仕様策定・設計判断**: ユーザーとの対話を通じて仕様を詰め、設計を決定する
- **設計判断が必要な実装タスク**: Lexical 統合、ストア設計変更など、既存コードとの整合判断が必要なもの
- **WBS の更新・タスク割り振り**: `docs/wbs.md` にタスクを追加・割り振り・優先度付けする
- **PROJECTMEMORY の管理**: WORKSPACE / TASKS / ARCHIVE の整理・更新
- **設計判断の記録**: `docs/decisions.md` に技術選択の理由を記録する

### Claude が担わないこと
- PR レビュー（Codex が自動レビューする）
- 入出力が明確で機械的な実装タスク（Codex に委譲する）

---

## 並列開発ワークフロー

### 構成

```
worktree①: /Users/jane/litelizard/claude  → Claude 作業場
worktree②: /Users/jane/litelizard/codex   → Codex 作業場
```

### ブランチ運用（固定ブランチ方式）
- **Claude**: `claude/task` ブランチに常駐。PR は `dev` ベース
- **Codex**: `codex/task` ブランチに常駐。PR は `dev` ベース
- タスクごとにブランチを切らず、固定ブランチ上でこまめに PR を出す
- PR マージ後は `git fetch origin && git merge origin/dev` で最新を取り込む

### タスクの流れ
1. Claude + ユーザーが `docs/wbs.md` でタスクを洗い出し・割り振る
2. 各自が固定ブランチ上で作業し、区切りのいいところで PR を出す
3. 完了したら `docs/wbs.md` のステータスを更新
4. PR マージで `dev` に反映 → 各自 `git merge origin/dev` で同期

### ファイルの役割分担

| ファイル | 管理 | 役割 |
|---------|------|------|
| `docs/wbs.md` | git 管理 | タスク台帳（唯一の信頼できるソース）。Claude・Codex 両方が参照・更新 |
| `docs/decisions.md` | git 管理 | 設計判断ログ。Claude・Codex 両方が参照 |
| `docs/LiteLizard_spec_v003.md` | git 管理 | 仕様書 |
| `PROJECTMEMORY/WORKSPACE.md` | .gitignore | ユーザーのメモ帳。Claude のみ参照 |
| `PROJECTMEMORY/TASKS.md` | .gitignore | Claude 対話用ダッシュボード。Claude のみ参照・更新 |
| `PROJECTMEMORY/ARCHIVE.md` | .gitignore | 完了タスク保管庫。Claude のみ |

---

## PROJECTMEMORY/ ファイル構成

| ファイル | 所有者 | 役割 |
|---|---|---|
| `PROJECTMEMORY/WORKSPACE.md` | ユーザー | 思考・懸念・アイデアのブレインダンプ。形式不問。Claudeがチャット開始時に読んでTASKS.mdへ整理する |
| `PROJECTMEMORY/TASKS.md` | Claude | タスクリスト（実行タスク / 懸念 / アイデアボックス / 完了済み）。ユーザーは直接編集しない |
| `docs/decisions.md` | Claude | 技術選択の理由・却下した代替案・仕様との意図的な差異のログ。同じ議論を繰り返さないための記録。**git 管理**（Codex からも参照可能） |
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
   - **`docs/wbs.md` のステータスも `✅` に更新する**

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

## サブエージェント利用ルール

### コードベース調査
タスクの影響ファイル特定やコード構造の把握など、コードベースの広範な調査が必要な場合は **Explore エージェント**を使う。Explore は Glob / Grep / Read を駆使してコードベースを効率的に探索できる。単純なファイル検索やキーワード検索は Glob / Grep を直接使えばよいが、複数の観点からの調査が必要な場合は Explore に委譲する。

---

## サブエージェント並列実行ルール

### 前提
`/parallel-planner` スキルで生成されたプラン、またはそれに準ずる並列実行プランがある場合、以下のルールに従ってサブエージェントを起動する。

### エージェントチェーン

各タスクは以下の順序でサブエージェントをチェーン実行する:

```
plan-executor → feature-test-writer → code-reviewer → debugger
                                            ↑              ↓
                                            └──────────────┘
                                          問題解消までループ（最大3回）
```

1. **plan-executor**（実装）— プランの指示に従いコーディング。スコープ外のファイル変更は禁止
2. **feature-test-writer**（テスト）— 実装された機能の要件ベーステストを作成・実行
3. **code-reviewer**（レビュー）— 実装とテストをレビュー。問題なければ LGTM → 完了。問題あれば指摘事項を出す
4. **debugger**（修正）— code-reviewer の指摘をもとに修正。修正後 → 再び code-reviewer へ

### Wave 実行手順

1. **Wave 内の全タスクをバックグラウンドで並列起動する**
   - 各タスクに対して `general-purpose` エージェントを `run_in_background: true` で起動
   - 各エージェントのプロンプトにはプランの該当タスク情報（指示・スコープ制約・完了条件）とチェーン実行指示を含める
2. **全タスクの完了通知を待つ**
3. **次の Wave に進む**（前の Wave の成果物が必要な場合は `git` で確認）
4. **全 Wave 完了後、ユーザーに結果を報告する**

### 各サブエージェントへ渡す情報

| 項目 | 必須 |
|------|------|
| タスクの目的と完了条件 | ✅ |
| 変更対象ファイルの明示的リスト（スコープ制約） | ✅ |
| 関連する仕様・decisions.md の参照先 | 該当する場合 |
| 前段エージェントの出力 | チェーン2段目以降 |

### スコープ制約の厳守

並列実行時のファイル競合を防ぐため、各タスクのサブエージェントには**プランで指定されたファイルのみ変更可能**という制約を明示すること。プランに記載のないファイルを変更する必要が生じた場合は、実装を中断してその旨を報告する。

### review-debug ループの上限

code-reviewer ↔ debugger のループは**最大3回**。3回で解消しない場合はループを打ち切り、問題の内容をユーザーに報告して判断を仰ぐ。

---

## 実装状況（仕様 v003 対照）

最終更新: 2026-03-16

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
- **モックAPI自動注入**：ブラウザ起動時に `main.tsx` でモックAPIを自動セットアップ（T1）
- **AnalysisPane 生成ボタン**：全体「生成」ボタン（`runAnalysis`）・カード個別「↺」ボタン（`runAnalysisFor`）（T2）
- **起動時ドキュメント自動展開**：ブラウザ起動時に welcome.md を自動で開く（T3）

---

### ⚠️ 部分実装・仕様との差異

| 項目 | 状況 | 詳細は |
|------|------|--------|
| ファイル形式 | 現状 `.md`（仕様は `.lzl`） | `docs/decisions.md` 参照 |
| APIキー管理 | クライアント側に実装（仕様§9と差異） | `docs/decisions.md` 参照 |
| 章 CRUD | 追加・並び替えは実装済み。削除・吸収マージは未実装 | — |
| ログイン UI | フラグのみ管理、画面は未実装 | — |
| Undo / Redo | テキスト編集のみ対応。DnD並び替えは未対応 | — |

---

### ❌ 未実装（MVP スコープ内だが未着手）

現時点で MVP ブロッカーとなる未実装項目はなし。

---

### 将来実装（MVP スコープ外）

- 縦書き / 横書き切り替え
- 分析ペイン：章サマリー表示
- `.lzl` 内部フォーマット策定
- ID 重複検出・自動修復
- DnD 並び替えの Undo 対応
