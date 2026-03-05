# 技術決定ログ (DECISIONS.md)

> **用途**: 技術選択の理由・却下した代替案・仕様との意図的な差異を記録する。
> 同じ議論を繰り返さないための記録。追記のみ行い、削除しない。
> フォーマット: 日付 / 決定内容 / 理由 / 却下した代替案

---

## [2026-03-05] GitHub Pages MVP はモックAPIでデモする

- **決定**: LLMなし・モックデータのみで動くデモを GitHub Pages に公開する
- **理由**: サーバー不要・コスト0・工数最小でデモが作れる。`createMockPreloadApi()` が完全実装済みだったため追加工数がほぼかからない
- **却下した案**: Vercel Edge Function 経由で実際のLLM APIを呼ぶ → 工数過大・コスト発生・APIキー管理が必要
- **参照**: `apps/desktop/src/preload/preloadMockApi.ts`

---

## [2026-02-xx] エディタに Lexical を採用

- **決定**: テキストエディタに Meta 製 Lexical v0.19.0 を採用
- **理由**: プラグインアーキテクチャで段落単位のノード管理が可能。React との相性が良く、カスタムDnDプラグインを組み込める
- **却下した案**:
  - ProseMirror: 学習コスト高・React との統合が複雑
  - Slate: メンテナンス停滞懸念
  - contenteditable 直接実装: DnD連携が複雑すぎる

---

## [2026-02-xx] DnD に @dnd-kit を採用

- **決定**: ドラッグ&ドロップに `@dnd-kit/core` + `@dnd-kit/sortable` を採用
- **理由**: React hooks ベースで Lexical カスタムプラグインとの統合が可能。アクセシビリティ対応済み
- **却下した案**: react-beautiful-dnd → メンテナンス終了

---

## [2026-02-xx] 状態管理に Zustand v5 を採用

- **決定**: アプリ全体の状態管理に Zustand v5 を使用
- **理由**: ボイラープレートが少なく、Electronレンダラーとの相性良好。スライス分割（documentOps.ts）で可読性を維持できる

---

## [2026-02-xx] ファイル形式を暫定 .md として運用（仕様差異）

- **決定**: 仕様上の `.lzl` ではなく、現状は `.md` ファイルを扱う
- **理由**: MVP フェーズでは形式策定より機能実装を優先する。`.lzl` の内部フォーマットは仕様§13が未策定
- **影響**: `titleFromPath()` が `.md` を除去する処理が入っている
- **将来**: `.lzl` フォーマット策定後に移行予定

---

## [2026-02-xx] クライアント側に API キー設定画面を実装（仕様差異）

- **決定**: 仕様§9「クライアント側に個別APIキー設定画面は持たない」に反して実装
- **理由**: 開発フェーズで各自のAPIキーで解析をテストするために必要だった
- **将来**: 本番ではサーバー認証（仕様§9の方針）に切り替える

---

## [2026-02-xx] EditorPane をコンポーネント分割（editor/ ディレクトリ）

- **決定**: 旧 `EditorPane.tsx` を `components/editor/` 配下に分割
- **理由**: ファイルが肥大化し、Lexicalプラグイン・DnD・マクロビューが1ファイルに混在していた
- **構成**:
  - `index.tsx` (シェル) / `MicroEditorView.tsx` / `MacroView.tsx`
  - `plugins/` (DragHandlePlugin等) / `utils/` (ids, nodeKeyMapping等)
