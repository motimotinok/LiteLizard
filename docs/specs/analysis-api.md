# 分析実行・IPC仕様

関連タスク: S-06, S-09
決定経緯: `docs/decisions.md` [2026-03-28] S-06, [2026-03-30] S-09
改訂: 2026-06-25 contextPolicy を Reading Agent 所有の設定へ移行

---

> この文書は2026-06-25時点のElectron IPC・保存契約を中心に記録する。分析内容をユーザー定義のAgentへ委ねる原則、将来の `response` と任意タグ、Agent単位の文脈ポリシーは [`analysis-philosophy.md`](analysis-philosophy.md) を正とする。
>
> 現在、自社サーバーの分析APIは存在しない。旧Fastify APIは削除済みであり、将来のクラウド方式はOAuth、ストリーミング、利用量・課金管理を含めて新規設計する。

## 1. リクエスト

### 1.1 基本単位

分析の基本単位は**段落**。複数段落をまとめて1リクエストとし、Electron main プロセス側でループ処理する（外部 LLM API への直接リクエスト、またはローカル LLM へのリクエスト）。

### 1.2 操作パターン

| 操作 | 送信範囲 | 備考 |
|------|---------|------|
| 章一括分析 | 章内の全段落 | まとめて1リクエスト |
| 特定段落の再分析 | 対象段落1つ | ユーザープロンプト入力付き（UI は都度検討） |
| ドキュメント全体分析 | 全段落 | トークン消費確認ダイアログを表示 |

### 1.3 リクエスト構造（案）

```typescript
interface AnalysisRequest {
  documentId: string;
  paragraphs: AnalysisTargetParagraph[];
  userPrompt?: string; // 再分析時のユーザー指示
  provider: AnalysisProvider; // S-09 追加: プロバイダー設定
}

// S-09: 3系統のプロバイダー
type AnalysisProvider =
  | { type: 'external-api'; provider: 'openai' | 'anthropic' | string; model: string }
  | { type: 'local-llm'; endpoint: string; model: string }
  | { type: 'cloud'; accessToken: string }; // 将来拡張パス

// 注: API キーは main プロセスが safeStorage から取得するため、リクエスト構造には含めない

interface AnalysisTargetParagraph {
  paragraphId: string;
  text: string;
  context: string[]; // Reading Agent の contextPolicy に従って選ばれた参照本文配列（文書順）
}
```

---

## 2. コンテキスト

文脈ポリシーはグローバルな分析設定ではなく、Reading Agent の `contextPolicy` として保存する。通常分析、特定段落の再分析、dry-run、実行前見積もりは、選択中Agentの `contextPolicy` を同じ契約で参照する。

```typescript
type AnalysisContextPolicy =
  | { mode: 'target-only' }
  | { mode: 'preceding'; range: 'all' }
  | { mode: 'preceding'; range: 'lastN'; lastN: number }
  | { mode: 'whole-document' };
```

| policy | 参照本文 | 主な用途 |
|--------|----------|----------|
| `target-only` | 対象本文のみ。参照本文なし | 1段落だけを軽く読む、コストを最小化する |
| `preceding all` | 対象より前の全文 | 前から読む読者体験を保つ |
| `preceding lastN` | 対象より前の直近N段落 | 長文でコストと速度を抑える |
| `whole-document` | 対象以外の全文。対象本文は別枠で渡す | 後続を含む構造評価や全体整合の確認 |

実装上の挙動:
- `lastN` は schema validation で 1〜999 に制限する。
- 既定値は `{ mode: 'whole-document' }`。新規作成Agentもこの既定値を使う。
- 既存の `analysis-settings.json` に残る `contextPolicy` は読み込み時に無視し、保存契約からも外す。
- `contextPolicy` を持たない旧 `agents.json` は互換補完せず、`agents.json.bak` へ退避して現在のデフォルトAgentを再生成する。
- provider prompt は、固定指示、Reading Agent prompt、参照本文、対象本文の順に組み立てる。prompt caching、`prompt_cache_key`、provider別キャッシュ最適化は後続タスクで扱う。

例:

```
target-only:
段落3: reference = [], target = 段落3

preceding all:
段落3: reference = [段落1, 段落2], target = 段落3

preceding lastN(1):
段落3: reference = [段落2], target = 段落3

whole-document:
段落3: reference = [段落1, 段落2, 段落4, ...], target = 段落3
```

---

## 3. レスポンス

### 3.1 方式

**IPC ストリーミング**（main → renderer）で段落ごとに逐次返却する。main プロセスが LLM API（外部 or ローカル）を呼び出し、結果を `webContents.send` で renderer に逐次送信する。将来のクラウド方式では SSE（Server-Sent Events）を使用する。

### 3.2 レスポンス構造（案）

```typescript
// IPC イベントごとに送信（将来のクラウド方式では SSE イベント）
interface AnalysisResultEvent {
  type: 'paragraph_result';
  paragraphId: string;
  result: ParagraphAnalysisResult;
}

interface AnalysisCompleteEvent {
  type: 'complete';
  totalParagraphs: number;
}

interface AnalysisErrorEvent {
  type: 'error';
  paragraphId?: string; // 段落単位のエラー時
  message: string;
}

// `packages/shared/src/types.ts` の ParagraphAnalysisResult を参照する。
// 標準フィールド（emotion / theme / deepMeaning / confidence / model / sourceText）
// はすべて optional で、既存の保存済みデータとも互換を保つ。
interface ParagraphAnalysisResult {
  emotion?: string[];
  theme?: string[];
  deepMeaning?: string;
  confidence?: number;
  model?: string;
  sourceText?: string;
}
```

### 3.3 処理層の責務

- **ステートレス**: 処理して返すだけ。分析結果の保存は行わない
- Electron main プロセスが段落テキスト + コンテキストを LLM API（外部 or ローカル）に渡し、結果を IPC 経由で renderer に逐次返却する
- 将来のクラウド方式では、自社サーバーが同等の処理を行い SSE で返却する

---

## 4. 認証・プロバイダー設定

> S-09 により改訂: ローカル完結が主軸。クラウドログインは将来拡張パス。

3系統の方式をサポートする。

| 方式 | ログイン | 処理場所 | 実装時期 |
|------|---------|---------|---------|
| 外部 API キー（OpenAI / Anthropic 等） | **不要** | ローカル（main プロセス） | MVP |
| ローカル LLM（Ollama 等） | **不要** | ローカル | MVP or P2 |
| クラウドサーバー（OAuth） | 必要 | 自社サーバー | 将来拡張 |

- **外部 API キー方式**（MVP 主軸）: ユーザーが設定画面で API キーを登録。`safeStorage` で暗号化保存。main プロセスが直接 LLM API を呼び出す
- **ローカル LLM 方式**: ユーザーが Ollama 等をインストールし、エンドポイント URL + モデル名を設定。main プロセスが `localhost` 経由で呼び出す
- **クラウド方式**（将来）: OAuth ログイン後、自社サーバー API 経由で分析する構想。現時点にサーバー実装はなく、旧legacy APIを復元せず新規設計する。OAuth の詳細は `docs/specs/auth-session.md` を参照

---

## 5. ローカル保存

### 5.1 保存先

`.litelizard/analysis/` ディレクトリ内。

### 5.2 ファイル命名規則

```
{documentId}_001.json
{documentId}_002.json
{documentId}_003.json
...
```

世代連番（ゼロ埋め3桁）。起動時に最新連番のファイルを読み込んで表示する。

### 5.3 ファイル内構造

```typescript
interface AnalysisFile {
  version: 1;
  documentId: string;
  generation: number; // 世代番号（ファイル名の連番と一致）
  createdAt: string;  // ISO 8601
  updatedAt: string;  // ISO 8601
  paragraphs: Record<string, ParagraphAnalysisHistory>;
}

interface ParagraphAnalysisHistory {
  patterns: ParagraphAnalysisPattern[];
  // patterns[patterns.length - 1] が最新（デフォルト表示）
}

interface ParagraphAnalysisPattern {
  analyzedAt: string; // ISO 8601
  userPrompt?: string; // 再分析時のユーザー指示
  result: ParagraphAnalysisResult; // §3.2 と同一の型
}
```

---

## 6. 世代管理

### 6.1 世代更新トリガー

以下の**構造変更**が発生したとき、新しい世代ファイルを作成する:

- 段落の追加
- 段落の削除
- 段落の並べ替え（DnD）

### 6.2 テキスト編集時

テキスト編集のみの場合は世代更新しない。再分析の結果は同一ファイル内で該当段落の `patterns` 配列に追記する。

### 6.3 世代切り替え

新世代ファイル作成時、旧世代の分析結果は**そのまま残る**。段落 ID が一致する結果は新世代にコピーしない（旧世代ファイルを参照すれば閲覧可能）。

---

## 7. 分析カード UI

- 各段落の分析カードに `< >` ボタンを表示
- デフォルトは最新パターン（`patterns` 配列の末尾）を表示
- `<` で1つ前のパターン、`>` で1つ後のパターンに切り替え
- パターンが1つしかない場合はボタンを非表示またはグレーアウト

---

## 8. 将来の最適化ポイント

> 以下は MVP スコープ外。実運用で問題が顕在化した時点で対応する。

1. **コンテキスト圧縮と prompt caching**: Agent単位の文脈ポリシーを前提に、固定指示 + Agent prompt をキャッシュし、参照本文や対象本文の送り方を最適化する
2. **ストリーミングリジューム**: 全体分析時に途中でエラーが発生した場合、どの段落まで完了したかをクライアントが把握し、続きから再開する機構
3. **世代ファイル自動削除**: 頻繁な構造変更で世代ファイルが増加する場合、直近 N 世代のみ保持するポリシー
