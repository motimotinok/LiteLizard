# 分析コンテキストポリシー切替

## 背景

WBS `L-09` では、解析時に LLM へ渡す前段落の範囲を、文書全体か章内か、上限なしか直近 N 段落かで切り替えられるようにすることが求められている。現在の固定的な文脈制限は、長い章や前章から続く読者体験を拾いにくく、分析 UX を下げる可能性がある。

一方で、常に全文脈を渡すとコスト、速度、モデル上限に影響するため、作品や分析目的に応じて設定できる形が望ましい。

## ゴール

設定画面から分析コンテキストの範囲と上限方式を選べ、解析実行時に選択したポリシー通りの前段落だけが LLM に渡る。

## スコープ

- `docs/specs/analysis-api.md` にある `scope: document/chapter` と `limitMode: none/lastN` の現仕様を確認する
- 分析設定の保存スキーマ、renderer 設定 UI、main 側 context 生成を現在の設計に沿って接続する
- 解析実行時の context が設定どおりに組み立てられることをテストで確認する
- 必要に応じて `CHANGELOG.md` と関連仕様を更新する

## 非ゴール

- LLM プロバイダーの追加
- Reading Agent のプロンプト設計変更
- 解析 UI 全体の再設計
- トークン見積もりやモデル別コンテキスト長の高度な最適化

## 受け入れ条件

- [x] 設定画面でコンテキスト範囲を `document` / `chapter` から選択できる
- [x] 設定画面で上限方式を `none` / `lastN` から選択でき、`lastN` の場合は N を保存できる
- [x] main 側の解析 context 生成が保存済み設定を反映する
- [x] chapter scope では対象段落と同じ章の前段落だけが渡る
- [x] lastN では指定件数を超える前段落が渡らない
- [x] 既存の解析実行、履歴保存、Reading Agent 適用が壊れていない

## 検証方法

- [x] 関連する既存テストを確認する
- [x] 解析 context 生成の回帰テストを追加または更新する
- [x] `pnpm -w lint`
- [x] `pnpm -w test`
- [x] `pnpm -w build`

## 完了メモ

実装日: 2026-05-06。

### 変更内容
- `packages/shared/src/types.ts`: `AnalysisContextScope` / `AnalysisContextLimitMode` /
  `AnalysisContextPolicy` を追加。`AnalysisSettings.contextPolicy` を必須、
  `AnalysisSettingsInput.contextPolicy` を旧クライアント互換のため optional とし、
  `DEFAULT_ANALYSIS_CONTEXT_POLICY = { scope: 'document', limitMode: 'lastN', lastN: 10 }`
  を従来挙動と同じ既定値として導入。
- `packages/shared/src/api.ts`: `AnalysisParagraphSchema` に `chapterId` を optional 追加。
  chapter scope の判定だけに使うため、古いクライアントとの互換は保たれる。
- `apps/desktop/src/main/analysisSettingsStore.ts`: `normalizeContextPolicy` を追加し、
  scope/limitMode の不正値は既定値にフォールバック、`lastN` は 1..999 にクランプ。
  `mergeAnalysisSettings` で `contextPolicy` を反映。
- `apps/desktop/src/main/analysisProvider.ts`: `buildContextTexts` のシグネチャを
  `(paragraphs, paragraphId, policy?)` に拡張。
  - `scope === 'chapter'`: 対象段落の `chapterId` と一致する前段落だけ抽出。`chapterId`
    が無いケースは document scope に互換 fallback。
  - `limitMode === 'lastN'`: 末尾 `lastN` 件に絞る。
  - `limitMode === 'none'`: 全件返す。
- `apps/desktop/src/main/apiBridge.ts`: `runAnalysis` / `dryRunReadingAgent` に
  `contextPolicy` を末尾追加（既定は `DEFAULT_ANALYSIS_CONTEXT_POLICY`）。
- `apps/desktop/src/main/ipc.ts`: `runAnalysis` / `dryRunReadingAgent` ハンドラで
  `mergeAnalysisSettings` 後に `analysisSettings.contextPolicy` を `apiBridge` に渡す。
- `apps/desktop/src/renderer/store/useAppStore.ts`: `toAnalysisParagraphInput` に
  `chapterId` を含めて main へ送る。`saveAnalysisSettings` で `contextPolicy` を
  state に反映する。
- `apps/desktop/src/renderer/components/SettingsScreen.tsx`: 「分析エンジン」タブに
  Section 4「分析コンテキスト」を追加。範囲（document/chapter）、上限（lastN/none）、
  件数 N（1..999, lastN のときのみ enable）の UI を持ち、既存の保存ロジックに合流。
- `apps/desktop/src/preload/preloadMockApi.ts`: `saveAnalysisSettings` モックで
  `contextPolicy` を保持するように更新。
- `docs/specs/analysis-api.md` §2.1: 「将来拡張」セクションを実装済み仕様として
  書き直し、既定値・クランプ範囲・互換挙動を追記。

### テスト
- `analysisSettingsStore.test.ts`: 既定 fallback、有効値の反映、不正値のフォールバック
  と `lastN` クランプの 3 ケースを追加。
- `apiBridge.test.ts` `buildContextTexts`: chapter scope、`limitMode='none'`、
  `limitMode='lastN'`、chapter scope での chapterId 欠落時の document fallback の
  4 ケースを追加。既存ケースも policy 既定値経由で互換動作を確認。
- `ipc.test.ts`: `apiBridgeMock.runAnalysis` / `dryRunReadingAgent` への呼び出しに
  `contextPolicy` 引数（scope/limitMode を含むオブジェクト）が渡ることを検証。

### 設計上のメモ
- `AnalysisSettingsInput.contextPolicy` は optional、`AnalysisSettings.contextPolicy`
  は必須にした。これにより古いクライアントから保存リクエストが来ても、main で normalize
  して既定値が埋まる。renderer の draft state は常に完全形を保持するので UI には影響なし。
- `chapterId` 欠落時の chapter scope は意図的に document scope に fallback する。
  これにより、外部クライアントや古いキャッシュから `chapterId` 抜きの payload が来ても
  解析自体は失敗しない。chapter scope の効力は失われるが、ユーザー体験は維持される。
- 設定 UI は既存の「設定を保存」ボタンを 2 箇所（既定モデル, 分析コンテキスト）に
  置く形にした。draft state は単一なのでどちらのボタンでも同じ保存処理が走る。
- ローカル LLM の context 長制限は今回は扱わない（仕様上 `limitMode='none'` を選ぶと
  巨大な context が渡る可能性があるが、トークン見積もりは非ゴールに明記）。

### 残課題
- トークン上限ベースで自動的に context を絞る挙動は未対応（チケット非ゴール）。
  必要になればモデル別 context window や trim 戦略を別チケットで設計する。
- 設定 UI の「件数 (N)」を `disabled` 状態でも値が見えるようにしているが、無効時に
  色を弱める CSS は未調整。デザイン整備時に追従する。
