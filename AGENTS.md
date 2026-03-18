# LiteLizard — Codex エージェント向け指示

## 基本ルール

- **日本語で応答してください。**
- コードのコメント・JSDoc・変数名は日本語でも英語でも構いません。ただし既存コードのスタイルに合わせてください。
- ロジックの変更を指示されていない場合は、コードのロジックを変更しないこと。

---

## Codex の役割

このプロジェクトでは **Claude と Codex（あなた）が並列で開発** を行う。

### Codex が担うこと
- **WBS で割り振られた実装タスクの自律的な実行**: `docs/wbs.md` で自分に割り振られたタスクを確認し、実装する
- **入出力が明確で完了条件がテストで検証可能なタスク**: パーサー実装、CSS 調整、テスト追加など
- **WBS のステータス更新**: 担当タスクの完了時に `docs/wbs.md` のステータスを `✅` に更新する
- **PR の作成**: タスク完了後、`dev` ベースで PR を作成する

### Codex が担わないこと
- 仕様策定・設計判断（Claude がユーザーと対話して決定する）
- 既存コードとの整合判断が複雑なタスク（Lexical 統合、ストア設計変更など）
- PROJECTMEMORY/ の管理（Codex の worktree には存在しない

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
- PR マージ後は `git merge origin/dev` で最新を取り込む

### タスク実行の流れ

1. `docs/wbs.md` を読み、自分に割り振られたタスク（担当列が `Codex`、状態が `🔄`）を確認する
2. タスクの「詳細」セクションに書かれた完了条件・対象ファイル・注意点を読む
3. `codex/task` ブランチ上で実装する
4. `docs/wbs.md` の該当タスクのステータスを `✅` に更新する
5. コミット & プッシュし、`dev` ベースで PR を作成する
6. PR マージ後、`git fetch origin && git merge origin/dev` で同期する

### 参照すべきファイル

| ファイル | 役割 |
|---------|------|
| `docs/wbs.md` | タスク台帳。自分に割り振られたタスクの確認・ステータス更新 |
| `docs/decisions.md` | 設計判断ログ。実装時に「なぜこの設計か」を理解するために参照 |
| `docs/LiteLizard_spec_v003.md` | 仕様書。実装の根拠 |
| `AGENTS.md` | このファイル。Codex の行動ルール |

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
