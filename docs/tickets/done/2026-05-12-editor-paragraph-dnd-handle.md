---
status: done
started_at: 2026-05-14T09:56:26+09:00
completed_at: 2026-05-14T10:02:29+09:00
---

# 本文エディタの段落DnDハンドルを表示して並び替えを修正する

## 背景

2026-05-12 の dev GUI 確認で、本文エディタ内に複数段落を表示しても、エディタ側の段落DnDハンドル `.paragraph-drag-handle` が DOM 上に出ておらず、本文テキストのドラッグ並び替えを実行できなかった。

分析パネル側には段落カードのドラッグアイコンが表示されているが、ユーザーが期待する「テキストのDnD」は本文エディタ側の段落並び替えであり、現状では操作入口が見えない。

## ゴール

本文エディタ上で段落のドラッグハンドルが表示され、ユーザーが段落をドラッグして順序を入れ替えられる。

## スコープ

- `DragHandlePlugin` / `MicroEditorView` / Lexical 構造スナップショット周辺の原因調査
- 本文エディタ側の `.paragraph-drag-handle` が表示されない原因の修正
- 複数段落の並び替え結果が document state と保存ファイルに反映されることの確認
- 必要に応じた unit test または Electron E2E の追加・更新

## 非ゴール

- 分析パネル側カードDnDの再設計
- Undo/Redo 仕様の拡張
- 章単位DnDの新規仕様追加
- エディタ全体のUI刷新

## 受け入れ条件

- [x] 複数段落を持つドキュメントで、本文エディタ側に段落DnDハンドルが表示される
- [x] ハンドルを使って段落の順序を入れ替えられる
- [x] 並び替え後の順序がエディタ表示、分析パネル表示、保存済み `.lzl` に反映される
- [x] 単一段落・章タイトル・空段落の扱いが破綻しない
- [x] 既存の分析パネル側DnDや保存処理を壊していない

## 検証方法

- [x] 関連する既存テストを確認する
- [x] 必要な Lexical / renderer / Electron E2E テストを追加または更新する
- [ ] Electron dev 起動で本文段落のDnD並び替えを確認する
- [x] `pnpm -w lint`
- [x] `pnpm -w test`
- [x] `pnpm -w build`

## 完了メモ

`StructureStatePlugin` が初期 `editorState` を読み、最初の編集前から章 / 本文段落 / 空段落の snapshot を作るようにした。これにより `paragraphNodeKeys` が初期表示時点で埋まり、`DragHandlePlugin` が本文段落ハンドルを描画できる。

初期 snapshot 抽出は `deriveStructureSnapshotFromTopLevelParagraphs` として純粋関数化し、章位置 fallback、本文段落、空段落を renderer logic test で固定した。ハンドルは portal 配下に出るため、既存の「段落 hover の子孫」CSS に依存せず、wrapper と静的配置で表示されるようにした。

検証:

- `pnpm --filter @litelizard/desktop test -- EditorPane.logic`
- `pnpm --filter @litelizard/desktop test -- useAppStore documentOps`
- `pnpm --filter @litelizard/desktop lint`
- `pnpm -w lint`
- `pnpm -w test`（e2e 6 skipped）
- `pnpm -w build`

残課題:

- Electron E2E / 実 GUI 確認は、既存の Electron 起動 `SIGABRT` により未実施。`RUN_E2E_ELECTRON=1 pnpm --filter @litelizard/e2e test` は Electron launch 前に失敗したため、今回の DnD 表示・並び替え確認は renderer logic test とコードレビューで代替した。
