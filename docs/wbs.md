# LiteLizard WBS（Work Breakdown Structure）

> **目的**: 仕様 v003 → 製品完成までの全タスクを網羅し、Codex 並列開発を可能にする
> **最終更新**: 2026-04-27
> **仕様参照**: `docs/LiteLizard_spec_v003.md`

---

## 運用ルール

### ステータス定義
| 記号 | 意味 |
|------|------|
| ⬜ | 未着手 |
| 🔄 | 作業中（担当者がロック中。他の人は触らない） |
| 📝 | レビュー待ち（PR 作成済み） |
| ✅ | 完了（マージ済み） |
| ⛔ | ブロック中（依存タスクが未完了 or 仕様未決定） |
| 🚫 | 取消（不要と判断） |

### 優先度定義
| 値 | 意味 |
|----|------|
| P0 | ブロッカー。これがないと他が進まない |
| P1 | 製品公開に必須 |
| P2 | あると良い。公開後でも可 |
| P3 | 将来検討 |

### サイズ（見積もり目安）
| 値 | 意味 |
|----|------|
| S | 〜30分。1ファイル変更程度 |
| M | 30分〜2時間。複数ファイル変更 |
| L | 2時間〜半日。設計判断を伴う |
| XL | 半日超。分割を検討すべき |

### 担当の割り振りかた
- **一括割り振り**: Codex に渡すタスクはまとめてブランチ名を記入し、バッチで着手させる
- **ロック**: `🔄` にしたタスクは担当者以外は変更しない
- **完了報告**: PR マージ後に `✅` に更新し、ブランチ列に PR 番号を追記する
- **ブランチ命名規則**: `codex/{カテゴリID小文字}-{連番}` 例: `codex/e-01`, `claude/s-01`

---

## S: 仕様策定

> 実装の前提となる未決定事項を解決する。ここが終わらないと依存タスクが ⛔ のまま。

| ID | タスク | 依存 | 優先度 | サイズ | 状態 | 担当 | ブランチ |
|----|--------|------|--------|--------|------|------|----------|
| S-01 | .lzl 内部フォーマット設計 | — | P0 | L | ✅ | Claude | claude/task |
| S-02 | 保存確定モデルの仕様決定 | — | P0 | M | ✅ | Claude | — |
| S-03 | documentId 生成・埋め込み・重複検出の仕様決定 | S-01 ✅ | P0 | M | ✅ | Claude | claude/task |
| S-04 | プロジェクト管理フロー仕様（.litelizard/ 初期化・既存を開く） | S-01 ✅ | P0 | M | ✅ | Claude | — |
| S-05 | 認証・セッションフローの仕様決定（§9 具体化） | — | P0 | M | ✅ | Claude | — |
| S-06 | 解析 API エンドポイント仕様（リクエスト/レスポンス） | S-05 ✅ | P0 | M | ✅ | Claude | — |
| S-07 | 章削除・段落統合のエッジケース仕様（§11.3, §11.4 詳細化） | — | P0 | S | ✅ | Claude | — |
| S-08 | Undo/Redo 対象範囲と実装方針の決定（§11.6） | — | P0 | M | ✅ | Claude | — |
| S-09 | 分析アーキテクチャ ローカル完結方針変更 | S-05 ✅, S-06 ✅ | P0 | M | ✅ | Claude | — |

### 詳細

#### S-01: .lzl 内部フォーマット設計 ✅
- **アウトプット**: `docs/specs/lzl-format.md`（フォーマット仕様書）
- **完了**: 2026-03-20。フロントマター + インラインマーカー方式（`lzl-v1`）を採用。詳細は `docs/specs/lzl-format.md` および `docs/decisions.md` を参照

#### S-02: 保存確定モデルの仕様決定
- **アウトプット**: 仕様 v003 に §8 の追記、または `DECISIONS.md` に記録
- **決めること**:
  - 自動保存 vs 明示保存（現実装は自動保存 2.5秒。仕様§8 は明示保存）
  - DnD 並び替えの即時反映 vs 保存時確定
  - 未保存状態の表示方法（dirty インジケータ）

#### S-03: documentId 生成・埋め込み・重複検出 ✅
- **アウトプット**: `docs/decisions.md` に設計記録
- **完了**: 2026-03-20。`d_randomAlphanumeric(10)` に統一、プロジェクト起動時全スキャン、重複時サイレント再採番。詳細は `docs/decisions.md` [2026-03-20] S-03 を参照

#### S-06: 解析 API エンドポイント仕様 ✅
- **アウトプット**: `docs/specs/analysis-api.md`
- **完了**: 2026-03-28。段落単位分析 + SSE ストリーミング + ローカル世代管理。コンテキスト上限10段落。OAuth or 自前APIキーの2系統認証。A-03 のブロック解除

#### S-05: 認証・セッションフロー ✅
- **アウトプット**: `docs/decisions.md` / `docs/specs/auth-session.md`
- **完了**: 2026-03-27。OAuth のみ採用・safeStorage でトークン保存・分析パネルのみ未ログイン制御（ログインボタン＋メッセージ表示）。A-01〜A-05 が着手可能になった。詳細は `docs/decisions.md` [2026-03-27] S-05 を参照
- **注（S-09）**: ローカル完結方針により「OAuth のみ」は改訂。OAuth は将来拡張パスに。`auth-session.md` 改訂済み

#### S-07: 章削除・段落統合エッジケース仕様 ✅
- **アウトプット**: `docs/specs/chapter-paragraph-ops.md`
- **完了**: 2026-04-02。章削除時は段落を前章末尾に吸収、先頭章・最後の1章は「無題の章」生成。Backspace 段落統合は同一章内のみ。空章許容。確認ダイアログなし。R-01, R-02 のブロック解除

#### S-09: 分析アーキテクチャ ローカル完結方針変更 ✅
- **アウトプット**: `docs/decisions.md` / `docs/specs/analysis-api.md`（改訂）/ `docs/specs/auth-session.md`（改訂）
- **完了**: 2026-03-30。ローカル完結主軸（外部 API キー + ローカル LLM）。OAuth は将来拡張パスとして残す。新カテゴリ L（ローカル分析基盤）L-01〜L-08 が着手可能に

---

## E: Electron / IPC 基盤

> モック API → 本番 IPC への切り替え。デスクトップアプリとして動作させる基盤。

| ID | タスク | 依存 | 優先度 | サイズ | 状態 | 担当 | ブランチ |
|----|--------|------|--------|--------|------|------|----------|
| E-01 | IPC チャンネル定義と型安全ブリッジ設計 | — | P0 | M | ✅ | Claude | claude/task |
| E-02 | fileService: .lzl パーサー/シリアライザー実装 | S-01 ✅ | P0 | L | ✅ | Codex | codex/task |
| E-03 | fileService: 読み込み IPC 接続（renderer → main） | E-01 ✅, E-02 ✅ | P0 | M | ✅ | Claude | feat/E-03 |
| E-04 | fileService: 書き込み IPC 接続 + 保存確定モデル実装 | E-03 ✅, S-02 ✅ | P0 | M | ✅ | | |
| E-05 | .litelizard/ ディレクトリ管理（初期化・スキャン） | S-04 ✅ | P1 | M | ✅ | | |
| E-06 | 解析 JSON の読み書き（documentId ベース紐付け） | E-05 ✅, S-03 ✅ | P1 | M | ✅ | | feat-E6 |
| E-07 | プロジェクト作成 / 既存を開く IPC + UI | E-05 ✅ | P1 | M | ✅ | | feat-E7 |
| E-08 | ウィンドウ管理・メニューバー基本設定 | — | P1 | M | ✅ | | |
| E-09 | preload モック → 本番 IPC の切り替え機構 | E-03 ✅ | P1 | S | ✅ | | |

### 詳細

#### E-01: IPC チャンネル定義と型安全ブリッジ設計
- **対象ファイル**: `apps/desktop/src/main/ipc.ts`, `apps/desktop/src/preload/preload.cts`, `packages/shared/src/api.ts`
- **完了条件**: renderer から `window.api.xxx()` で呼べる型付き IPC が動作する
- **注意点**: 既存の `preload.cts` と `ipc.ts` にスケルトンがある。まず現状を確認してから設計する

#### E-02: .lzl パーサー/シリアライザー ✅
- **対象ファイル**: `packages/shared/src/lzl/parser.ts`, `packages/shared/src/lzl/serializer.ts`
- **完了**: 初版は PR #53（Codex）。P1 バグ2件を 2026-03-25 に修正済み
  - Issue #56: 破損章マーカーのすり抜け → parser.ts 正規表現緩和（e10f144）
  - Issue #57: 孤立段落のサイレントドロップ → serializer.ts に最終章退避ロジック追加（7ac412d）

---

## L: ローカル分析基盤

> 分析機能のローカル完結実装。外部 API キー方式とローカル LLM 方式。S-09 により新設。

| ID | タスク | 依存 | 優先度 | サイズ | 状態 | 担当 | ブランチ |
|----|--------|------|--------|--------|------|------|----------|
| L-01 | API キー設定 UI（renderer: 設定画面） | E-01 ✅ | P1 | M | ✅ | Codex | |
| L-02 | API キー暗号化保存（main: safeStorage） | E-01 ✅ | P1 | M | ✅ | | |
| L-03 | LLM プロバイダー抽象化層（main: provider interface） | L-02 | P1 | L | ✅ | Codex | |
| L-04 | 外部 API 方式の解析リクエスト実装（main → OpenAI/Anthropic） | L-03 | P1 | M | ✅ | Claude | claude/next-task-F7SoK |
| L-05 | 解析結果の IPC ストリーミング（main → renderer） | L-04, E-01 ✅ | P1 | M | ✅ | Claude | claude/review-task-checklist-ygfSP |
| L-06 | 解析結果の保存・UI 反映 | L-05, E-06 ✅ | P1 | M | ✅ | Codex | |
| L-07 | API キー未設定時の UI 制御（設定導線表示） | L-01 | P1 | S | ✅ | Codex | |
| L-08 | ローカル LLM 接続（Ollama 等） | L-03 | P2 | M | ✅ | Codex | |
| L-09 | 分析コンテキストポリシー切替（文書全体/章内・上限なし/直近N） | L-04 | P2 | M | ⬜ | | |

### 詳細

#### L-01: API キー設定 UI
- **対象**: renderer 側に設定画面を追加。プロバイダー選択 + API キー入力 + 保存ボタン
- **完了条件**: 設定画面から API キーを入力・保存できる
- **完了**: 2026-04-21。左ツールバーの歯車から中央設定画面を開き、OpenAI / Anthropic の API キー管理、既定 provider / model 設定、ローカル LLM 接続設定と接続テスト、未設定時の設定導線表示を実装

#### L-02: API キー暗号化保存
- **対象**: main プロセスで `safeStorage` を使った暗号化保存/読み込み
- **注**: 既存 `sessionVault.ts` を拡張するか、新規 `keyVault.ts` を作成するかは着手時に判断
- **完了**: 2026-04-20。`sessionVault.ts` を `safeStorage` ベースへ置き換え、暗号化不可環境では平文フォールバックする保存層と単体テストを実装

#### L-03: LLM プロバイダー抽象化層
- **対象**: Strategy パターンでプロバイダーを切り替え。将来のクラウド方式もこのインターフェースに乗る
- **完了条件**: `AnalysisProvider` インターフェースが定義され、外部 API / ローカル LLM / クラウド（将来）を差し替え可能
- **完了**: 2026-04-21。main 側に `AnalysisProvider` 抽象層と provider resolver を追加し、OpenAI / Anthropic の実行切替、未対応 provider の明示エラー、文書全体順序ベースの context 構築、関連テストを実装

#### L-04: 外部 API 方式の解析リクエスト実装 ✅
- **完了**: 2026-04-22。L-03 で実装済みだった OpenAI Responses API / Anthropic raw fetch の API 呼び出し層を検証・修正し、以下を追加実装した
  - `apiBridge.ts`: `[[FAIL]]` テストフックを本番コードから除去
  - `analysisProvider.ts`: OpenAI SDK の `AuthenticationError`/`RateLimitError`、Anthropic の HTTP 401/429 を日本語エラーメッセージに分類
  - `useAppStore.ts` `loadDocument`: `.lzl` ファイルを開く際に `.litelizard/analysis/` から世代ファイルを読み込んで `lizard` フィールドに復元
  - `useAppStore.ts` `runAnalysis`/`runAnalysisFor`: 解析成功後に `saveAnalysisResult` IPC を呼び出して結果を世代ファイルに永続化（`Promise.allSettled` で保存失敗は UI をブロックしない）
  - `packages/shared/tsconfig.json`: `types: ["node"]` を追加し `AnalysisResult` が `any` 推論されていた問題を修正

#### L-05: 解析結果の IPC ストリーミング ✅
- **完了**: 2026-04-23。`analysis:progress` IPC チャンネルを追加し、main が段落を1件解析するたびに `event.sender.send` で renderer に逐次送信する。renderer 側は `onAnalysisProgress` リスナーで受け取り段落カードをリアルタイム更新。`saveAnalysisResult` も progress ハンドラー内で非ブロック呼び出しに変更。invoke 完了後に `requestId` を後付け付与。
- **変更ファイル**: `packages/shared/src/bridge.ts`（型・チャンネル追加）、`apiBridge.ts`（onProgress コールバック）、`ipc.ts`（event.sender.send）、`preload/ipcBridge.ts`（リスナー実装）、`useAppStore.ts`（ストリーミング対応）

#### L-06: 解析結果の保存・UI 反映 ✅
- **完了**: 2026-04-23。renderer store に解析履歴状態を追加し、`.lzl` 読み込み時の世代ファイル復元、段落カードの履歴切替 UI、構造変更後の generation 再同期、保存前 generation 作成の抑制、構造変更後の in-flight progress 無視を実装した
- **変更ファイル**: `useAppStore.ts`（履歴状態・generation 同期・解析ガード）、`AnalysisPane.tsx`/`styles.css`（履歴ナビゲーション UI）、`analysisHistory.ts`（履歴投影 helper）、`preloadMockApi.ts`（mock 追従）、`packages/shared/src/index.ts`/`package.json`（schema export 分離）

#### L-09: 分析コンテキストポリシー切替
- **背景**: 最大10段落などの固定制限は、長い章・伏線・前章から続く読者体験を拾えず、分析UXを大きく下げる可能性がある。一方で、常に全文脈を渡すとコスト・速度・モデル上限に影響するため、作品や分析目的に応じて切り替え可能にする
- **対象**: `docs/specs/analysis-api.md` §2.1 に定義した `scope: document/chapter` と `limitMode: none/lastN` の設定保存、UI、main 側 context 生成、回帰テスト
- **完了条件**: 設定画面からコンテキスト範囲と上限方式を選べ、解析実行時に選択したポリシー通りの前段落だけが LLM に渡る

---

## A: クラウドログイン（将来拡張）

> 将来のクラウドサービス接続。OAuth ログイン実装（実装練習も兼ねる）。ローカル分析（L 系）が先行実装。

| ID | タスク | 依存 | 優先度 | サイズ | 状態 | 担当 | ブランチ |
|----|--------|------|--------|--------|------|------|----------|
| A-01 | ログイン UI 実装（renderer: OAuth フロー） | S-05 ✅ | P3 | M | ⬜ | | |
| A-02 | セッション管理（main: safeStorage でトークン保存） | S-05 ✅ | P3 | M | ⬜ | | |
| A-03 | クラウド方式の解析リクエスト送信（OAuth 経由） | E-01 ✅, S-06 ✅, L-03 | P3 | M | ⬜ | | |
| A-04 | クラウド方式の解析結果受信・保存・UI 反映 | A-03, E-06 ✅ | P3 | M | ⛔ | | |
| A-05 | クラウドログイン時の追加 UI 制御 | A-01 | P3 | S | ⛔ | | |

---

## R: Renderer（エディター・UI 機能）

> エディタ機能の不足分と UI 改善。

| ID | タスク | 依存 | 優先度 | サイズ | 状態 | 担当 | ブランチ |
|----|--------|------|--------|--------|------|------|----------|
| R-01 | 章の削除 + 段落吸収マージ実装 | S-07 ✅ | P1 | M | ✅ | Claude | feat/R-01 |
| R-02 | Backspace での段落統合 | S-07 ✅ | P1 | M | ✅ | Claude | feat/R-02 |
| R-03 | 構造操作の Undo/Redo | S-08 ✅ | P2 | L | ✅ | Codex | dev |
| R-04 | エクスプローラー: .lzl 拡張子非表示 + 自動付与 | E-02 | P1 | S | ✅ | 2026-04-17 | |
| R-05 | エクスプローラー: .litelizard/ 非表示 | E-05 ✅ | P1 | S | ✅ | Claude | claude/review-task-checklist-ygfSP |
| R-06 | エクスプローラー: 削除時に解析 JSON 連動削除 | E-06 ✅ | P1 | S | ✅ | | (E-06 実装時に完了済み) |
| R-07 | 章サマリー解析表示（マクロ視点時の分析ペイン） | L-06 | P2 | M | ⛔ | | |
| R-08 | 全体解析の成功/失敗件数表示 | L-06 | P2 | S | ⛔ | | |
| R-09 | sourceHash による stale 検出・表示 | L-06 ✅ | P1 | S | ✅ | Claude | claude/review-task-checklist-3fkKs (#70) |
| R-10 | 分析モード選択 UI（スタブ） | — | P2 | S | ⬜ | | |
| R-11 | 画面縮小時の表示崩れ修正（旧T26） | — | P2 | M | ✅ | Codex | feat/R-11 |
| R-12 | 分析カードクリック時アニメーション改善（旧T27） | — | P2 | S | ⬜ | | |
| R-13 | エクスプローラー DnD ファイル移動（旧T28） | — | P2 | M | ⬜ | | |
| R-14 | 既存テキストインポート（ID 自動生成） | E-02 | P1 | M | ✅ | Codex | |
| R-15 | DnD 並び替えの Undo 対応 | R-03 ✅, S-08 ✅ | P2 | S | ⬜ | | |
| R-16 | UI 全面刷新（案 A Minimal 採用） | — | P1 | XL | ✅ | Claude | dev |
| R-17 | Tweaks 切替 UI（明朝/ゴシック・本文サイズ・行間・黄ばみ強度・パネル横並び/オーバーレイ） | R-16 ✅ | P2 | M | ⬜ | | |
| R-18 | Reading Agent の永続化・プロンプト適用エンジン | R-16 ✅ | P1 | XL | ⬜ | | |
| R-19 | Recent files 永続化（main-side ストア + ウェルカムの最近リスト復活） | R-16 ✅ | P2 | M | ⬜ | | |
| R-20 | 検索画面の中身（左メニュー検索ボタン有効化） | — | P2 | L | ⬜ | | |
| R-21 | 段落 ↔ 分析カードの fade highlight 連動アニメーション | R-16 ✅ | P2 | S | ⬜ | | |
| R-22 | Web フォントのローカル同梱（オフライン対応） | R-16 ✅ | P3 | S | ⬜ | | |

---

## T: テスト・品質

> 仕様が固まった領域から順次整備。

| ID | タスク | 依存 | 優先度 | サイズ | 状態 | 担当 | ブランチ |
|----|--------|------|--------|--------|------|------|----------|
| T-01 | .lzl パーサー/シリアライザーのユニットテスト | E-02 | P1 | M | ✅ | Codex | |
| T-02 | IPC ブリッジの統合テスト | E-03 ✅ | P1 | M | ✅ | Codex | |
| T-03 | documentId 重複検出のテスト | E-06 ✅ | P1 | S | ✅ | Codex | |
| T-04 | 章削除・段落統合のエッジケーステスト | R-01, R-02 | P1 | M | ⛔ | | |
| T-05 | 解析コンテキストポリシーの回帰テスト | L-09 | P2 | S | ⛔ | | |
| T-06 | GitHub Actions CI（test/build） | T-02 ✅ | P1 | S | ✅ | Codex | |

---

## 集計

| カテゴリ | 合計 | 完了 | 未完了 | P0 | P1 | P2 | P3 |
|----------|------|------|--------|----|----|----|----|
| S: 仕様策定 | 9 | 9 | 0 | 9 | 0 | 0 | 0 |
| E: Electron/IPC | 9 | 9 | 0 | 4 | 5 | 0 | 0 |
| L: ローカル分析基盤 | 9 | 8 | 1 | 0 | 7 | 2 | 0 |
| A: クラウドログイン（将来） | 5 | 0 | 5 | 0 | 0 | 0 | 5 |
| R: Renderer/UI | 22 | 10 | 12 | 0 | 9 | 12 | 1 |
| T: テスト | 6 | 4 | 2 | 0 | 5 | 1 | 0 |
| **合計** | **60** | **40** | **20** | **13** | **26** | **15** | **6** |

---

## クリティカルパス

```
S-01 (.lzl設計) ──→ E-02 (パーサー) ──→ E-03 (読み込みIPC) ──→ E-04 (書き込みIPC)
       │                                        │
       └→ S-03 (documentId) ──→ E-06 (解析JSON)  └→ E-09 (モック切替)
                                     │
S-09 (ローカル完結) ──→ L-01 (APIキーUI)    └→ R-04〜R-06 (エクスプローラー)
                         │
                         └→ L-02 (safeStorage) ──→ L-03 (Provider抽象)
                                                       │
                                    L-04 (外部API) ←───┤
                                       │               └→ L-08 (ローカルLLM, P2)
                                    L-05 (IPC Stream)
                                       │
                                    L-06 (保存・UI) ──→ R-07〜R-09

                                    L-09 (context policy, P2・将来拡張)

S-05 (認証仕様) ──→ A-01〜A-05 (クラウドログイン, P3・将来)
```

**最短で「Electron で .lzl を開いて編集・保存できる」状態に到達するパス:**
S-01 → S-03 → E-01 → E-02 → E-03 → E-04

**分析機能のクリティカルパス:**
S-09 → L-01/L-02 → L-03 → L-04 → L-05 → L-06

---
