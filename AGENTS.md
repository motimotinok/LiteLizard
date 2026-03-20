# LiteLizard — Codex エージェント向け指示

## 基本ルール

- **日本語で応答してください。**
- コードのコメント・JSDoc・変数名は日本語でも英語でも構いません。ただし既存コードのスタイルに合わせてください。
- ロジックの変更を指示されていない場合は、コードのロジックを変更しないこと。
- **重要: Codex は、Claude が `PROJECTMEMORY/TASK.md` で割り振った実装タスクについて、サブエージェントを用いた並列実装を行ってよい。** これは本プロジェクトで許可された標準運用である。

---

## Codex の役割

このプロジェクトでは **Claude と Codex（あなた）が並列で開発** を行う。

### Codex が担うこと
- **`PROJECTMEMORY/TASK.md` を中心にした自律実装**: Claude によって割り振られたタスクを `PROJECTMEMORY/TASK.md` から受け取り、内容に沿って実装する
- **入出力が明確で完了条件がテストで検証可能なタスク**: パーサー実装、CSS 調整、テスト追加など
- **タスク管理ファイルの継続更新**: 作業開始前・作業中・完了時に `PROJECTMEMORY/TASK.md` を更新し、進捗・完了状態・次アクションを明確化する
- **WBS のステータス更新**: 担当タスクの完了時に `docs/wbs.md` の該当タスクを `✅` に更新する
- **PR の作成**: タスク完了後、`dev` ベースで PR を作成する

### Codex が担わないこと
- `PROJECTMEMORY/TASK.md` への新規タスクの割り振り・優先順位決定（Claude が行う）
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
- Claude が更新した `PROJECTMEMORY/TASK.md` を起点に、**割り振られたタスク**を確認する
- 必要に応じて `docs/wbs.md` を参照し、詳細・依存関係・完了条件を確認する
- 実作業は常に `PROJECTMEMORY/TASK.md` の先頭タスクを基準に進める
- `PROJECTMEMORY/TASK.md` が空・未同期・矛盾ありで着手不能な場合は、Codex は勝手に補完せず、ユーザーに警告して判断を待つ
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

1. Claude が更新した `PROJECTMEMORY/TASK.md` を確認し、今すぐやるべきタスクを把握する
2. `PROJECTMEMORY/TASK.md` のダッシュボードにある「今すぐやるべき1タスク」を実行する
3. 作業しながら `PROJECTMEMORY/TASK.md` の状態・メモ・次アクションを更新する
4. タスク完了時に `docs/wbs.md` の該当タスクを `✅` に更新する
5. `PROJECTMEMORY/TASK.md` で完了済みへ移動し、ダッシュボードを次の最優先タスクへ更新する
6. コミット & プッシュし、`dev` ベースで PR を作成する
7. PR マージ後、`git fetch origin && git merge origin/dev` で同期する

### Codex サブエージェント運用規約

- Codex は、Claude が作成した計画に沿って、実装・テスト・レビュー・デバッグをサブエージェントへ分担してよい
- サブエージェント利用時も、実行順の基準は常に `PROJECTMEMORY/TASK.md` とする
- 並列化してよいのは、入出力が明確で、担当ファイルまたは責務を分離できる作業に限る
- 仕様策定や設計判断が必要な作業は、サブエージェントへ丸投げせず、必要に応じて保留して共有する
- 同じファイルを複数サブエージェントに同時編集させない。担当範囲はファイル単位または責務単位で分離する
- サブエージェントには「他者の変更を巻き戻さないこと」「自分の担当範囲のみ編集すること」を明示する
- テスト生成担当と実装担当は分けてよいが、テストの前提となる API や振る舞いが未確定の場合は先に実装を安定させる
- レビューは読み取り中心の別サブエージェントで行い、指摘事項はデバッグ担当へ戻す
- デバッグ後は同一レビュー担当を再利用して再確認してよい
- 問題がなくなるまで、レビューとデバッグを反復してよい
- 最終的な統合判断、`PROJECTMEMORY/TASK.md` 更新、`docs/wbs.md` 更新、PR 作成は Codex 本体が責任を持つ

### 推奨オーケストレーション順序

1. Claude が `PROJECTMEMORY/TASK.md` に計画・優先順位・完了条件を書く
2. Codex が先頭タスクを確認し、並列実行可能な単位へ分解する
3. 実装サブエージェントを必要数だけ起動する
4. 実装結果を前提に、テスト作成・テスト実行サブエージェントを起動する
5. Codex が変更を統合し、ローカルでテストまたは検証を行う
6. レビューサブエージェントを起動し、回帰・バグ・テスト不足を確認する
7. 指摘があれば、デバッグサブエージェントを起動して修正する
8. 修正後は、同じレビューサブエージェントに再レビューを依頼する
9. 再レビューで問題が残っていれば、デバッグサブエージェントを再起動して修正し、再レビューを行う
10. `デバッグ -> 再レビュー` の反復は最大 3 回までとし、解消しない場合は `PROJECTMEMORY/TASK.md` にブロック内容を残して Codex 本体が扱いを判断する
11. 問題が解消したら、`PROJECTMEMORY/TASK.md` と `docs/wbs.md` を更新する

### 既定のサブエージェント起動順

Codex は、特段の理由がない限り、以下の順番でサブエージェントを回す。

1. 実装エージェント
2. テスト作成・実行エージェント
3. レビューエージェント
4. デバッグエージェント
5. 再レビューエージェント

- 再レビューは、新規の役割を追加せず、原則として同じレビュー担当に継続して依頼する
- テスト作成・実行エージェントは、実装の API や振る舞いが固まった後に起動する
- レビューで問題なしとなった時点で、そのタスクのサブエージェント工程は完了とする
- レビュー指摘が残る限り、`レビュー -> デバッグ -> 再レビュー` を反復してよい
- 再レビューで問題が残った場合は、デバッグエージェントを再起動して再度修正する
- `デバッグ -> 再レビュー` のループは最大 3 回までとする

### 起動するエージェントと注入テンプレート

サブエージェント起動時は、役割ごとに以下のテンプレートを `PROJECTMEMORY/agent-prompts/` から注入する。

| 順番 | 役割 | 呼び出すエージェント | 注入テンプレート |
| --- | --- | --- | --- |
| 1 | 実装 | `worker` エージェント | `PROJECTMEMORY/agent-prompts/implementation-worker.md` |
| 2 | テスト作成・実行 | `worker` エージェント | `PROJECTMEMORY/agent-prompts/test-worker.md` |
| 3 | レビュー | `default` エージェント | `PROJECTMEMORY/agent-prompts/review-agent.md` |
| 4 | デバッグ | `worker` エージェント | `PROJECTMEMORY/agent-prompts/debug-worker.md` |
| 5 | 再レビュー | `default` エージェント | `PROJECTMEMORY/agent-prompts/review-agent.md` |

- 再レビューでは、前回レビュー結果と今回の修正内容を添えて `review-agent.md` を再注入する
- テストサブエージェントには、対象実装または差分と、実行すべきテストコマンドを必ず渡す
- デバッグサブエージェントには、レビュー指摘または失敗テストをそのまま入力し、修正範囲を限定して依頼する
- 再レビューで問題が残った場合は、`worker` のデバッグエージェントを再起動し、修正後に `default` のレビューエージェントで再レビューする
- 3 回の再レビュー後も問題が解消しない場合は、サブエージェント運用を打ち切り、Codex 本体がブロックとして扱う

### サブエージェントへの依頼に必ず含めること

- 対象タスク名
- 参照すべき `PROJECTMEMORY/TASK.md` の該当箇所
- 対象ファイルまたは責務範囲
- 触ってはいけないファイルまたは責務範囲
- 完了条件
- 実行すべきテスト、または最低限の検証方法
- 他エージェントの変更を戻さないこと
- 最後に変更ファイル一覧と実施内容を報告すること

### プロンプトテンプレート

- サブエージェント用テンプレートは `PROJECTMEMORY/agent-prompts/` に置く
- 新しい役割が必要な場合も、まず既存テンプレートの再利用または最小拡張を優先する
- テンプレートはプロジェクト固有ルールを反映し、必要なら随時更新してよい

---

## `PROJECTMEMORY/TASK.md` の運用ルール

### Codex が最初にやること
- セッション開始時に `PROJECTMEMORY/TASK.md` を確認し、Claude からの最新の割り振りを把握する
- 必要に応じて `docs/wbs.md` を確認し、対象タスクの詳細・依存関係・完了条件を補足する
- `PROJECTMEMORY/TASK.md` が空、未同期、または内容に不足・矛盾があって着手不能な場合は、その旨をユーザーに警告する
- その場合でも、Codex は割り振りや優先順位を自分で追加・変更しない

### 常に維持すべき状態
- ダッシュボードには **今すぐ着手すべき 1 タスクだけ** を表示する
- 実行タスク一覧は **優先度順** に並べる
- 各タスクには、少なくとも内容・対象ファイル・完了条件・状態・次アクションが分かる情報を残す
- 中断時にも再開しやすいよう、作業メモを簡潔に残す

### 更新タイミング
- **作業開始前**: Claude により割り振られた対象タスクについて、取り組み開始を `🔄` として明記し、ダッシュボードを更新する
- **作業中**: 方針変更・進捗・未解決事項・次にやることを反映する
- **作業完了時**:
  1. `docs/wbs.md` の該当タスクを `✅` に更新する
  2. `PROJECTMEMORY/TASK.md` の該当タスクを完了済みへ移す
  3. ダッシュボードを次の最優先タスクへ更新する
  4. 必要なら次タスクの着手メモを先に書いておく

### 優先順位の決め方
- 優先順位付けと割り振りは Claude が行う
- Codex は `PROJECTMEMORY/TASK.md` の並び順とダッシュボードを実行順として扱う
- ただし依存関係や完了条件の矛盾を見つけた場合は、`PROJECTMEMORY/TASK.md` にメモを残して共有する

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
