# Reading Agent 仕様

関連タスク: R-18 / GitHub Issue #75〜#81
ステータス: stable
決定経緯: `docs/decisions.md` [2026-05-05] R-18

---

> この文書は2026-06-22時点の実装契約を記録する。Reading Agent の自由度、プロンプト階層、Agent単位の文脈、将来の `response` と任意タグ契約は [`analysis-philosophy.md`](analysis-philosophy.md) を正とし、後続実装で移行する。

## 1. 概要

Reading Agent は、解析時にどの読者視点で段落を読むかを決めるアプリ横断の読者プロファイルである。AgentsScreen で編集した内容は renderer store から main process の agent store に保存され、AnalysisPane の選択と解析実行の `agentId` によって同じ agent が参照される。

R-18 以降の新しい解析実行では `agentId` を正とする。既存 `.lzl` / `.litelizard/analysis` との互換のため `personaMode` は型と保存形式に残すが、Reading Agent の代替として新規実行ロジックを分岐させない。

`.lzl` v1 は `personaMode` をフロントマターに保存しない。`.lzl` から `LiteLizardDocument` へ変換するときは、互換用の既定値として `general-reader` を補う。読者選択の復元は `personaMode` ではなく、アプリ側の active Reading Agent で扱う。

## 2. 現行仕様

### データモデル

Reading Agent は `userData/agents.json` に保存する。1件の agent は次のフィールドを持つ。

| フィールド | 内容 |
|------------|------|
| `id` | agent の永続 ID。解析リクエストではこの値を渡す |
| `name` | UI 表示名、および provider prompt 内の読者名 |
| `role` | 読者の役割・読書態度 |
| `systemPrompt` | 読者としての具体的な振る舞い |
| `model` | 使用モデルの上書き。`null` の場合は選択 provider の既定モデル |
| `temperature` | provider に渡す温度。`0〜1`、既定値 `0.7` |
| `createdAt` / `updatedAt` | ISO datetime |
| `builtIn` | 初期 seed 由来かどうか |

旧形式の `agents.json` に `model` / `temperature` が存在しない場合、読み込み時に `model: null` / `temperature: 0.7` を補う。不正な温度や空の必須文字列は保存・実行前の schema validation で拒否する。model 入力欄が空文字のときは `null` として扱う。

### Active Agent

active agent はプロジェクト単位ではなくアプリ全体の好みとして `userData/app-store.json` の `activeReadingAgentId` に保存する。renderer 起動時は agent list と active ID を読み込み、保存済み ID が存在しない場合は先頭 agent にフォールバックし、その ID を保存し直す。

agent が0件になる状態は作らない。最後の1件は削除不可とし、リセット時は初期 seed に戻して先頭 agent を active にする。

### 解析実行

`analysis:run` payload は `agentId` を必須にする。main process は `agentId` から Reading Agent を取得し、存在しない場合は明示エラーにする。

provider に渡す system prompt は次の情報から組み立てる。

- Reading Agent の `name` / `role` / `systemPrompt`
- LiteLizard の固定 JSON 出力指示
- 対象段落より前の context paragraphs

OpenAI / Anthropic / local-llm の各 provider には、agent の `model` があればそれを渡し、`null` の場合は選択 provider の既定 model を渡す。`temperature` は agent の値をそのまま渡す。

### Renderer UI

`useAppStore` は agent list / active agent / CRUD / reset / dry-run を一元管理する。AnalysisPane と AgentsScreen は固定モックを直接 import せず、store の状態を参照する。

AnalysisPane は agent list の読み込み中・空配列・active ID 不整合で UI が壊れないようにする。解析実行ボタンは active agent が存在し、provider が実行可能な場合のみ有効にする。

AgentsScreen は `name` / `role` / `systemPrompt` / `model` / `temperature` を controlled draft として扱い、保存、新規作成、削除、複製、リセット、dirty 表示、validation を提供する。削除は確認を出し、最後の1件は削除できない。

### Dry-run

`agents:dryRun` は、未保存 draft の agent と現在開いている文書の最初の非空段落を使って1段落だけ解析する。結果は AgentsScreen の preview 表示にのみ使い、analysis generation や `.litelizard/analysis` には保存しない。

文書がない、非空段落がない、provider 設定が不足している、API key が無効、レート制限などのエラーは UI 上に表示する。

## 3. 制約・非ゴール

- `personaMode` は互換目的で残すが、新しい読者選択 UI の正規入力にはしない。
- `.lzl` v1 には `personaMode` を新規永続化しない。読み込み時の `general-reader` は既存型を満たすための互換値であり、active Reading Agent を上書きしない。
- active agent は現時点ではプロジェクト別にしない。作品ごとに agent を固定する仕様は将来拡張とする。
- dry-run は保存副作用を持たない。解析履歴、世代ファイル、段落カードの `lizard` 更新を発生させない。
- AgentsScreen の model は Settings と同じ自由入力とし、provider ごとの model 候補管理や補完は含めない。

## 4. 検証観点

- shared schema が `model: null` と旧形式 agent の default 補完を受け入れ、`temperature` の範囲外を拒否する。
- `agents.json` の旧形式を読み込んでも初期 seed と同じ contract に normalize される。
- active agent ID が保存・復元され、存在しない ID の場合は先頭 agent にフォールバックする。
- AnalysisPane からの解析 payload に `agentId` が含まれ、main 側がその agent を provider 実行に使う。
- agent の `model` override と `temperature` が OpenAI / Anthropic / local-llm に渡る。
- AgentsScreen の保存、新規作成、削除、複製、リセット、dirty 表示、validation が期待通り動く。
- dry-run は1段落だけ返し、解析履歴や `.litelizard/analysis` に保存副作用を残さない。
