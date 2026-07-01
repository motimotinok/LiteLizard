# Reading Agent 仕様

関連タスク: R-18 / GitHub Issue #75〜#81
ステータス: stable
決定経緯: `docs/decisions.md` [2026-05-05] R-18

---

> この文書は2026-07-01時点の実装契約を記録する。Reading Agent の自由度、プロンプト階層、Agent単位の文脈、`response` と任意タグ契約は [`analysis-philosophy.md`](analysis-philosophy.md) を正とする。

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
| `tagDefinitions` | このAgentが分析結果に返せる構造化タグ項目と許可値。未指定は `[]` |
| `createdAt` / `updatedAt` | ISO datetime |
| `builtIn` | 初期 seed 由来かどうか |

`contextPolicy` は必須フィールドであり、存在しない旧形式の `agents.json` は互換補完しない。読み込み時に schema validation が失敗した場合は `agents.json.bak` へ退避し、空の Agent 一覧へ復旧する。`model` / `temperature` / `tagDefinitions` が存在しないだけのファイルは、読み込み時に `model: null` / `temperature: 0.7` / `tagDefinitions: []` を補う。不正な温度や空の必須文字列は保存・実行前の schema validation で拒否する。model 入力欄が空文字のときは `null` として扱う。

`contextPolicy` は次の3系統を持つ。既定値は `{ mode: 'whole-document' }` とする。

```typescript
type AnalysisContextPolicy =
  | { mode: 'target-only' }
  | { mode: 'preceding'; range: 'all' }
  | { mode: 'preceding'; range: 'lastN'; lastN: number }
  | { mode: 'whole-document' };
```

`target-only` は対象本文だけを送る。`preceding` は対象より前の本文を参照し、全文または直近N段落を選ぶ。`whole-document` は後続を含む文書全体を参照するが、provider prompt では対象本文を別枠に置き、参照本文側では対象段落を重複させない。

`tagDefinitions` は次の形で保存する。`id` と value `id` は英小文字、数字、ハイフンに正規化し、重複・不正値・空の値リストは保存前に落とす。システム定義タグはテンプレートとして同梱するが、保存後は通常のAgent定義として扱う。

```typescript
interface ReadingAgentTagDefinition {
  id: string;
  label: string;
  values: Array<{
    id: string;
    label: string;
    color?: string; // #RRGGBB。未指定はUIでニュートラル色
  }>;
  system?: boolean;
}
```

解析時は `tagDefinitions` から provider の構造化出力schemaを生成する。選択されていない tag ID、許可されていない value ID、AIが勝手に返した未知タグは保存・表示しない。タグ定義が空のAgentは、`response` 本文だけを返すAgentとして扱う。

### デフォルト Reading Agent

パッケージ内には、次の4体をこの順序でテンプレートとして同梱する。新規 userData へは自動 seed せず、ユーザーが AgentsScreen から明示的に追加したときに通常のユーザー Agent と同じ `userData/agents.json` へ保存する。

| Agent | 目的 | 既定の参照範囲 | 既定タグ |
|---|---|---|---|
| 初見の読者 | 予備知識なしで、理解、期待、興味、引っかかりを一人称で返す | `preceding all` | なし |
| 感覚を読む読者 | 感情、身体感覚、空気、温度、リズム、余韻としてどう届いたかを返す | `preceding all` | `emotion` |
| 構造編集者 | 主題、構造、論理、反論、反対視点、暗黙の前提、重複、削除候補、修正方向を評価する | `whole-document` | `issue` |
| 書き続ける伴走者 | フリーライティングの勢い、発見、固有の表現、続ける価値のある部分を積極的に支える | `whole-document` | `issue` |

4体の定義は `packages/shared/src/readingAgentDefaults.ts` を正とし、main process、preload mock、AgentsScreen のテンプレート一覧から共有する。

共通の助言禁止、称賛禁止、問題指摘必須などは設けない。「初見の読者」は助言を行わず、「構造編集者」は具体的な修正方向を提示し、「書き続ける伴走者」は目的を持って積極的に肯定するなど、各Agentの目的に応じて応答方針を変える。

既存の `agents.json` はテンプレート更新によって自動上書きしない。過去バージョンで作成済みの built-in agent は通常の保存済みAgentとして読み込み、削除・編集・選択の対象にする。追加後のユーザー編集はテンプレート変更で同期しない。

### Active Agent

active agent はプロジェクト単位ではなくアプリ全体の好みとして `userData/app-store.json` の `activeReadingAgentId` に保存する。renderer 起動時は agent list と active ID を読み込み、保存済み ID が存在しない場合は先頭 agent にフォールバックする。agent list が空の場合は `activeAgentId: null` として扱い、解析実行を開始しない。

agent が0件になる状態は正規に許容する。リセットは初期 seed 復元ではなく保存済みAgentを空に戻す操作である。テンプレートから追加されたAgentは通常Agentとして保存され、追加時に active agent へ選択される。

### 解析実行

`analysis:run` payload は `agentId` を必須にする。main process は `agentId` から Reading Agent を取得し、存在しない場合は明示エラーにする。

provider に渡す prompt は次の情報から組み立てる。

- LiteLizard の固定 JSON 出力指示
- Reading Agent の `name` / `role` / `systemPrompt`
- 文書全体と、Reading Agent の `contextPolicy` に従って選ばれた参照本文
- 対象本文

OpenAI / Anthropic / local-llm の各 provider には、agent の `model` があればそれを渡し、`null` の場合は選択 provider の既定 model を渡す。`temperature` は agent の値をそのまま渡す。

OpenAI では、Reading Agent と全文を共通prefixへ置き、対象段落本文を可変promptへ分ける。`prompt_cache_key` は同一文書・同一Agent・同一本文・同一文脈ポリシー・同一モデルで安定し、本文またはAgent promptが変わると変わる。

### Renderer UI

`useAppStore` は agent list / active agent / CRUD / reset / dry-run を一元管理する。AnalysisPane と AgentsScreen は固定モックを直接 import せず、store の状態を参照する。

AnalysisPane は agent list の読み込み中・空配列・active ID 不整合で UI が壊れないようにする。解析実行ボタンは active agent が存在し、provider が実行可能な場合のみ有効にする。

AgentsScreen は `name` / `role` / `systemPrompt` / `contextPolicy` / `tagDefinitions` / `model` / `temperature` を controlled draft として扱い、保存、新規作成、削除、複製、リセット、テンプレート追加、dirty 表示、validation を提供する。新規作成Agentの参照範囲は `whole-document`、タグ定義は空を既定にする。削除は確認を出し、0件状態ではテンプレート追加導線を表示する。

### Dry-run

`agents:dryRun` は、未保存 draft の agent と現在開いている文書の最初の非空段落を使って1段落だけ解析する。文脈は draft agent の `contextPolicy` で選ぶ。結果は AgentsScreen の preview 表示にのみ使い、analysis generation や `.litelizard/analysis` には保存しない。

文書がない、非空段落がない、provider 設定が不足している、API key が無効、レート制限などのエラーは UI 上に表示する。

## 3. 制約・非ゴール

- `personaMode` は互換目的で残すが、新しい読者選択 UI の正規入力にはしない。
- `.lzl` v1 には `personaMode` を新規永続化しない。読み込み時の `general-reader` は既存型を満たすための互換値であり、active Reading Agent を上書きしない。
- active agent は現時点ではプロジェクト別にしない。作品ごとに agent を固定する仕様は将来拡張とする。
- dry-run は保存副作用を持たない。解析履歴、世代ファイル、段落カードの `lizard` 更新を発生させない。
- AgentsScreen の model override は、既定モデルを使う選択肢、OpenAI / Anthropic の provider 候補、カスタムモデルID入力を持つ。Local LLM の候補管理は環境依存のため含めない。
- デフォルトAgentは初期seedではなくテンプレートとして扱う。追加後は通常Agentであり、テンプレート更新と自動同期しない。

## 4. 検証観点

- shared schema が `contextPolicy` を必須とし、旧形式 agent を拒否し、`preceding lastN` の範囲外を拒否する。
- `contextPolicy` を持たない旧 `agents.json` は `.bak` へ退避され、空の Agent 一覧へ復旧する。
- `tagDefinitions` が未指定の既存Agentは `[]` に補完され、タグなしAgentとして動く。
- `tagDefinitions` の不正なID、重複値、未知色は保存前に正規化される。
- provider schema はAgentの `tagDefinitions` から生成され、未知タグ・未知値は正規化時に破棄される。
- active agent ID が保存・復元され、存在しない ID の場合は先頭 agent にフォールバックする。
- AnalysisPane からの解析 payload に `agentId` が含まれ、main 側がその agent を provider 実行に使う。
- agent の `model` override、`temperature`、`contextPolicy` が通常分析、1段落再分析、dry-run、実行前見積もりに使われる。
- 新規 userData とリセット後は Agent 0件になり、テンプレート一覧から任意のデフォルトAgentを追加できる。
- 既存のユーザー作成済み `agents.json` が新しいデフォルトで上書きされない。
- AgentsScreen の保存、新規作成、削除、複製、リセット、dirty 表示、validation が期待通り動く。
- dry-run は1段落だけ返し、解析履歴や `.litelizard/analysis` に保存副作用を残さない。
