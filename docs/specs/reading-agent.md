# Reading Agent 仕様

関連タスク: R-18 / GitHub Issue #75〜#81
ステータス: stable
決定経緯: `docs/decisions.md` [2026-05-05] R-18

---

> この文書は2026-06-25時点の実装契約を記録する。Reading Agent の自由度、プロンプト階層、Agent単位の文脈、将来の `response` と任意タグ契約は [`analysis-philosophy.md`](analysis-philosophy.md) を正とする。

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
| `contextPolicy` | 解析時に対象本文へ添える参照範囲。`target-only` / `preceding` / `whole-document` |
| `createdAt` / `updatedAt` | ISO datetime |
| `builtIn` | 初期 seed 由来かどうか |

`contextPolicy` は必須フィールドであり、存在しない旧形式の `agents.json` は互換補完しない。読み込み時に schema validation が失敗した場合は `agents.json.bak` へ退避し、現在のデフォルトAgentを再生成する。`model` / `temperature` が存在しないだけのファイルは、読み込み時に `model: null` / `temperature: 0.7` を補う。不正な温度や空の必須文字列は保存・実行前の schema validation で拒否する。model 入力欄が空文字のときは `null` として扱う。

`contextPolicy` は次の3系統を持つ。既定値は `{ mode: 'whole-document' }` とする。

```typescript
type AnalysisContextPolicy =
  | { mode: 'target-only' }
  | { mode: 'preceding'; range: 'all' }
  | { mode: 'preceding'; range: 'lastN'; lastN: number }
  | { mode: 'whole-document' };
```

`target-only` は対象本文だけを送る。`preceding` は対象より前の本文を参照し、全文または直近N段落を選ぶ。`whole-document` は後続を含む文書全体を参照するが、provider prompt では対象本文を別枠に置き、参照本文側では対象段落を重複させない。

### デフォルト Reading Agent

初回生成と明示的なリセットでは、次の4体をこの順序で提供する。

| Agent | 目的 | 既定の参照範囲 |
|---|---|---|
| 初見の読者 | 予備知識なしで、理解、期待、興味、引っかかりを一人称で返す | `preceding all` |
| 感覚を読む読者 | 感情、身体感覚、空気、温度、リズム、余韻としてどう届いたかを返す | `preceding all` |
| 構造編集者 | 主題、構造、論理、反論、反対視点、暗黙の前提、重複、削除候補、修正方向を評価する | `whole-document` |
| 書き続ける伴走者 | フリーライティングの勢い、発見、固有の表現、続ける価値のある部分を積極的に支える | `whole-document` |

4体の定義は `packages/shared/src/readingAgentDefaults.ts` を正とし、main process、preload mock、新規Agent作成画面から共有する。

共通の助言禁止、称賛禁止、問題指摘必須などは設けない。「初見の読者」は助言を行わず、「構造編集者」は具体的な修正方向を提示し、「書き続ける伴走者」は目的を持って積極的に肯定するなど、各Agentの目的に応じて応答方針を変える。

既存の `agents.json` は初期seedの更新によって自動上書きしない。新しいデフォルトは、新規ユーザー、不正ファイルからの復旧、またはユーザーが明示的にリセットした場合に適用する。

### Active Agent

active agent はプロジェクト単位ではなくアプリ全体の好みとして `userData/app-store.json` の `activeReadingAgentId` に保存する。renderer 起動時は agent list と active ID を読み込み、保存済み ID が存在しない場合は先頭 agent にフォールバックし、その ID を保存し直す。

agent が0件になる状態は作らない。最後の1件は削除不可とし、リセット時は初期 seed に戻して先頭 agent を active にする。

### 解析実行

`analysis:run` payload は `agentId` を必須にする。main process は `agentId` から Reading Agent を取得し、存在しない場合は明示エラーにする。

provider に渡す system prompt は次の情報から組み立てる。

- LiteLizard の固定 JSON 出力指示
- Reading Agent の `name` / `role` / `systemPrompt`
- Reading Agent の `contextPolicy` に従って選ばれた参照本文
- 対象本文

OpenAI / Anthropic / local-llm の各 provider には、agent の `model` があればそれを渡し、`null` の場合は選択 provider の既定 model を渡す。`temperature` は agent の値をそのまま渡す。

prompt caching はこの実装範囲に含めない。ただし将来のキャッシュ最適化に備え、固定指示とAgent promptを先に置き、参照本文と対象本文を後ろに置く順序を保つ。

### Renderer UI

`useAppStore` は agent list / active agent / CRUD / reset / dry-run を一元管理する。AnalysisPane と AgentsScreen は固定モックを直接 import せず、store の状態を参照する。

AnalysisPane は agent list の読み込み中・空配列・active ID 不整合で UI が壊れないようにする。解析実行ボタンは active agent が存在し、provider が実行可能な場合のみ有効にする。

AgentsScreen は `name` / `role` / `systemPrompt` / `contextPolicy` / `model` / `temperature` を controlled draft として扱い、保存、新規作成、削除、複製、リセット、dirty 表示、validation を提供する。新規作成Agentの参照範囲は `whole-document` を既定にする。削除は確認を出し、最後の1件は削除できない。

### Dry-run

`agents:dryRun` は、未保存 draft の agent と現在開いている文書の最初の非空段落を使って1段落だけ解析する。文脈は draft agent の `contextPolicy` で選ぶ。結果は AgentsScreen の preview 表示にのみ使い、analysis generation や `.litelizard/analysis` には保存しない。

文書がない、非空段落がない、provider 設定が不足している、API key が無効、レート制限などのエラーは UI 上に表示する。

## 3. 制約・非ゴール

- `personaMode` は互換目的で残すが、新しい読者選択 UI の正規入力にはしない。
- `.lzl` v1 には `personaMode` を新規永続化しない。読み込み時の `general-reader` は既存型を満たすための互換値であり、active Reading Agent を上書きしない。
- active agent は現時点ではプロジェクト別にしない。作品ごとに agent を固定する仕様は将来拡張とする。
- dry-run は保存副作用を持たない。解析履歴、世代ファイル、段落カードの `lizard` 更新を発生させない。
- AgentsScreen の model は Settings と同じ自由入力とし、provider ごとの model 候補管理や補完は含めない。
- デフォルトAgentをテンプレートとして明示追加するUIや保存方式は #145 の領域とし、この仕様では扱わない。
- prompt caching、`prompt_cache_key`、provider別キャッシュ最適化はこの仕様では実装しない。

## 4. 検証観点

- shared schema が `contextPolicy` を必須とし、旧形式 agent を拒否し、`preceding lastN` の範囲外を拒否する。
- `contextPolicy` を持たない旧 `agents.json` は `.bak` へ退避され、現在のデフォルトAgentへ再生成される。
- active agent ID が保存・復元され、存在しない ID の場合は先頭 agent にフォールバックする。
- AnalysisPane からの解析 payload に `agentId` が含まれ、main 側がその agent を provider 実行に使う。
- agent の `model` override、`temperature`、`contextPolicy` が通常分析、1段落再分析、dry-run、実行前見積もりに使われる。
- 初回生成とリセットで、目的が重複しない4体のデフォルトAgentが同じ順序・内容で復元される。
- 既存のユーザー作成済み `agents.json` が新しいデフォルトで上書きされない。
- AgentsScreen の保存、新規作成、削除、複製、リセット、dirty 表示、validation が期待通り動く。
- dry-run は1段落だけ返し、解析履歴や `.litelizard/analysis` に保存副作用を残さない。
