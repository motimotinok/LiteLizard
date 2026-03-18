# LiteLizard — Codex エージェント向け指示

## 基本ルール

- **日本語で応答してください。**
- コードのコメント・JSDoc・変数名は日本語でも英語でも構いません。ただし既存コードのスタイルに合わせてください。
- ロジックの変更を指示されていない場合は、コードのロジックを変更しないこと。

---

## Codex の役割

このプロジェクトでは **Claude と Codex（あなた）が並列で開発** を行う。

### Codex が担うこと
- **`PROJECTMEMORY/TASK.md` を中心にした自律実装**: `docs/wbs.md` を参照しつつ、Codex 担当タスクを `PROJECTMEMORY/TASK.md` に切り出して実行する
- **入出力が明確で完了条件がテストで検証可能なタスク**: パーサー実装、CSS 調整、テスト追加など
- **タスク管理ファイルの継続更新**: 作業開始前・作業中・完了時に `PROJECTMEMORY/TASK.md` を更新し、今やることと次にやることを明確化する
- **WBS のステータス更新**: 担当タスクの完了時に `docs/wbs.md` の該当タスクを `✅` に更新する
- **PR の作成**: タスク完了後、`dev` ベースで PR を作成する

### Codex が担わないこと
- 仕様策定・設計判断（Claude がユーザーと対話して決定する）
- 既存コードとの整合判断が複雑なタスク（Lexical 統合、ストア設計変更など）
- Claude 側 worktree のファイル管理

---

## タスク管理の原則

Codex の実行管理は **`PROJECTMEMORY/TASK.md` を単一の運用ビュー** として行う。

### 位置づけ
- `docs/wbs.md`: 正式なタスク台帳。全タスクの依存・優先度・担当・状態を確認する元データ
- `PROJECTMEMORY/TASK.md`: Codex の実行計画と進捗管理を行う作業用ファイル
- `docs/decisions.md`: 設計判断ログ
- `docs/LiteLizard_spec_v003.md`: 実装の根拠となる仕様書
- `AGENTS.md`: このファイル。Codex の行動ルール

### 基本方針
- `docs/wbs.md` を見て、**担当が `Codex` で、着手可能なタスク**を確認する
- 着手候補のうち、**優先度順に `PROJECTMEMORY/TASK.md` へ切り出す**
- 実作業は常に `PROJECTMEMORY/TASK.md` の先頭タスクを基準に進める
- 作業中は `PROJECTMEMORY/TASK.md` を更新し続け、**現在の作業内容・完了条件・次アクション**を常に最新化する
- タスク完了時は、`PROJECTMEMORY/TASK.md` と `docs/wbs.md` の両方を更新する

---

## 並列開発ワークフロー

### 構成

```
worktree①: /Users/jane/litelizard/claude  → Claude 作業場
worktree②: /Users/jane/litelizard/codex   → Codex 作業場（ここ）
```

### ブランチ運用（固定ブランチ方式）
- **Codex**: `codex/task` ブランチに常駐。PR は `dev` ベース
- **Claude**: `claude/task` ブランチに常駐。PR は `dev` ベース
- タスクごとにブランチを切らず、固定ブランチ上でこまめに PR を出す
- PR マージ後は `git fetch origin && git merge origin/dev` で最新を取り込む

### タスク実行の流れ

1. `docs/wbs.md` を読み、Codex に割り振られたタスクを確認する
2. 依存が解消され、着手可能なタスクを優先度順に `PROJECTMEMORY/TASK.md` へ反映する
3. `PROJECTMEMORY/TASK.md` のダッシュボードにある「今すぐやるべき1タスク」を実行する
4. 作業しながら `PROJECTMEMORY/TASK.md` の状態・メモ・次アクションを更新する
5. タスク完了時に `docs/wbs.md` の該当タスクを `✅` に更新する
6. `PROJECTMEMORY/TASK.md` で完了済みへ移動し、ダッシュボードを次の最優先タスクへ更新する
7. コミット & プッシュし、`dev` ベースで PR を作成する
8. PR マージ後、`git fetch origin && git merge origin/dev` で同期する

---

## `PROJECTMEMORY/TASK.md` の運用ルール

### Codex が最初にやること
- セッション開始時に `docs/wbs.md` と `PROJECTMEMORY/TASK.md` を確認する
- `PROJECTMEMORY/TASK.md` が古い場合、`docs/wbs.md` を基準に内容を更新する
- Codex 担当タスクが未反映なら、優先度順に追加する

### 常に維持すべき状態
- ダッシュボードには **今すぐ着手すべき 1 タスクだけ** を表示する
- 実行タスク一覧は **優先度順** に並べる
- 各タスクには、少なくとも内容・対象ファイル・完了条件・状態・次アクションが分かる情報を残す
- 中断時にも再開しやすいよう、作業メモを簡潔に残す

### 更新タイミング
- **作業開始前**: 取り組むタスクを `🔄` として明記し、ダッシュボードを更新する
- **作業中**: 方針変更・進捗・未解決事項・次にやることを反映する
- **作業完了時**:
  1. `docs/wbs.md` の該当タスクを `✅` に更新する
  2. `PROJECTMEMORY/TASK.md` の該当タスクを完了済みへ移す
  3. ダッシュボードを次の最優先タスクへ更新する
  4. 必要なら次タスクの着手メモを先に書いておく

### 優先順位の決め方
- まず `docs/wbs.md` の優先度（P0 → P1 → P2 → P3）を優先する
- 同じ優先度なら、依存解消済みでブロッカーになりにくいものを先にする
- `PROJECTMEMORY/TASK.md` は、**Codex が次に迷わず動ける順番** になっていることを重視する

---

## 実装時の判断基準

- タスクの詳細・完了条件・依存関係は `docs/wbs.md` の「詳細」セクションを参照する
- 設計意図の確認が必要なら `docs/decisions.md` を参照する
- 実装の根拠が必要なら `docs/LiteLizard_spec_v003.md` を参照する
- 判断が複雑で、仕様策定や設計判断が必要になった場合は無理に決め打ちしない
- 判断保留が必要な場合でも、`PROJECTMEMORY/TASK.md` にブロック理由と次に必要な情報を残す

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
apps/api/              # バックエンド API サーバー（Fastify + SQLite）
```

---

## 技術スタック・ルール

- **状態管理**: Zustand v5（`useAppStore.ts`）
- **エディタ**: Lexical v0.19.0
- **DnD**: @dnd-kit（core / sortable / utilities）
- **テスト**: Vitest（テストファイルは `*.test.ts` / `*.test.tsx`）
- **パッケージマネージャ**: pnpm（monorepo）
- **型**: TypeScript strict モード。`any` は原則禁止。
