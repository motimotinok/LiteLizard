# MVP 公開前チェックリスト

LiteLizard MVP（未署名 macOS `.dmg`）を GitHub Releases に置く前に確認する項目を 1 か所にまとめたもの。LLM が CLI で自動実行できる項目と、人間が macOS GUI 上で目視確認する項目、そして公開判断として人間に残っている未決事項を分けて並べる。

ここで触れている個別仕様の根拠は `docs/decisions.md`、過去の実装は `CHANGELOG.md` と `docs/tickets/done/`、配布手順そのものは `README.md` の「macOS へのインストール」「Packaging」セクションを参照する。

## 自動検証（LLM / CI が CLI で確認できる）

リポジトリ ルートで上から順に成功させる。すべて成功するまで公開判断のフェーズに進まない。

1. Lint: `pnpm -w lint`
2. Unit / integration tests: `pnpm -w test`
   - 現状 `tests/e2e` の Electron 起動 6 件は `RUN_E2E_ELECTRON=1` 未指定で skipped になる。skipped を許容する。
3. Build: `pnpm -w build`
4. Smoke 用 `.app` 生成: `pnpm --filter @litelizard/desktop package:mac`
   - 出力: `apps/desktop/release/mac-arm64/LiteLizard.app`
5. Packaged binary smoke: `pnpm --filter @litelizard/desktop smoke:package:mac`
   - `[Smoke] packaged app ready: {"hasRoot":true,"hasPreloadBridge":true,...}` の出力で成功とみなす。
   - timeout を伸ばしたい場合は `LITELIZARD_SMOKE_TIMEOUT_MS` で上書きできる（既定 60000ms）。
6. 公開用 `.dmg` 生成: `pnpm --filter @litelizard/desktop package:mac:dmg`
   - 出力: `apps/desktop/release/LiteLizard-<version>-<arch>.dmg`（例: `LiteLizard-0.1.0-arm64.dmg`）
   - GitHub Releases に添付するのはこのファイル。

`package:mac` と `package:mac:dmg` は同じ `release/` ディレクトリに出力するため、両方を続けて回す場合はその間に `release/` を整理するか、必要な成果物だけを残す。`smoke:package:mac` は `package:mac` で出した `.app` を見にいくため、`package:mac:dmg` だけを回した直後では確認できない。

## 手動 GUI 確認（人間が macOS 上で実行）

`package:mac:dmg` で出力した `.dmg` を実際に展開し、初見ユーザーが触るのに近い状態で確認する。LLM はこの工程を実行できないので、Ralph Loop ではここを「未実施」のまま完了扱いにしない。

### インストール導線

- [ ] `apps/desktop/release/LiteLizard-<version>-arm64.dmg` を Finder で開く。
- [ ] `LiteLizard.app` を `Applications` フォルダへドラッグしてコピーできる。
- [ ] `Applications` の `LiteLizard.app` を右クリック / Control + クリック → `開く` で Gatekeeper 警告を経て起動できる。
- [ ] それでも起動できない場合の `xattr -dr com.apple.quarantine /Applications/LiteLizard.app` 手順が README 通りに通る。

### 初回体験

- [ ] 初回起動でフォルダ選択ダイアログが開ける。
- [ ] 通常のユーザーフォルダを選ぶと、追加操作なしで workspace 画面に遷移し、`.litelizard/` と既存ファイルがツリーに表示される。
- [ ] 設定画面（左の歯車アイコン）から OpenAI / Anthropic API キー、または Local LLM の endpoint / モデル名を保存できる。

### 執筆まわり

- [ ] エディタで複数段落のドキュメントを作成し、段落 DnD ハンドルが本文側に表示される。
- [ ] ハンドルで段落順を入れ替えると、エディタ表示・分析パネル表示・保存ファイルすべてに反映される。
- [ ] テキストエクスポートで任意の場所に `.txt` を書き出せる。

### 分析まわり

- [ ] 段落分析を実行すると、実行前の確認 overlay に「解析する段落 / 段落本文 / 前後の文脈 / 送信量(概算) / 応答量(概算)」が表示され、`実行する` ボタンが overlay 内に収まって押せる。
- [ ] 確認 overlay で `実行する` を押すと、選択 provider に対して分析が実行され、結果が分析パネルに反映される。

### 終了 / 再起動

- [ ] アプリを通常終了し、再起動すると直前の作業フォルダが自動で復元される。
- [ ] フォルダ選択を明示的に切り替えると、ready 状態が古い復元結果で上書きされず、選んだフォルダがそのまま開かれる。

### 既知の制約として確認しておく

- [ ] dev 環境および Electron 直接起動で `SIGABRT` 等の起動失敗が発生していないか手元で確認する。発生する場合は dev 用 main process の問題として別途追跡する（公開判断にも影響）。
- [ ] フォルダ選択で macOS のシステム領域などを選んだ場合の挙動（`docs/tickets/2026-05-13-project-folder-selection-safety.md` で別途対応予定）。

## 公開判断として人間に残っている未決事項

これらは MVP 公開の可否そのものを左右する判断項目で、Ralph Loop が自動で確定させるものではない。MVP リリース前に「現状のままで公開する」「公開しない」「次のサイクルに送る」のいずれかを決める。

- Apple Developer ID 署名 / notarization の有無。現状は ad-hoc 署名のみで、Gatekeeper の警告対処は README に記載済み。
- 自動更新機能の有無。MVP では実装しない方針。
- ランディングページ公開の有無。MVP では README が事実上唯一のユーザー向け導線。
- Windows / Linux 向け配布の有無。MVP では Apple Silicon Mac のみが対象。
- アプリアイコンの最終確定（GitHub Issue #95）。
- 段落 DnD などの実 GUI 動作確認のための Electron E2E 実行（現状の起動 `SIGABRT` 制約と組み合わせて判断）。
- フォルダ選択 UI の安全範囲・新規フォルダ作成導線（`docs/tickets/2026-05-13-project-folder-selection-safety.md` の対応有無を MVP に含めるかどうか）。

## 公開直前の作業フロー（参考）

1. 自動検証セクションを最初から最後まで成功させる。
2. 生成された `.dmg` を手動 GUI 確認の手順で触る。
3. 公開判断の未決事項を確認し、現状で公開可能か判断する。
4. 公開可能と判断したら、`apps/desktop/release/LiteLizard-<version>-<arch>.dmg` を GitHub Releases に添付し、`CHANGELOG.md` の最新エントリと README を必要に応じて更新する。
