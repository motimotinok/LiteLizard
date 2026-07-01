# 分析 provider サポート境界

関連Issue: #94  
状態: decision（Gemini provider は現行公開版では追加しない）

## 結論

LiteLizard の現行公開版でサポートする分析 provider は、OpenAI、Anthropic、Local LLM（Ollama 互換 endpoint）の3系統に限定する。Google Gemini provider は追加しない。

Gemini の structured output を検証する価値はあるが、provider 追加は単に選択肢を増やすだけではない。API キー保存、設定UI、model候補、provider固有schema、エラー処理、privacy/security文書、実API検証、将来の仕様追従をまとめて増やすため、保守停止前提の公開版には入れない。

## 非採用理由

- provider 追加は `AnalysisProviderId`、settings schema、safeStorage、preload bridge、renderer store、SettingsScreen、provider実装、mock、テスト、privacy/security文書へ波及する。
- Gemini の structured output 仕様やモデル名は変わり得るため、継続的な公式ドキュメント確認と実API検証が必要になる。
- 現行の分析契約は `response` + 任意 `tags` に移行済みで、OpenAI / Anthropic / Local LLM の3系統で同じ正規化経路を保てている。ここへ第4 provider を足すより、既存経路の安定性を優先する。
- 無料枠の有無や使いやすさをアプリ内の価値として扱うには、料金・quota・地域差・モデル差の説明が必要になるが、LiteLizard は料金管理を持たない。
- 実APIキーなしの mock テストだけでは、structured output の実運用可否を完了条件として十分に証明できない。

## 将来再検討する条件

Gemini provider を再検討する場合は、次を満たしてから別タスクにする。

- 公式 structured output 仕様を確認し、LiteLizard の `response` + `tags` schema を無理なく強制できる
- API キー保存と provider 設定が既存の privacy/security 方針と整合する
- model候補を固定カタログに入れる場合、候補更新の保守方法を決める
- API キー不正、quota/rate limit、schema不一致、parse失敗のエラーを他providerと同じ粒度で扱える
- 実APIキーで1段落の分析を確認できる
- OpenAI / Anthropic / Local LLM の既存挙動に回帰がない

## 現行で許容する代替

- OpenAI / Anthropic を外部API provider として使う
- Local LLM endpoint に、ユーザーが管理する互換ランタイムを接続する
- 将来、provider を増やす場合も renderer に provider 固有のレスポンス形状を漏らさず、main process の provider 層で `AnalysisResult` へ正規化する
