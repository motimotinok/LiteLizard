# LiteLizard — Codex エージェント向け指示

## 基本ルール

- **日本語で応答してください。**
- コードのコメント・JSDoc・変数名は日本語でも英語でも構いません。ただし既存コードのスタイルに合わせてください。
- ロジックの変更を指示されていない場合は、コードのロジックを変更しないこと。

---

## プロジェクト概要

Electron + Vite + React 19 + TypeScript のデスクトップ執筆アプリ。
ブラウザ（GitHub Pages）でも動作するモックモードを持つ。

---

## ディレクトリ構成

```
apps/desktop/src/
├── main/              # Electron メインプロセス
├── preload/           # Electron preload（window.litelizard API定義）
│   ├── preloadMockApi.ts   # ブラウザ用モックAPI実装
│   └── preloadMockData.ts  # モック初期データ
└── renderer/          # React フロントエンド（メインの開発対象）
    ├── App.tsx
    ├── main.tsx
    ├── store/
    │   ├── useAppStore.ts   # Zustand v5 グローバルストア
    │   └── documentOps.ts   # ドキュメント操作（段落・章の更新/並び替え）
    ├── components/
    │   ├── editor/          # エディターパネル（ミクロ/マクロ視点）
    │   │   ├── index.tsx              # EditorPane シェル
    │   │   ├── MicroEditorView.tsx    # Lexical エディタ（段落単位）
    │   │   ├── MacroView.tsx          # 章カード一覧（@dnd-kit）
    │   │   ├── plugins/               # Lexical プラグイン群
    │   │   └── utils/                 # ID生成・構造ビルダー等
    │   ├── AnalysisPane.tsx  # 解析ペイン（段落カード・解析結果表示）
    │   └── ExplorerPane.tsx  # ファイルエクスプローラー
    └── utils/
        └── arrayUtils.ts    # reorderItems / reorderByKey（共通ユーティリティ）

packages/shared/       # renderer/main 共通の型・ユーティリティ
```

---

## 技術スタック・ルール

- **状態管理**: Zustand v5（`useAppStore.ts`）
- **エディタ**: Lexical v0.19.0
- **DnD**: @dnd-kit（core / sortable / utilities）
- **テスト**: Vitest（テストファイルは `*.test.ts` / `*.test.tsx`）
- **パッケージマネージャ**: pnpm（monorepo）
- **型**: TypeScript strict モード。`any` は原則禁止。

---

## PROJECTMEMORY/ — タスク管理ルール

### ファイル構成と所有権

| ファイル | 誰が書くか | 役割 |
|---|---|---|
| `PROJECTMEMORY/WORKSPACE.md` | ユーザー / Codex | 思考・懸念・アイデアのインボックス。Claudeがチャット開始時に読んでTASKS.mdへ整理する |
| `PROJECTMEMORY/TASKS.md` | Claude（主）/ Codex（追記のみ） | タスクリスト。セクション構成は後述 |
| `PROJECTMEMORY/DECISIONS.md` | Claude | 技術選択の理由・却下した代替案のログ |
| `PROJECTMEMORY/ARCHIVE.md` | Claude | 完了済みタスクの長期保管庫 |

---

### Codex がやっていいこと（追記・整理のみ）

#### 1. TASKS.md への新規タスク追加

ユーザーから「〇〇を追加して」「〇〇をタスクに入れて」と言われた場合、
`PROJECTMEMORY/TASKS.md` の `## 📋 実行タスク` セクションに追記する。

**タスクエントリの書式**（必ずこの形式で書く）:

```markdown
### [TN] タスクのタイトル（短く明確に）
- **ファイル**: `対象ファイルパス`（複数あれば列挙）
- **内容**: 何をするか1〜2行で説明
- **工数**: 15分 / 30分 / 半日（バッファ込み）など
- **完了条件**: 「〜できる」「〜になっている」形式で1行
- **状態**: ⬜ 未着手
```

- **タスク番号 N** は既存の最大番号 + 1 で採番する（TASKS.md と ARCHIVE.md 両方を確認）
- **工数の上限は30分**（「1タスク = 30分以内」の原則）。それを超える場合は分割する
  - 例外: 実機確認・外部サービス待ち・録画など性質上分割できないものは「半日（バッファ込み）」等と明記してよい
- **優先度順に挿入**する。判断基準:
  1. ブロッカー（他タスクの前提になるもの）を最上位
  2. 公開・リリース目標に直接影響するもの
  3. 工数が少なく効果が大きいもの

#### 2. TASKS.md への懸念・アイデア追加

- 懸念・リスク → `## ⚠️ 懸念・リスク` セクションにテキストで追記
- アイデア → `## 💡 アイデアボックス` セクションに箇条書きで追記

#### 3. WORKSPACE.md への記録

ユーザーが「〇〇を完了した」「〇〇を試した」「気になることがある」と言った場合、
`PROJECTMEMORY/WORKSPACE.md` の `## 📥 インボックス` セクションに内容を書き出す。
Claude が次のチャット開始時に読んでTASKS.mdへ正式に反映する。

---

### Codex がやってはいけないこと（厳守）

| 禁止操作 | 理由 |
|---|---|
| ダッシュボード（`## 🖥️ ダッシュボード`）の書き換え | Claude が実装完了を確認してから更新する |
| タスクの `状態` を「✅ 完了」に変更 | 実装はClaudeが行うため、完了確認もClaudeが行う |
| タスクを `## ✅ 完了済みタスク` セクションに移動 | 同上 |
| 既存タスクの削除 | 意図しないタスク消失を防ぐ |
| ARCHIVE.md への移動 | Claude が完了済み10件超えを管理する |

---

### TASKS.md のセクション構成（参考）

```
## 🖥️ ダッシュボード        ← 触らない
## 📋 実行タスク（優先度順）  ← 追記・並び替えOK
## ⚠️ 懸念・リスク          ← 追記OK
## 💡 アイデアボックス       ← 追記OK
## ✅ 完了済みタスク         ← 触らない
```
