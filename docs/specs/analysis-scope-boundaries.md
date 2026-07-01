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

## 3. 現行境界を置く理由

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

## 4. 将来再検討する場合の最低条件

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

