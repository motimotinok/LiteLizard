[2026/05/05]R-18 Reading Agent 編集・解析適用
renderer store と AgentsScreen を Reading Agent 永続化ストアへ接続し、agentId ベースの解析実行、model/temperature 反映、未保存 draft の dry-run、active agent 復元、仕様と検証記録まで完了した

[2026/05/05]Issue #76 R-18b Reading Agent 永続化ストア
main 側に `userData/agents.json` ベースの Reading Agent ストアと CRUD IPC を実装し、初回 seed・不正 JSON 復旧・preload mock の4件 seed をテストで確認した

[2026/05/02]Issue #60 parser.ts の冗長な代入を削除
flushParagraph 内で `currentParagraphId.length === 0` 確認済みの早期 return 分岐にあった `currentParagraphId = ''` を削除した

[2026/05/02]Issue #55 filesystem IPC パストラバーサル対策
main 側 IPC でプロジェクトルート外のパス、symlink 経由の外部参照、不正な解析 ID を拒否する検証を追加し、回帰テストで確認した

[2026/04/28]Issue #58 shared パッケージ subpath exports 修正
`@litelizard/shared/lzl` と `@litelizard/shared/lzl/ids` の package exports が `src/*.ts` を指していたため、ビルド済み成果物である `dist/*.js` / `dist/*.d.ts` を参照するよう修正した

[2026/04/27]L-08 ローカル LLM 接続（Ollama）
Ollama の generate API を local-llm provider として接続し、keep_alive 30秒の非ストリーミング解析と fetch モックの回帰テストを追加した

[2026/04/25]R-16 UI 全面刷新（案 A Minimal 採用）
Claude Design で詰めた案 A Minimal（iA Writer 寄りの極めて静謐な執筆 UI）を renderer に取り込んだ。トークン (古紙黄ばみ＋藍 1 色)、`44+232+1fr` グリッド、明朝 + 漢数字段落番号、中央寄せ表題、AnalysisPane の Reading Agent ドロップダウン + 「段落を読ませる」、感情カラー hash 撤去、ステータスバー / editor-footer 撤去、macOS hiddenInset、Welcome / 新規 AgentsScreen / SettingsScreen 漢数字タブ。Tweaks 切替・Reading Agent の永続化・Recent files 永続化・検索画面はモック先行で R-17〜R-22 に分割。仕様: docs/specs/ui-redesign-minimal.md

[2026/04/25]T-06 GitHub Actions CI
PR と dev/main への push で pnpm test と pnpm build を実行する GitHub Actions workflow を追加した

[2026/04/25]T-02 IPCブリッジ統合テスト
preload と main の IPC 契約テストを追加し、標準テストで main/preload/renderer のテストがまとめて走るようにした

[2026/04/24]R-14 既存テキストインポート
既存 .txt/.md 原稿を .lzl として取り込む導線について、見出し分割・空ファイル・再読込までテストで完了確認した

[2026/04/24]T-01 .lzl parser/serializerテスト
既存の parser/serializer/validator テストに加え、インポート文書の serialize/parse 往復確認を追加して .lzl 品質タスクを完了扱いにした

[2026/04/24]T-03 documentId重複検出テスト
プロジェクト内で後から開いた .lzl の documentId 重複を自動再採番して永続化する最小修復と回帰テストを追加した

[2026/04/24]R-03 構造操作の Undo/Redo
Zustand 統合スタックと UndoPlugin を追加し、章追加・削除、章タイトル Enter、Backspace による格下げ・段落統合を Undo/Redo 対象にした。DnD 並び替えの Undo は残課題。

[2026/04/24]R-09 sourceHash による stale 検出・表示
段落カードの stale 表示を「未解析」と「テキスト変更後の陳腐化」で分岐し、後者に amber 左ボーダーと「要再解析」バッジを追加した。履歴が読み込まれない文書形式でも lizard.analyzedAt で既解析を判定する

[2026/04/23]L-06 解析結果の保存・履歴UI・世代同期
解析履歴の保持と切替 UI、構造変更後の generation 再同期、進行中解析のガード、shared schema export 分離による desktop build 修正を実装した

[2026/04/23]L-05/R-05/R-06 解析ストリーミング・エクスプローラーフィルタ
L-05: 解析を段落ごとに逐次返却するIPC ストリーミング（analysis:progressチャンネル）を実装し、UI がリアルタイムに更新されるようになった。R-05: walk()に.litelizardスキップを追加しエクスプローラーに表示されなくなった。R-06: E-06実装時にipc.tsのdeleteEntryがdeleteAnalysisFilesを呼び出す形で既に完了済みだったためWBSを更新した。

[2026/04/22]L-04 外部API解析リクエストと永続化
テストフック除去・OpenAI/Anthropicエラー日本語化・.lzl解析結果の世代ファイル永続化（再起動後も復元）・AnalysisResult型がanyに落ちていたshared tsconfig修正

[2026/04/21]L-03 Provider抽象化とcontext修正
mainプロセスの解析実行をprovider抽象経由に切り替え、OpenAI/Anthropic切替と文書全体順序ベースのcontext構築を実装した

[2026/04/21]L-01/L-07 分析設定画面と未設定導線
歯車から開く分析設定画面と API キー未設定時の設定導線を実装し、provider別設定保存とローカルLLM接続確認を追加した

[2026/04/20]L-02 APIキー暗号化保存
mainプロセスのAPIキー保存をsafeStorageベースへ置き換え、平文フォールバックと単体テストを追加した
