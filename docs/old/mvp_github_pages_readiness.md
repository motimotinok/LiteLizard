# LiteLizard MVP GitHub Pages 公開計画

最終更新: 2026-03-04
目標公開日: 2026-03-15（10日後）
方針: **案A — LLMなし・モックデータでデモ**

---

## 現状評価

### 既に動いているもの

- エディター（ミクロ/マクロ視点・Ctrl+Scroll切り替え）
- 段落・章のドラッグ&ドロップ
- エクスプローラー・ファイル操作
- チャットパネルの開閉（Cmd/Ctrl+Shift+A）
- `runAnalysis()` のストア実装（呼び出し口がないだけで動作する）
- **`createMockPreloadApi()` が完全実装済み**（ファイル管理・ドキュメントCRUD・モック解析すべて含む）
  - `paragraphAnalysisFromText()` でテキストから感情タグ・テーマ・deepMeaning を生成
  - `initialMockApiKeyConfigured = true` のためログインUIなしで解析が通る

### ブロッカー（2点のみ）

| # | 問題 | 影響 |
|---|------|------|
| 1 | `window.litelizard` がブラウザに存在しない | GitHub Pages でアプリが起動しない |
| 2 | 分析ペインに「生成」ボタンがない | 解析機能のデモができない |

---

## タスク一覧

### Day 1（最重要 / 目安3時間）

#### タスク1: ブラウザ起動時にモックAPIを自動注入する

- **ファイル**: `apps/desktop/src/renderer/main.tsx`
- **内容**: `window.litelizard` が未定義のとき（Electron外のとき）`createMockPreloadApi()` をセットする
- **実装イメージ**:
  ```ts
  // main.tsx の createRoot より前に追加
  if (!window.litelizard) {
    const { createMockPreloadApi } = await import('../preload/preloadMockApi.js');
    window.litelizard = createMockPreloadApi();
  }
  ```
- **補足**: `preloadMockApi.ts` はNode.js依存なし・ブラウザ互換

#### タスク2: AnalysisPane に「生成」ボタンを追加する

- **ファイル**: `apps/desktop/src/renderer/components/AnalysisPane.tsx`
- **内容**: ヘッダーに「生成」ボタンを追加、`useAppStore().runAnalysis()` を呼び出す
- **UX**:
  - stale 段落が0件のときは disabled
  - 実行中（pending 状態の段落がある間）は disabled + ローディング表示
  - App.tsx から `onRunAnalysis` prop を渡す形 or ストア直参照で実装

---

### Day 2（デモ品質向上 / 目安3〜4時間）

#### タスク3: 起動時にサンプル文書を自動で開く

- **ファイル**: `apps/desktop/src/renderer/store/useAppStore.ts`（または `App.tsx`）
- **内容**: アプリ起動直後に `loadDocument(mockRootPath + '/welcome.md')` を自動実行する
- **現状**: 空画面から始まるため、訪問者がエディターを見るまでに操作が必要
- **目標**: 開いた瞬間にエディターと文章が表示されている状態

#### タスク4: モックのサンプルテキストをデモ向けに書き直す

- **ファイル**: `apps/desktop/src/preload/preloadMockData.ts`
- **内容**: 現状の開発者向けテキストを、実際の執筆シーンを想起させる内容に差し替える
- **目標**: 3〜5段落・章あり・一部は `status: 'complete'` で解析済み状態を見せる

---

### Day 3（デプロイ設定 / 目安2〜3時間）

#### タスク5: Vite の base パスを GitHub Pages 用に設定する

- **ファイル**: `apps/desktop/vite.config.ts`（または Pages 専用設定ファイルを分離）
- **内容**: `base: '/liteLizard/'`（リポジトリ名）を追加
- **補足**: サブパス配信のため index.html の asset パスが相対になる

#### タスク6: GitHub Actions 自動デプロイを設定する

- **ファイル**: `.github/workflows/deploy-pages.yml`（新規作成）
- **内容**: `main` ブランチへの push → `vite build` → `gh-pages` ブランチへ deploy
- **使用action**: `peaceiris/actions-gh-pages` または GitHub 公式 `actions/deploy-pages`

---

### Day 4〜5（動作確認・バッファ）

- GitHub Pages URL で実機確認
- スマホ表示の最低限チェック
- note 用スクリーンショット・GIF 収録（DnD・解析生成の一連操作）

---

### Day 6〜10（note 記事執筆・公開）

- 記事トーン: 「執筆×AI解析ツールを開発中です」（完成品ではなく開発中として出す）
- デモURL・スクリーンショットを記事に貼る
- 「β版・フィードバック歓迎」と明記する

---

## 作業量の実態

モックAPIが完全実装済みだったため、Dev作業は当初の見込みより大幅に少ない。

| フェーズ | 作業時間 |
|----------|---------|
| タスク1・2（ブロッカー解消） | 約3時間 |
| タスク3・4（デモ品質向上） | 約3時間 |
| タスク5・6（デプロイ設定） | 約2時間 |
| 動作確認・バッファ | 半日 |
| **合計** | **実質1.5〜2日** |

---

## MVP 受け入れ基準（公開前チェックリスト）

- [ ] GitHub Pages の URL でアプリが起動する
- [ ] 起動直後にエディターと文章が表示されている
- [ ] 段落を編集できる
- [ ] ミクロ↔マクロ切り替えが動く
- [ ] 段落・章のDnDが動く
- [ ] チャットパネルを開ける
- [ ] 「生成」ボタンを押すと解析結果が表示される
- [ ] スマホで致命的な崩れがない

---

## 参考：ファイル対照

| 役割 | ファイル |
|------|---------|
| モックAPI実装 | `apps/desktop/src/preload/preloadMockApi.ts` |
| モック初期データ | `apps/desktop/src/preload/preloadMockData.ts` |
| レンダラーエントリ | `apps/desktop/src/renderer/main.tsx` |
| 分析ペイン | `apps/desktop/src/renderer/components/AnalysisPane.tsx` |
| ストア | `apps/desktop/src/renderer/store/useAppStore.ts` |
| Vite設定 | `apps/desktop/vite.config.ts` |
