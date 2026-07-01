# 分析対象スコープの現行境界

関連タスク: #117, #118, #134
決定経緯: `docs/decisions.md` [2026-07-01] #117
状態: decision（現行公開版では段落実行のみ）

---

## 1. 現行公開版で実行できる分析対象

現行公開版で AI に読ませて保存できる分析対象は **段落** のみとする。

`analysis-philosophy.md` は `sentence` / `paragraph` / `chapter` / `document` の対象スコープを将来設計として定義しているが、現行の実装と保存形式は段落 keyed の履歴に限定されている。

```typescript
interface GenerationalAnalysisFile {
  version: 1;
  documentId: string;
  generation: number;
  createdAt: string;
  updatedAt: string;
  paragraphs: Record<string, ParagraphAnalysisHistory>;
}

interface ParagraphAnalysisProvenance {
  targetScope: 'paragraph';
}
```

このため、章・文書全体・一文を独立した AI 分析対象として実行、保存、履歴表示、要再分析判定する経路は現行公開版には追加しない。

---

## 2. 章サマリーとの違い

マクロ視点の章サマリーは、既存の段落分析履歴を章ごとに集計して見せる表示である。章本文全体を 1 つの対象として provider に渡す AI 章分析ではない。

| 表示/機能 | 現行の扱い | 保存単位 |
|---|---|---|
| 段落分析 | AI 実行対象 | `paragraphs[paragraphId].patterns[]` |
| 章サマリー | 段落分析結果の集計表示 | 新規保存なし |
| 章AI分析 | 現行公開版では実装しない | なし |
| 文書全体AI分析 | 現行公開版では実装しない | なし |
| 一文ごとのAI分析 | 現行公開版では実装しない | なし |

章サマリーは、分析済み段落数、未分析/要再分析の状態、任意タグの分布などを俯瞰するための読み取り補助として維持する。Reading Agent に章全体を読ませた結果と混同しないよう、UI や文言では「章そのものを分析した結果」とは扱わない。

---

## 3. Issue 別の現行判断

### 3.1 章単位AI分析 (#117)

章本文全体を 1 つの `chapter` スコープとして実行・保存する機能は、現行公開版では実装しない。章の俯瞰は、段落分析履歴を集計する章サマリーで扱う。

### 3.2 一文ごとの超ミクロ分析 (#118)

段落内の一文を `sentence` スコープとして分割し、文ごとの分析結果を実行・保存する機能は、現行公開版では実装しない。

一文分析は、対象分割、文と分析結果の対応、句点が少ない文章や会話文の扱い、段落編集後の sentence index / fingerprint の再対応が必要になる。段落分析の追加質問や今回だけの追加指示で、特定文への違和感をユーザーが聞く流れは維持できるため、保存構造を広げる実装は見送る。

### 3.3 文書全体スコープ分析 (#134)

文書全体を `document` スコープとして 1 つの結果に紐づける AI 分析は、現行公開版では実装しない。

文書全体分析は、保存先だけでなく、長文時の provider 上限、分割/要約戦略、全文 fingerprint、本文変更後の要再分析判定、段落/章結果と混同しない表示が必要になる。現行では Reading Agent の `whole-document` contextPolicy により、段落分析時に対象段落以外の全文を参照できるため、公開版では段落結果を基本単位として維持する。

---

## 4. 現行境界を置く理由

章、文書全体、一文を分析対象として追加するには、単に provider へ渡す本文範囲を増やすだけでは足りない。少なくとも次の契約を scope-aware に拡張する必要がある。

- 分析リクエストの target 構造
- provider から返る result event
- `GenerationalAnalysisFile` の保存構造
- provenance の `targetScope` と `targetId`
- 本文変更時の fingerprint / stale 判定
- 実行前確認の対象表示と送信量見積もり
- UI の未分析、分析中、失敗、要再分析、履歴切替
- 既存段落履歴との互換読み込み

保守停止前提の公開版では、この変更で保存データ構造を広げるより、既存の段落分析と段落由来の章サマリーを安定させることを優先する。

---

## 5. 将来再検討する場合の最低条件

将来、段落以外の対象スコープを実装する場合は、対象範囲ごとに別々の ad hoc 保存先を増やさず、共通の scoped analysis 契約として設計する。

例:

```typescript
type AnalysisTargetScope = 'sentence' | 'paragraph' | 'chapter' | 'document';

interface ScopedAnalysisTarget {
  scope: AnalysisTargetScope;
  targetId: string;
  text: string;
  chapterId?: string;
  paragraphId?: string;
  sentenceIndex?: number;
}

interface ScopedAnalysisProvenance {
  targetScope: AnalysisTargetScope;
  targetId: string;
  agentId: string;
  contextPolicy: AnalysisContextPolicy;
  referencedParagraphCount: number;
  hasAdditionalInstruction: boolean;
  model: string;
  resultContractVersion: string;
}
```

この場合も、スコープごとの評価項目をシステム側で固定しない。章、文書全体、一文のどれを対象にしても、評価内容は選択された Reading Agent のプロンプトへ委ねる。
