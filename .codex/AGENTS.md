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
