[2026/04/22]L-04 外部API解析リクエストと永続化
テストフック除去・OpenAI/Anthropicエラー日本語化・.lzl解析結果の世代ファイル永続化（再起動後も復元）・AnalysisResult型がanyに落ちていたshared tsconfig修正

[2026/04/21]L-03 Provider抽象化とcontext修正
mainプロセスの解析実行をprovider抽象経由に切り替え、OpenAI/Anthropic切替と文書全体順序ベースのcontext構築を実装した

[2026/04/21]L-01/L-07 分析設定画面と未設定導線
歯車から開く分析設定画面と API キー未設定時の設定導線を実装し、provider別設定保存とローカルLLM接続確認を追加した

[2026/04/20]L-02 APIキー暗号化保存
mainプロセスのAPIキー保存をsafeStorageベースへ置き換え、平文フォールバックと単体テストを追加した
