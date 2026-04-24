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
