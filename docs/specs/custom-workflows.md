# カスタムワークフロー検討メモ

関連Issue: #74  
状態: decision（当面は実装しない。将来再検討する場合の境界を記録）

## 結論

LiteLizard は当面、ユーザー自作ボタンとしてのカスタムワークフロー機能を実装しない。

将来再検討する場合も、任意 JavaScript / TypeScript 実行ではなく、LiteLizard が許可した対象・処理・出力先だけを組み合わせる宣言型ワークフローに限定する。執筆画面へ標準ボタンを増やさず、設定画面または専用管理画面で作成し、必要な人だけが呼び出す補助機能として扱う。

## 判断

現時点では、段落分析、Reading Agent、今回だけの追加指示、段落ごとの追加質問が「現在の段落を LLM に読ませ、結果を判断材料として見る」主要用途をすでに吸収している。ここへ汎用ワークフロー機能を足すと、次の負荷が増える。

- 保存形式、バージョニング、失敗時復旧、無効化、互換性維持
- provider 送信範囲と使用量確認の再設計
- 本文挿入やファイル書き込みを許可する場合の Undo / 安全確認
- 非エンジニア向けの編集 UI とエラー説明
- 執筆画面へ「自作ボタン」をどう静かに出すかの設計

保守停止前提では、汎用自動化基盤を中途半端に持つより、Reading Agent と分析/質問の流れを安定させるほうが価値が高い。

## 宣言型ワークフローとして再検討する場合のモデル

```typescript
interface CustomWorkflowDefinition {
  id: string;
  name: string;
  description?: string;
  target: WorkflowTarget;
  action: WorkflowAction;
  output: WorkflowOutput;
  enabled: boolean;
}

type WorkflowTarget =
  | { type: 'focused-paragraph' }
  | { type: 'selected-chapter' }
  | { type: 'whole-document' };

type WorkflowAction =
  | { type: 'run-reading-agent'; agentId: string; additionalInstruction?: string }
  | { type: 'insert-template'; template: string };

type WorkflowOutput =
  | { type: 'candidate-panel' }
  | { type: 'analysis-thread' }
  | { type: 'insert-after-confirmation' };
```

このモデルは検討用であり、現行保存契約には追加しない。

## 想定ユースケース

- 現在の段落を、特定の Reading Agent + 固定追加指示で読み、候補パネルに返す
- 現在の章を対象に、構造編集者 Agent へ「削除候補だけ」を聞く
- 文書全体を対象に、公開前チェック用 Agent へ「読者が迷う箇所」を列挙させる
- 現在位置へ定型メモや区切りテンプレートを挿入する
- 生成結果を本文へ直接入れず、確認後にだけ挿入する

## 許可する処理と許可しない処理

許可候補:

- 既存 Reading Agent を使った LLM 実行
- 今回だけの追加指示を固定文として添える
- 固定テンプレートの挿入
- 結果を候補パネルまたは分析スレッドに表示
- ユーザー確認後の本文挿入

許可しない:

- 任意コード実行
- shell / filesystem / network への自由アクセス
- API キーや userData の読み取り
- ユーザー確認なしの本文変更
- ユーザー確認なしのファイル作成、削除、移動
- 外部URLへの任意送信
- provider 送信範囲を実行前確認から隠すこと

## UI 方針

- 既定では執筆画面に表示しない
- 作成・編集は設定画面または専用の補助画面に置く
- 執筆画面では、必要時に開く menu / command palette / 右インスペクター内の静かな入口に留める
- 自作ボタンを rail に常時増やさない
- ワークフロー失敗時も本文と分析結果を壊さず、候補表示だけを失敗状態にする
- 本文へ反映する処理は必ず確認と Undo 対象にする

## #73 拡張機能基盤との関係

カスタムワークフローは、任意コード拡張の代替または前段として位置づける。#73 のような本格拡張機能基盤を作る場合でも、最初から任意コード実行を許可せず、まず宣言型ワークフローで十分な用途を満たせるかを検証する。

ただし現時点では #73 へ接続する実装タスクを作らない。拡張機能基盤を検討するなら、セキュリティ境界、署名/配布、権限モデル、失敗時隔離を先に定義する。

## 再開条件

次の条件がそろうまで実装しない。

- Reading Agent / 段落追加質問では満たせない具体的な反復作業が複数確認されている
- 本文変更を伴う処理の Undo / 確認 / 保存契約が設計済みである
- provider 送信範囲とコスト確認を既存分析フローと同じ透明性で出せる
- 既定非表示でも利用者が自然に発見できる導線がある
- 任意コード実行なしで価値が出る範囲に限定できる
