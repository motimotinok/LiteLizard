[2026/07/01]#104 GitHub Release 運用手順書を追加
MVP 公開の運用手順として `docs/release-runbook.md` を追加し、`MVP Release` workflow が使う `mvp-latest` tag、`LiteLizard-latest-arm64.dmg` asset、Release title/body、APP_VERSION と packaged app version の一致確認、失敗時の確認入口を整理した。README と公開前チェックリストから runbook へ辿れるようにし、自動検証と人間が残す GUI 確認の境界も明示した。

[2026/07/01]#103 左ツールバーのフォルダアイコンでサイドバーを折りたためるようにした
Workspace画面でフォルダアイコンを押すと、表示中のエクスプローラーサイドバーを折りたたみ、もう一度押すと再表示できるようにした。折りたたみ中はメイン領域を rail の隣まで広げ、現在文書やファイル一覧のデータは store 側に残るため、再表示しても状態を失わない。フォルダアイコンの aria-label / title / aria-expanded も開閉状態に合わせて切り替えるようにした。

[2026/07/01]#120 左右パネルのドラッグ幅調整を追加
エクスプローラーとエディターの境界、エディターと右分析パネルの境界にリサイズハンドルを追加し、左右補助パネルをセッション中にドラッグで広げたり狭めたりできるようにした。幅は最小/最大値と viewport の半分上限でクランプし、overlay モードでは右分析パネルのリサイズハンドルを出さない。幅の永続化は settings/userData 契約を広げるため今回の範囲外とし、実装コメントでセッション限定方針を明示した。

[2026/07/01]#108 初見ユーザー向けの使い方ガイドを追加
初回利用者がインストール後に最初の段落分析まで進めるよう、`articles/getting-started.md` を追加した。代表的な利用場面、作業フォルダ選択、新規文書作成、provider設定、Reading Agent選択、段落分析、結果を直す・直さない判断に使う例を、現行の対応OS・保存・外部送信条件と矛盾しない形で整理した。README と LP から初回ガイドへ到達できる導線も追加した。

[2026/07/01]#124 アプリ更新時のローカルデータ保持仕様を追加
アプリ更新後も Reading Agent、分析設定、APIキー、最近開いたプロジェクト、active Reading Agent を保持するための仕様として `docs/specs/update-data-retention.md` を追加した。現行の `userData` 保存対象、`appId` / `productName` を不用意に変えない制約、`safeStorage` 復号失敗時の非破壊フォールバック、将来の premium entitlement / セッション保存方針を整理し、release checklist に DMG 更新後の保持確認項目を追加した。

[2026/07/01]#125 起動時文言と初回導線を整理
ProjectSetupScreen に「作業フォルダを開く → 文章を書く、または開く → 必要な段落を読ませる」の短い流れを追加し、文書と分析結果がローカル保存されることを起動時に示すようにした。EditorEmptyState は「新しい文書を書く」を主導線にし、APIキーやReading Agentは書き始めたあとで設定できることを明示した。AnalysisPane の設定不足メッセージは、設定後に戻って「段落を読ませる」を押す流れが分かる文言へ更新した。

[2026/07/01]#137 Reading Agentごとの構造化タグ定義を追加
AgentsScreenでReading Agentごとに構造化タグ項目と許可値、タグ値色を設定できるようにした。providerへ渡すJSON schema/tool schema/Local LLM formatは選択Agentの `tagDefinitions` から生成し、未選択タグや未知値は正規化時に破棄する。既存Agentは `tagDefinitions: []` に補完し、タグなしAgentは本文だけを返す。デフォルトテンプレートには感覚系の `emotion`、構造系の `issue` を同梱し、dry-runとpreload mockも同じタグ定義に従うようにした。

[2026/07/01]分析結果契約をresponseと任意tagsへ移行
新規の分析結果を `response` 必須・`tags` 任意の契約へ変更し、`emotion / theme / deepMeaning / confidence` をprovider promptと新規schemaから外した。OpenAIとLocal LLMはJSON schema、Anthropicはtool input schemaで構造を強制し、dry-runと通常分析を同じ正規化経路へ揃えた。旧履歴は `deepMeaning` を本文として読み替え、旧 `theme` / `emotion` はタグ表示・章サマリー集計の互換フォールバックとして保持する。

[2026/07/01]分析履歴へ最小来歴と本文fingerprintを保存
新規の段落分析履歴にAgent ID、実行時表示名、prompt version、contextPolicy、参照段落数、追加指示有無、対象スコープ、使用モデル、結果契約バージョンを保存するようにした。新規履歴では段落本文を `sourceText` として複製せず、本文変更後の互換判定は本文長と安定ハッシュから作る `targetTextFingerprint` で行う。旧 `sourceText` 履歴は引き続き読み込み互換として扱う。

[2026/07/01]分析実行前確認に送信条件を追加し省略設定を保存
分析実行前確認にReading Agent名、対象スコープ、文脈ポリシー、参照段落数、追加指示の有無を追加した。設定画面から確認画面の表示を無効化できるようにし、既定は確認ありのまま維持した。省略時も同じpending run snapshotとconfirm guardを通すため、確認後に本文や文書が変わった場合の実行中止条件は共通で働く。

[2026/07/01]分析実行時の即興追加指示を追加
分析パネルに「今回だけの観点」入力を追加し、保存済みReading Agentを編集せずに、その回の分析だけへ追加指示を添えられるようにした。追加指示はproviderのtarget prompt側へ渡し、OpenAIの共通prefix cacheを汚さない。確認画面と履歴provenanceには追加指示の有無だけを残し、追加指示本文やhashは保存しない。

[2026/06/30]段落別の読みレーンと分析実行の安定化
案Bを本番UIへ移し、本文横の段落別読みレーンと選択段落専用の右インスペクター・追加質問を追加した。試作用画面は削除し、分析の段落単位リトライ、final resultの永続保存、provider不整合なAgent model overrideの実行前検出、OpenAI向けprompt cache prefixの安定化、実provider入力に近い送信量見積もり、同一patternの二重履歴保存防止も入れた。

[2026/06/30]Reading Agentテンプレート運用へ移行
デフォルトReading Agentを初回seedではなくテンプレートとして扱うようにし、新規userDataではAgent 0件から始め、AgentsScreenで任意のテンプレートを明示追加できるようにした。追加後は通常Agentとして保存・編集・削除・選択され、テンプレート更新では上書きされない。旧形式agents.jsonはバックアップ退避後に空リストへ復旧する。

[2026/06/25]#113 Providerモデル候補プルダウン
Settings の OpenAI / Anthropic 既定モデルと、AgentsScreen の個別model overrideを、自由入力だけの欄から2026-06-25時点の公式モデル候補プルダウン + カスタムモデルID入力へ変更した。候補は shared の provider別静的カタログとして持ち、OpenAI は `gpt-5.5` / `gpt-5.4` / `gpt-5.4-mini` / `gpt-5.4-nano`、Anthropic は `claude-opus-4-8` / `claude-sonnet-4-6` / `claude-haiku-4-5-20251001` を表示する。現在使用不可の `claude-fable-5` は候補から除外し、限定・候補外モデルはカスタム入力で保存できる。新規既定は OpenAI `gpt-5.4`、Anthropic `claude-sonnet-4-6`。Local LLM は従来どおり自由入力のまま維持した。検証: `pnpm --filter @litelizard/shared test`、`pnpm --filter @litelizard/desktop test`、`pnpm -w lint`、`pnpm -w build` 成功。

[2026/06/25]#138 Reading Agent単位のコンテキストポリシー
分析コンテキストをグローバル設定からReading Agentの必須フィールドへ移し、AgentsScreenで参照範囲を編集できるようにした。旧Agentはバックアップ退避後に現行デフォルトへ再生成し、通常分析・再分析・dry-run・見積もりがAgentごとの参照範囲を使うようにした。
[2026/06/23]PRレビュー指摘: legacy API DB ignoreを復旧
旧API起動済みの開発環境で生成され得るapps/api/data配下とSQLiteファイルを引き続き未追跡化し、ローカル認証・利用量データが誤って露出しないようにした。
[2026/06/23]#139・#140 未使用のlegacy APIを削除
製品から参照されていないFastify APIと認証・利用量管理・SQLite依存を除去し、標準の開発起動をElectronデスクトップへ統一した。将来のクラウド分析とOAuthは旧実装を流用せず新規設計する方針を記録した。
[2026/06/23]#127・#130 LPのリンクプレビューとサイトアイコン
LiteLizardの価値が伝わる1200×630の共有画像とOpen Graph・Twitter Cardメタ情報を追加し、既存アプリアイコンからfavicon、Apple Touch Icon、Web向けアイコンを整備した。

[2026/06/22]#119 デフォルトReading Agentとプロンプトを刷新
初見の読者、感覚を読む読者、構造編集者、書き続ける伴走者の4体へ更新し、構造編集者には主題・反論・反対視点・暗黙の前提・削除候補まで扱う評価基準を持たせた。

[2026/06/22]#126 分析機能の哲学を形式知化
評価基準をユーザーが所有する原則と、Reading Agent、追加指示、分析粒度、Agent単位の文脈、responseと任意タグ、最小限の履歴を管理するプラットフォーム責務を仕様化した。

[2026/06/20]#122 デザイン判断の暗黙知をDESIGN.mdとして外在化
温かい白、本文限定の明朝体、深い藍、モード駆動の段階的表示、回答文を主役にする分析インスペクターを今後のUI基準として定め、既存の案 A Minimal との優先関係と移行対象を整理した。

[2026/06/18]PR #129 レビュー指摘の修正
フォルダ内に旧形式・不正な文書IDがあっても削除を継続できるようにし、ランディングページのPrivacyリンクを公開元のmainブランチへ統一した。

[2026/06/16]#123 執筆エディタの左余白構造ガター
本文側の段落ハイライトと章タイトル表示を外し、左余白に章レール・DnDハンドル・hover/focus時のみ表示するアラビア数字段落番号を集約したうえで、分析カード番号もアラビア数字へ揃え、本文側の active 段落から分析カードへ自動スクロールする連動を追加した。

[2026/06/15]#90 ヒーローデモの読み手と分析例を具体化
ヒーロー説明文の色を補助テキストへ揃え、分析デモを初読者の展開予想、前文脈とのテーマ接続、編集者による構造的な問題点と修正案の順へ変更した。

[2026/06/15]#90 LPのヒーローと全体組版を整理
ヒーローの補足文と重複する公開状態表示を削り、ダウンロード導線をホバー反転するボタンへ変更したうえで、各セクションの列比率、開始位置、上下余白、境界線を共通規則へ統一した。

[2026/06/15]#90 LPの見出し階層と配色リズムを統一
各セクションの見出しを共通サイズへ揃え、理解・使い方・導入判断・背景と疑問・最終行動のまとまりに沿って明色、濃紺、中間ベージュを切り替える構成へ整理した。

[2026/06/15]#90 LPの訴求・利用例・導入案内を拡充
小説・エッセイ向けに段落単位の観測と書き手のベネフィットを明確化し、固定ダウンロード導線、具体的な利用例、MVP機能とインストール手順、ローカル保存の安心材料、Q&A、最終CTAを1ページ内へ追加した。landing build、workspace lint、1280×800 / 390×844の表示、アンカー位置、段落とReadingの連動、FAQ開閉、横スクロールとコンソールエラーなしを確認した。

[2026/06/13]アプリアイコンを新デザインへ差し替え
トカゲと万年筆が円を描く新しい原画へPNGとmacOS用ICNSを更新し、図柄を92%へ縮小して周囲に均等な余白を追加した。macOSアプリを再パッケージして生成物に同一ICNSが反映されることを確認した。

[2026/06/13]ネイティブ依存とDMG生成環境の復旧
Node切替後のbetter-sqlite3 ABI不一致をAPI起動前に検知して自動再ビルドするようにし、hdiutilの失敗が制限環境によるものと確認して許可済み環境でDMG生成と整合性検証を完了した。

[2026/06/13]#111 リリースバージョンと更新検知の整合
MVP Release 実行番号から再実行時に安定する SemVer をビルド前に設定し、Release 名・本文・配布アプリへ同じ値を反映して、旧版アプリが新リリースを検知できるようにした。

[2026/06/12]PR #110 レビュー指摘の修正
解析中の文書切替による結果混入を防ぎ、フォルダ削除時に配下文書の解析世代も消去し、入力直後でもUndoできるようにした。対象の回帰テスト、desktop全体テスト・lint・buildで検証した。

[2026/06/12]#90 LPに特徴・使い方・開発背景を追加
READMEと公開記事下書きにある問題意識を基に、文章の読まれ方を段落単位で観測する特徴、Reading Agentを使う3ステップ、書く場所と見直す場所を一つにした開発背景をランディングページへ追加した。冒頭・ヘッダー・末尾の3か所から最新版DMGへ進める導線を設け、デスクトップとスマートフォン向けのレスポンシブ表示を整えた。ヒーローの抽象的な本文・分析モックは、実際のアプリ画面を基に、連続した本文と3種類の読みを左右に並べたLP用プレビューへ変更した。本文または読みをクリックすると対応するペアの強調が連動して切り替わる。検証: landingのVite build、workspace lint、デスクトップ/モバイルのブラウザ表示、左右両方からのクリック切替、横方向のはみ出し、console warning/errorなしを確認。

[2026/06/11]#90 ランディングページの最小構成を追加
同一モノレポのapps/landingにLiteLizardのタイトルとmacOS版ダウンロードリンクだけを持つViteサイトを追加し、mainのLP関連変更からGitHub Pagesへ自動デプロイする構成へ切り替えて、旧ブラウザデモのPages公開を終了した。

[2026/06/10]#107 サポート中の Electron へ更新
Electron を34.5.8から42.4.0へ更新し、console-message APIとバイナリ取得方法の変更へ追従した。Node 21でElectronインストーラーがESMエラーになる問題に対してNode 22.12以上を明示し、nvm/nodebrewの対応Nodeを自動選択する起動ラッパーを追加したうえで、全体テスト、macOS arm64のapp・DMG生成、開発起動、packaged smokeを確認した。

[2026/06/10]Ralph Loop 運用を廃止
Issue着手時にRalphチケットを自動作成する指示をAGENTS.md、NOW.md、関連スキルから削除し、Ralph専用プロンプト・スキル・実行スクリプトをold配下へ移して、GitHub Issueをそのまま実装単位として扱う運用へ変更した。

[2026/06/10]#106 macOS の動作確認範囲を明示
MVP の配布対象を Apple Silicon Mac に限定し、macOS Tahoe 26.5.1 のみ動作確認済みでその他のmacOSは未検証・動作保証外であることをREADME、Release workflow、公開中のRelease本文、公開前チェックリストに統一して記載した。

[2026/05/23]#89 軽量更新通知: 右下バナーをやめて歯車バッジ + DMG ダウンロードボタンに置き換え
Issue #89「自動更新」を、署名・notarization 必須のアプリ内自動更新ではなく、最新版検知 + 手動ダウンロード導線として MVP 範囲で実装した。#101 の右下フローティングバナー (`App.tsx` `updateNotice` JSX、`useAppStore` の `updateNoticeDismissed` / `dismissUpdateNotice`、`styles.css` `.update-notice*`) を完全に撤去し、代わりに `LeftIconRail` の歯車ボタンに `updateCheck?.updateAvailable === true` の時だけ表示する **`.rail-icon-badge` の青いドット**（`position: absolute`、約 8px、`box-shadow` で paper 背景に対しコントラスト確保）を追加した。バッジは明示的な dismiss を持たず、次回起動の `checkForUpdates` 再判定だけで消える。`aria-label` / `title` は通常「設定」、バッジ表示中は「設定（新しいバージョンあり）」に切り替えて screen reader 対応。`useAppStore` の `openSettingsPanel` を `(options?: { intent?: SettingsScreenIntent }) => void` に拡張し、明示的な `intent: 'update'` が無くても `updateCheck.updateAvailable` が true なら自動で `pendingSettingsScreenIntent='update'` をセット。`SettingsScreen` は mount 時に `consumeSettingsScreenIntent()` を呼び、`'update'` を取得したら `activeTab` を `'about'` に切り替える。`pendingAgentsScreenIntent` パターンと同形。`SettingsScreen` の「LiteLizard について」タブには既存の `更新を確認` / `GitHub Releases を開く` に加えて **「最新版 .dmg をダウンロード」ボタン**を追加（`updateAvailable === true` の時だけ primary 強調）。押下で新規 IPC `downloadLatestRelease` を経由して `shell.openExternal(RELEASE_DOWNLOAD_URL)` を呼び、ブラウザに `https://github.com/motimotinok/LiteLizard/releases/download/mvp-latest/LiteLizard-latest-arm64.dmg` のダウンロードを開始させる。`packages/shared/src/bridge.ts` `BridgeApi.downloadLatestRelease`、`apps/desktop/src/main/updateChecker.ts` の `RELEASE_ASSET_FILENAME` / `RELEASE_DOWNLOAD_URL` export、`apps/desktop/src/main/ipc.ts` の IPC ハンドラ、`apps/desktop/src/preload/ipcBridge.ts` パススルー、`apps/desktop/src/preload/preloadMockApi.ts` モックも併せて追加。README の「更新の確認」節を歯車バッジ + ダウンロードボタン基準に書き直し。検証: `pnpm --filter @litelizard/shared build` / `pnpm -w lint` / `pnpm --filter @litelizard/desktop test`（312 件 pass、`updateChecker.test.ts` の `RELEASE_DOWNLOAD_URL` 定数 assert と `useAppStore` の `#89 軽量更新通知の歯車バッジ導線` describe 5 件を含む）/ `pnpm -w build` 成功。残課題: 手動 GUI 確認（badge 表示・歯車クリックで About タブが開く・「最新版 .dmg をダウンロード」がブラウザでダウンロードを開始すること・右下バナーが二度と出ないこと）は公開判断時に人間が `docs/release-checklist.md` 経由で実施。アプリ内自動更新（electron-updater + Developer ID 署名 + notarization）は MVP 後対応として #89 のスコープ外。

[2026/05/23]DMG ファイル名のバージョン部を `latest` 固定に変更
LP などから常時最新版へ静的 URL でリンクできるように、`apps/desktop/package.json` の `build.mac.artifactName` を `${productName}-${version}-${arch}.${ext}` → `${productName}-latest-${arch}.${ext}` に変更し、`.github/workflows/release.yml` の DMG 参照パスも `LiteLizard-latest-arm64.dmg` 固定に直した。これで `https://github.com/motimotinok/LiteLizard/releases/download/mvp-latest/LiteLizard-latest-arm64.dmg` が常に最新版を指す。`updateChecker.ts` 側のコード変更は不要（asset 名に semver が含まれなくなった場合、Release body の `v${APP_VERSION}` から拾うフォールバックが既存）。`updateChecker.test.ts` を新命名規則に追随させ、body からの抽出を主シナリオに置く形でテストを更新（13 → 14 件）。README の `<version>` 表記も `latest` 固定 URL に書き換えた。検証: `pnpm --filter @litelizard/desktop test -- updateChecker` で 14 件 pass。残課題: 次回 `workflow_dispatch` 実走でファイル名が `LiteLizard-latest-arm64.dmg` で publish されることを確認する。

[2026/05/23]MVP Release workflow に `@litelizard/shared` ビルドステップを追加
`release.yml` で `pnpm -w build` より前に `pnpm -w test` を走らせていたため、`apps/api` / `apps/desktop` の vitest が dist 未生成の `@litelizard/shared` を解決できず `Failed to resolve entry for package "@litelizard/shared"` で連続失敗していた。`ci.yml` 同様に `Install dependencies` 直後に `Build shared package`（`pnpm --filter @litelizard/shared build`）ステップを追加して、Lint / Run tests / Build workspace の前に shared の dist を用意するようにした。検証: workflow_dispatch 経由の MVP Release 実走で Run tests・package:mac:dmg・Publish GitHub Release が全て成功することを確認する（push 後に gh から実走させる）。

[2026/05/23]ローカル絶対パスを参照していた `.npmrc` を削除し CI/Release を復旧
リポジトリ直下の `.npmrc` に開発機の絶対パス `store-dir=/Users/jane/Library/pnpm/store/v3` がコミットされており、CI の `pnpm/action-setup@v4` ステップが Ubuntu runner 上で `EACCES: permission denied, mkdir '/Users'` で失敗、MVP Release の macos-latest 上でも `jane` ユーザーが存在しないため同様に失敗していた。指定されていた値が macOS の pnpm 既定 store パス（`~/Library/pnpm/store/v3`）と同一だったため、ファイル自体を削除しても開発機の挙動は変わらない判断で `.npmrc` を `git rm` した。検証: 削除前の失敗ログ確認のみ。残課題: 次回 push 後の CI / `workflow_dispatch` での MVP Release 実走で pnpm install 成功と DMG 生成を確認する。ローカルで再度 store-dir を明示したい場合は `~/.npmrc`（ホーム配下）に置く運用にする。

[2026/05/23]GitHub Actions の pnpm セットアップを公式 action に切替
直前の `@v5` 化に伴い CI で `Unable to locate executable file: pnpm` が発生していた問題（`actions/setup-node@v5` + `corepack enable && corepack prepare pnpm@9.12.3 --activate` の経路が新環境で安定して shim を作れていない）を解消するため、`.github/workflows/{ci,release,deploy-pages}.yml` の pnpm セットアップを `pnpm/action-setup@v4` に切り替えた。バージョン指定はルート `package.json` の `packageManager: pnpm@9.12.3` を参照するため不要、`actions/setup-node` には `cache: 'pnpm'` を追加し、`pnpm install` の `--store-dir .pnpm-store` 指定は action 側で管理されるため削除した。検証: workflow YAML 差分の手動確認のみ。残課題: `dev` push 後の CI 実走と Release workflow の `workflow_dispatch` 実走で pnpm 解決成功・DMG 生成成功を確認する。

[2026/05/23]GitHub Actions の Node.js 20 廃止対応
GitHub Actions runner の Node.js 20 廃止予告（2025-09-19 アナウンス）に伴う警告 `Node.js 20 is deprecated. The following actions target Node.js 20 but are being forced to run on Node.js 24` を解消するため、`.github/workflows/{release,ci,deploy-pages,claude}.yml` の `actions/checkout` と `actions/setup-node` を `@v4` → `@v5`（Node.js 24 ネイティブ）に更新し、暫定回避策として置いていた `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: true` 環境変数を `release.yml` / `ci.yml` / `deploy-pages.yml` から削除した。Node 24 ランタイム指定（`actions/setup-node` の `node-version: 24`）と pnpm 9.12.3 corepack 経路は変更なし。検証: workflow YAML 差分の手動確認のみ（CI/Release 実行は次回 push 時に確認）。残課題: `main` への push もしくは `workflow_dispatch` で Release workflow を実走させて、警告が消えること・DMG 添付が成功することを確認する。

[2026/05/22]MVP配布: GitHub Actions Release workflow と軽量更新通知と新規エージェント導線の修正
MVP 公開に向けて 3 本の変更をまとめた。(1) `.github/workflows/release.yml` を追加し、`main` への push と `workflow_dispatch` で macos-latest 上で `pnpm -w lint` / `test` / `build` / `pnpm --filter @litelizard/desktop package:mac:dmg` を順に実行し、固定タグ `mvp-latest`（Release title: `LiteLizard MVP latest`、`permissions.contents: write`、既存 asset を削除してから上書き）に `apps/desktop/release/LiteLizard-<version>-arm64.dmg` を添付する。Release body には未署名 DMG・Apple Silicon Mac 向け・手動更新・README 参照を明記。(2) #101 軽量更新導線として、`BridgeApi` に `getAppVersion` / `checkForUpdates` / `openReleasesPage` を追加し、main プロセス（`apps/desktop/src/main/updateChecker.ts`、5s timeout）が GitHub API の `releases/tags/mvp-latest` を確認、renderer は起動時にチェックして最新版がある場合だけ右下に控えめなバナーを表示する。設定画面に `LiteLizard について` タブを実装し、現在 version 表示・手動 `更新を確認`・`GitHub Releases を開く` を置いた。失敗時はバナーを出さず起動・執筆・分析を妨げない。README に手動更新の説明を追記。(3) AnalysisPane の `新しいエージェントを作成` から AgentsScreen が常に既存 agent を選んで表示されてしまう問題を、store に `pendingAgentsScreenIntent` と `consumeAgentsScreenIntent` を追加し、`openAgentsPanel({ intent: 'new' })` で新規 draft 表示を強制するパターンで修正。サイドバーの `+` ボタン、複製、既存 agent 選択、リセットの挙動は維持。検証: `pnpm --filter @litelizard/shared build` / `pnpm -w lint` / `pnpm --filter @litelizard/desktop test`（305 件 pass、`updateChecker.test.ts` 13 件含む）/ `pnpm -w build` / `pnpm --filter @litelizard/desktop package:mac` + `smoke:package:mac`（`hasRoot:true, hasPreloadBridge:true`）/ `pnpm --filter @litelizard/desktop package:mac:dmg`（`LiteLizard-0.1.0-arm64.dmg` 121MB を確認）成功。残課題: (a) #93 local-llm endpoint 再確認は `http://localhost:11434` 到達不能のため未完了で環境問題として公開判断に回す。(b) `apps/api` の vitest は better-sqlite3 ネイティブモジュールの NODE_MODULE_VERSION ミスマッチで失敗するが、これは今回の変更と無関係なローカル環境問題。(c) 手動 GUI 確認（DMG インストール、初回フォルダ選択、DnD、エクスポート、分析、再起動、新規エージェント導線、更新通知）は `docs/release-checklist.md` 経由で人間が公開判断時に実施。

[2026/05/20]Codex Stop hook を追加
ターン終了時に `CHANGELOG.md`、`NOW.md`、`docs/tickets/` の状態確認を1回だけ促す repo-local Stop hook を追加し、`stop_hook_active` で継続ループを避けるようにした。

[2026/05/20]Issue backlog 中心の運用へ整理
Product Map を退役済み資料へ移し、LLM の入口として `NOW.md` を追加した。GitHub Issues を backlog、`docs/tickets/` を Ralph Loop 実行キューとする方針に合わせて `AGENTS.md`、Ralph Loop prompt、workflow skills を更新した。検証: skill validation、旧 product-map/update-product-map 参照検索、diff whitespace check を実施。

[2026/05/18]macOS アプリアイコンを追加
トカゲのしっぽが鉛筆になっている試作アイコンを `apps/desktop/build/` に追加し、`electron-builder` の macOS icon 設定で packaged app に反映されるようにした。検証: `pnpm --filter @litelizard/desktop package:mac` 成功、生成 `.app` の `Info.plist` と `Contents/Resources/icon.icns` を確認。

[2026/05/14]プロジェクトフォルダ選択の安全確認
フォルダ選択ダイアログで新規フォルダ作成を可能にし、macOS のシステム領域や LiteLizard 内部フォルダを作業場所として拒否して、日本語の理由を表示するようにした。検証: projectManager / ipc / ProjectSetupScreen / useAppStore の追加テスト成功。残課題: Electron 実機の folder picker GUI 確認は未実施。

[2026/05/14]MVP公開前チェックリストを docs/release-checklist.md に整理
LLM が CLI で実行できる自動検証 (`pnpm -w lint` / `test` / `build` / `package:mac` / `smoke:package:mac` / `package:mac:dmg`)、人間が macOS GUI で実行する手動確認 (インストール導線、初回フォルダ選択、段落 DnD、テキストエクスポート、分析実行 overlay、終了/再起動)、公開判断として人間に残る未決事項 (Apple Developer ID 署名 / notarization、自動更新、ランディングページ、Windows / Linux 配布、アプリアイコン #95、Electron E2E 起動 `SIGABRT`、`docs/tickets/2026-05-13-project-folder-selection-safety.md`) を 1 ファイルに分けて整理し、README の Packaging セクション末尾から参照リンクを追加した。検証: `pnpm -w lint` / `pnpm -w test`（desktop 279、shared 57、api 4、e2e 6 skipped）/ `pnpm -w build` / `pnpm --filter @litelizard/desktop package:mac` / `smoke:package:mac` 成功。残課題: 手動 GUI 確認は LLM 側では実施せず、公開判断時に人間が通す前提。

[2026/05/14]本文エディタ段落DnDハンドルの初期表示を修正
Lexical 初期状態から段落構造を即時 snapshot 化して本文段落の DnD ハンドルを初期表示し、portal 配下でも見える配置に直した。検証: `pnpm --filter @litelizard/desktop test -- EditorPane.logic`、`pnpm --filter @litelizard/desktop test -- useAppStore documentOps`、`pnpm -w lint` / `pnpm -w test`（e2e 6 skipped）/ `pnpm -w build` 成功。残課題: Electron E2E は既存の Electron `SIGABRT` で起動できず、実 GUI ドラッグ確認は未実施。

[2026/05/14]フォルダ選択直後の起動画面残りを修正
起動時の前回フォルダ復元が遅れて完了しても、手動で開いたフォルダの ready 状態を古い復元結果で上書きしないようにし、準備中画面には現在の状態メッセージを表示するようにした。検証: `pnpm --filter @litelizard/desktop test -- useAppStore`、`pnpm -w lint`、`pnpm -w test`（e2e 6 skipped）、`pnpm -w build` 成功。残課題: Electron 実機でのフォルダ選択 GUI 確認は未実施。

[2026/05/14]README に未署名 macOS DMG のインストール手順を追加
MVP 公開版の未署名 `.dmg` について、GitHub Releases からのダウンロード、Applications へのコピー、Gatekeeper 警告への安全な対処、初回起動後の API キー / Local LLM 設定導線を README に追加し、SECURITY.md から該当手順へリンクした。検証: README / SECURITY / PRIVACY / DMG 生成済みチケットとの整合確認、`pnpm -w lint` / `pnpm -w test`（e2e 6 skipped）/ `pnpm -w build` 成功。残課題なし。

[2026/05/14]MVP公開用の未署名macOS dmg生成を整備
MVP 公開で GitHub Releases に添付する macOS `.dmg` を生成できるよう、`apps/desktop/package.json` の `build.mac.target` に `dmg` を追加し、新スクリプト `package:mac:dmg`（`electron-builder --mac dmg --publish never`）で `apps/desktop/release/LiteLizard-<version>-<arch>.dmg`（例 `LiteLizard-0.1.0-arm64.dmg`、約 124MB）を出力できるようにした。`dmg.writeUpdateInfo: false` と `dmg.sign: false` を明示して未署名・自動更新なしの MVP 方針と整合させ、既存の smoke 用 `package:mac`（`--mac dir`）と役割を分離。`README.md` の Packaging セクションを両コマンド・出力パス・GitHub Releases 想定ファイル名で書き直し、`smoke-packaged-mac.mjs` の timeout を 30s → 60s（`LITELIZARD_SMOKE_TIMEOUT_MS` で上書き可能）に伸ばした。検証: `pnpm --filter @litelizard/desktop package:mac:dmg` 成功（`.dmg` と `.app` を確認）、`package:mac`（dir のみ）も release クリーン後に成功、`smoke:package:mac` で `[Smoke] packaged app ready: {"hasRoot":true,"hasPreloadBridge":true,...}` を確認、`pnpm -w lint` / `pnpm -w test`（desktop 277、shared 57、api 4、e2e 6 skipped）/ `pnpm -w build` 成功。残課題: ad-hoc 署名 `.app` を別ビルドで上書きすると macOS Keychain ダイアログが出て smoke harness の子プロセス終了が timeout することがあるため、CI 化する際は別途 smoke 安定化が必要。実機 DMG インストール導線整備は `docs/tickets/2026-05-13-readme-macos-install-guide.md` に分離済み。

[2026/05/14]分析実行前確認ダイアログを overlay 化し文言を整理
公開前手動確認で、分析ボタン押下後に表示される確認 UI で「実行する」ボタンが `.analysis-shell { overflow: hidden }` に押し出されて見えず、内部寄りの「コンテキスト本文量」「概算 output 量」などの文言がユーザーに伝わりにくかった問題を解消した。確認ダイアログを `AnalysisRunConfirm` という props 駆動コンポーネントに切り出し、`AnalysisPane` の header 内ではなく `.analysis-shell` 直下の overlay として描画。半透明 backdrop と最大高制限内スクロールで小さいウィンドウでも操作不能にならないようにし、文言を「解析する段落 / 段落本文 / 前後の文脈 / 送信量(概算) / 応答量(概算)」に置き換え、リード文と注意書きを追加した。SSR テスト 4 件で wording、overlay 構造、ロケール表示を固定。検証: `pnpm -w lint`、`pnpm -w test`（desktop 277 件、shared 57 件、api 4 件、e2e 6 skipped）、`pnpm -w build` 成功。残課題: Electron 実機での GUI 手動確認は未実施（公開前検証チェックリストで吸収）。

[2026/05/13]Anthropic 既定分析モデルを Claude Haiku 4.5 に更新
Settings の API キー登録/分析設定画面で Anthropic の既定モデルが旧値のまま表示される原因が、共有既定設定 `DEFAULT_ANALYSIS_SETTINGS` と保存済み analysis settings の旧値維持にあったため、既定モデルを `claude-haiku-4-5-20251001` に更新し、旧既定値 `claude-3-5-sonnet-latest` と短い placeholder `claude-haiku-4-5` は読み込み/保存時に新 API ID へ移行するようにした。検証: `pnpm --filter @litelizard/desktop test -- analysisSettingsStore preloadMockApi`、`pnpm --filter @litelizard/shared test -- api`、`pnpm -w lint`、`pnpm -w test`、`pnpm -w build` 成功。

[2026/05/13]LLM provider 返却用 JSON schema の共通化
OpenAI structured output と local-llm / Ollama `format` が同じ `emotion` / `theme` / `deepMeaning` / `confidence` の provider 返却用 schema を使うようにし、Ollama には schema 指定後も既存の JSON parse / normalize 経路を残した。検証: `pnpm --filter @litelizard/desktop test -- apiBridge`、`pnpm -w lint`、`pnpm -w test`、`pnpm -w build` 成功。実 API は OpenAI `gpt-4.1-nano`、Anthropic `claude-haiku-4-5-20251001`、local-llm `gemma4:e2b` で成功。

[2026/05/13]公開前プライバシー・セキュリティ文書の正確性確認
`README.md` / `PRIVACY.md` / `SECURITY.md` を現行実装と MVP 公開方針に合わせ、テキスト import/export、Reading Agent dry-run、Local LLM の API キー非使用、未署名 `.dmg` 配布と署名・notarization・自動更新の MVP 後対応を正確に記述した。

[2026/05/12]配布パッケージのGUI起動確認とpreload ESM/CJS不整合修正
パッケージ済み `.app` の smoke 起動を試したところ、preload が `ERR_UNSUPPORTED_ESM_URL_SCHEME` で失敗し renderer から `window.litelizard` も `document.getElementById('root')?.childElementCount` も取れない状態だったため修正した。原因は `apps/desktop/package.json` の `"type": "module"` の下で `preload.cts`（CJS 出力 `.cjs`）が `import { createIpcBridge } from './ipcBridge.js'` していたため、Node が `.js` を ESM として解決し、ESM 側の `from 'electron'` が sandbox preload に注入される `electron:` URL を弾いていたこと。preload を tsc 出力ではなく esbuild の単一 CJS バンドルに切り替え、`@litelizard/desktop` の devDep に `esbuild` を追加、`tsconfig.preload.json` は型検査専用（`noEmit`）に変更し、`build:preload` と `dev:preload` を esbuild に置換した。検証: `pnpm --filter @litelizard/desktop package:mac` 成功、`pnpm --filter @litelizard/desktop smoke:package:mac` が `[Smoke] packaged app ready: {"hasRoot":true,"hasPreloadBridge":true,...}` で成功し packaged app の renderer 初期画面（「LITELIZARD / 準備中 / 前回の作業フォルダを確認しています。」）と preload bridge `window.litelizard.openFolder` の存在を packaged binary 実行で確認、`pnpm -w lint` / `pnpm -w test`（desktop 267 件、shared 57 件、api 4 件、e2e 6 skipped）/ `pnpm -w build` 成功。残課題: Finder ダブルクリックでの GUI 経路は手元 macOS 環境での最終確認が望ましい（packaged binary 実行で renderer + preload は確認済み）。

[2026/05/12]デスクトップ配布パッケージの最小設定
公開準備として `electron-builder` による macOS 向け `LiteLizard.app` 生成コマンドを追加し、成果物に main / preload / renderer の build 出力と production dependency だけを含めるよう配布設定と README を整えた。検証: `pnpm --filter @litelizard/desktop package:mac`、app.asar 内容確認、`codesign --verify --deep --strict`、`pnpm -w lint` / `pnpm -w test` / `pnpm -w build` 成功。残課題: Codex シェルでは macOS LaunchServices 経路が Calculator でも `kLSNoExecutableErr` になるため、生成 `.app` のGUI起動確認は人間の通常デスクトップ操作で別途確認が必要。

[2026/05/12]起動と前回ディレクトリ復元の保存先挙動
公開前タスクとして、起動時の前回フォルダ復元と書き込み可否確認を整理した。`projectManager.assertProjectWritable` を追加し、`.litelizard/.write-probe-<pid>-<rand>` を書き込み・即削除して `.litelizard/` への書き込み可否を実プローブで判定する。`ensureProject` の既存プロジェクト経路と `listTree` IPC ハンドラで呼ぶことで、新規 / 復元の両方でアクセス権限を検出できるようにした。`main/appStore.removeRecentProject` を「対象パスが `lastOpenedFolder` と一致する場合は `lastOpenedFolder` も null にする」よう拡張し、renderer の `restoreLastProject` は復元失敗時に `removeRecentProject(failedPath)` を呼んで Recent と `lastOpenedFolder` を整合させる。これにより削除済み・権限不足のフォルダを再起動のたびに繰り返し試す状態を防ぐ。仕様は `docs/specs/project-management.md` §5–§9 を更新し、決定経緯を `docs/decisions.md` に追記。検証: 追加 / 既存テスト（projectManager / main appStore / renderer useAppStore / ipc）、`pnpm -w lint` / `pnpm -w test`（desktop 260 件、shared 49 件、api 4 件、e2e 6 skipped）/ `pnpm -w build` 成功。残課題: Electron 実機での復元失敗導線の手動確認は未実施、Windows 向け読み取り専用書き込みプローブのテストは別途。

[2026/05/12]作成文章のテキストエクスポート
現在開いている `.lzl` 文書を、documentId や paragraphId、analysis 情報を含まないプレーンテキストとして保存ダイアログ経由で外部ファイルへ書き出せるようにした。検証: `pnpm -w lint` / `pnpm -w test`（shared 49 件、desktop 253 件、api 4 件、e2e 6 skipped）/ `pnpm -w build` 成功。残課題: Electron 実機での保存ダイアログ手動確認は未実施。

[2026/05/12]SECURITY.md を追加
ルートに `SECURITY.md` を追加し、外部公開前に脆弱性報告方法、公開初期のサポート対象、Electron IPC / API キー保存 / ローカルファイル / 外部 provider 送信の安全上の前提を実装事実ベースで確認できるようにした。README に「セキュリティ」セクションを追加して `SECURITY.md` への導線を整備。検証: `pnpm -w lint` / `pnpm -w test`（desktop 249 件、shared 46 件、api 4 件、e2e 6 skipped）/ `pnpm -w build` 成功。残課題なし。

[2026/05/12]PRIVACY.md を追加
ルートに `PRIVACY.md` を追加し、LiteLizard のデータ取り扱いを現行実装の事実ベースで説明できるようにした。原稿はユーザー選択フォルダ配下、分析結果は `<projectRoot>/.litelizard/analysis/` 配下、設定と API キーは Electron userData 配下（`safeStorage` 可なら `api-keys.bin` で暗号化、不可なら `api-keys.plaintext` で平文）に保存されること、分析実行時のみ OpenAI / Anthropic / ユーザー設定 Local LLM endpoint に本文・前段落・system prompt を送信すること、LiteLizard 自体のサーバーは存在せず telemetry / analytics SDK も組み込まれていないことを記述した。README に「プライバシー」セクションを追加して `PRIVACY.md` への導線を整備。検証: `pnpm -w lint` / `pnpm -w test`（desktop 249 件、shared 46 件、api 4 件、e2e 6 skipped）/ `pnpm -w build` 成功。残課題なし。

[2026/05/12]MIT ライセンスを追加
ルートに `LICENSE`（MIT License, Copyright (c) 2026 motimotinok）を追加し、外部公開時の利用条件を明確にした。著作権者名は git author の `motimotinok` を採用。README に「ライセンス」見出しを追加して `LICENSE` と既存の bundled font 用 `apps/desktop/src/renderer/assets/fonts/LICENSES.md`（SIL Open Font License 1.1）への導線を分けて示し、MIT 本文と OFL 1.1 が独立した著作物であることが分かるようにした。検証: `pnpm -w lint` / `pnpm -w build` / `pnpm -w test`（desktop 249 件、shared 46 件、api 4 件、e2e 6 skipped）成功。残課題なし。

[2026/05/07]Ralph Loop の上限回数制御
`ralph-loop.sh` のバッチ内フェーズ数をチケット枚数ではなく `RALPH_TOTAL_LIMIT` 固定で回すようにし、LLM の使用上限などで途中停止した未完了チケットを次フェーズ/次バッチで拾い直せるようにした。各バッチ/フェーズ開始時に `docs/tickets/` 直下の Markdown が存在しなければ全処理を終了する。検証: `bash -n ralph-loop.sh` と dry-run でチケットなし即終了、チケットあり時の上限回数実行を確認。

[2026/05/07]update-product-map スキル追加と read-github-issues 削除
GitHub Issue を現役キューから外した運用に合わせて `read-github-issues` スキルを削除し、思いつき・将来方向・チケット化前の判断テーマを `docs/product-map.md` に整理する `update-product-map` スキルを追加した。product-map をタスク台帳化せず、実装は `create-ralph-ticket`、完了履歴は `update-changelog` に分ける制約を明記した。検証: スキル一覧と参照検索で削除・追加後の構成を確認。

[2026/05/07]update-changelog スキルへ改名
WBS 更新を含んでいた旧 `update-wbs-changelog` スキルを `update-changelog` に改名し、内容を `CHANGELOG.md` 先頭追記専用に整理した。WBS や他の台帳は更新しない制約を明記し、関連スキルと退役済み agent-pickup プロンプトの参照も新名へ更新した。検証: スキル参照検索と差分レビューで旧スキル名の現役参照が残らないことを確認。

[2026/05/07]NOW.md 廃止と product-map 集約
更新漏れしやすい現在地スナップショットとしての `NOW.md` を廃止し、全体像・思いつき・チケット化前の判断テーマを `docs/product-map.md` に集約した。`AGENTS.md`、`prompts/ralph-loop.md`、Issue確認スキルの参照順も product-map 起点に更新した。検証: 参照検索と `git diff --check` で `NOW.md` の現役参照が残らないことを確認。

[2026/05/07]開発フローを Ralph Loop 中心へ移行
WBS と Issue pickup 運用を退役扱いにし、`docs/old/wbs.md` と `prompts/old/agent-pickup.md` へ移動した。現役の全体像は `docs/product-map.md`、実装キューは `docs/tickets/`、実行プロンプトは `prompts/ralph-loop.md` に整理した。検証: 参照検索と差分レビューで旧パスの現役参照が残らないことを確認。

[2026/05/07]R-17 エディター Tweaks 切替 UI
SettingsScreen のエディタタブから明朝/ゴシック、本文サイズ、行間、黄ばみ強度、分析パネルの横並び/オーバーレイを保存できるようにした。既存の設定保存 IPC に `editorTweaks` を追加し、renderer は CSS 変数でエディター本文と分析パネル配置へ反映する。検証: 追加 settings store / preload mock / renderer store / SettingsScreen SSR tests、`pnpm -w lint` / `pnpm -w test`（desktop 249 件、shared 46 件、api 4 件、e2e 6 skipped）/ `pnpm -w build` 成功。残課題: Electron 上での手動表示確認は未実施。

[2026/05/07]R-13 エクスプローラー DnD ファイル移動
Explorer の `.lzl` ファイルをフォルダへドラッグして移動できるようにし、main / preload / renderer store / mock bridge に `moveEntry` IPC を追加した。移動先同名ファイルは上書きせず拒否し、プロジェクト外や別 project root への移動も拒否する。開いている文書を移動した場合は `currentFilePath` と document source を新しい保存先へ更新し、解析 sidecar も同時に移動する。検証: 追加 IPC / preload / mock / store tests、`pnpm --filter @litelizard/shared build`、`pnpm --filter @litelizard/desktop test -- ipc ipcBridge preloadMockApi useAppStore`、`pnpm -w lint` / `pnpm -w test`（desktop 243 件、shared 46 件、api 4 件、e2e 6 skipped）/ `pnpm -w build` 成功。残課題: Electron 上の手動ドラッグ操作確認は未実施。

[2026/05/07]R-22 Web フォントのローカル同梱
renderer の Google Fonts 依存を外し、Shippori Mincho / Noto Sans JP 相当 / IBM Plex Sans / JetBrains Mono のローカル font asset とライセンス記録、回帰テストを追加した。オフラインでも仕様上のタイポグラフィを保つための変更。検証: fontAssets test、`pnpm -w lint` / `pnpm -w test`（desktop 240 件、shared 46 件、api 4 件、e2e 6 skipped）/ `pnpm -w build` 成功。残課題なし。

[2026/05/07]R-20 現在の文書内検索画面
左メニューの検索ボタンを有効化し、現在開いている文書の title / chapter title / paragraph text を対象にした検索画面を追加した。検索結果は段落単位で表示し、クリックするとエディターへ戻って対象段落を active にし、既存のスクロールリクエスト経路で該当段落へ移動する。空検索・該当なし・文書未選択の表示も整えた。検証: `searchInDocument` helper / SearchScreen / store action のテスト追加、`pnpm -w lint` / `pnpm -w test`（desktop 237 件、shared 46 件、api 4 件、e2e 6 skipped）/ `pnpm -w build` 成功。残課題: プロジェクト全体検索、ファイル名検索、正規表現検索、置換は非ゴール。

[2026/05/07]R-07 章サマリー解析表示（マクロ視点時の分析ペイン）
マクロ視点（`viewScale === 'macro'`）のときの AnalysisPane を、段落カードの代わりに章ごとのサマリーカードに切り替えた。集約ロジックは renderer 内 `apps/desktop/src/renderer/utils/chapterAnalysisAggregation.ts` に純関数 `aggregateChapterAnalyses` として切り出し、章ごとに段落数・解析済み / 要再解析 / 未解析 / 解析中 / 失敗の内訳、`complete` 段落から集計した上位テーマ・感情、`confidence` 平均（`complete` 段落のみ）を返す。未解析は `status === 'stale'` かつ `analyzedAt` 未設定で判定する。表示は `apps/desktop/src/renderer/components/ChapterSummaryList.tsx` に分離して props だけで描画できるようにし、AnalysisPane 側は `viewScale` を `useAppStore` から購読してボディだけを差し替える。新規 LLM 章解析は呼び出さない。helper の単体テスト 7 件と ChapterSummaryList の SSR テスト 5 件を追加。検証: `pnpm -w lint` / `pnpm -w test`（desktop 222 / shared 46 / api 4）/ `pnpm -w build` 成功。残課題: Electron 上の手動表示確認は未実施。

[2026/05/06]R-21 段落と分析カードの fade highlight 連動
段落と分析カードの対応関係を hover / focus で相互に示す共有ハイライト状態を追加した。editor 側は Lexical の段落 DOM に paragraphId 対応の hover / focus リスナーと控えめな左罫線表示を付与し、AnalysisPane 側は対応カードに `analysis-card-linked-highlight` を付ける。active / stale / dragging 表示を優先する CSS にして既存表示と競合しないようにした。検証: 追加 static render test、`pnpm -w lint` / `pnpm -w test`（shared 46 件、desktop 210 件、api 4 件、e2e 6 skipped）/ `pnpm -w build` 成功。残課題: Electron 上の手動 hover 確認は未実施。

[2026/05/06]Ralph API キー設定経路の補完
API キー未設定時に AnalysisPane から設定画面へ進める導線を静的レンダリングテストで固定し、SettingsScreen のローカル LLM 入力欄直下にも保存ボタンを追加した。OpenAI / Anthropic の API キー保存、既定 provider / model、ローカル LLM 設定の現行 IPC / store 経路は既存実装と関連テストで確認。検証: 関連 targeted test / `pnpm -w lint` / `pnpm -w test`（desktop 209 件、shared 46 件、api 4 件、e2e 6 skipped）/ `pnpm -w build` 成功。残課題なし

[2026/05/06]R-15 DnD 並び替えを Undo/Redo 対象にした
段落 DnD（`DragHandlePlugin`）と章 DnD（`MacroView`）を `pushUndo` 経由で Undo/Redo 履歴に乗せた。段落 DnD は editor が mount されているため Lexical state と document の両方を保存し、`editor.update` には `tag: 'structural'` を付けて UndoPlugin の auto-snapshot 重複を防ぐ。章 DnD は macro view で Lexical が unmount されているため document スナップショットのみ保存し、Undo 時は `applyDocumentToLexicalRoot` で document から Lexical を再構築する（`MicroEditorView.initialConfig.editorState` と共通化）。MacroView に macro 専用の Ctrl+Z / Ctrl+Y キーハンドラを追加し、編集系フォーカス時はネイティブ Undo に譲る。`UndoSnapshot.lexicalStateJson` を optional に変更し、`UndoPlugin` の UNDO/REDO ハンドラは `applySnapshotToEditor` で lexicalStateJson の有無に応じて `setEditorState` / 再構築を切り替える。`useAppStore.test.ts` に段落 DnD undo、章 DnD undo（chapterId 整合）、undo→redo 往復、lexicalStateJson 省略パスの 4 ケースを追加。検証: `pnpm -w lint` / `pnpm -w test`（207/207）/ `pnpm -w build` 成功。残課題: Electron 上の手動確認は未実施。Undo 時の analysis 履歴復元は既存制約（restoreSnapshot は managed doc の解析状態をリセット）通りで、本チケットでは触らない。

[2026/05/06]R-19 Recent files 永続化
ウェルカム画面でモック表示のみだった最近フォルダリストを永続化した。`app-store.json` の schema に `recentProjects` を追加し、`setLastOpenedFolder` 経由で重複排除＋先頭追加＋件数上限 10 件を保つ純粋ヘルパー (`appendRecentProject`) を `apps/desktop/src/main/recentProjects.ts` に切り出して unit test で固定。`getRecentProjects` IPC は `fs.stat` でディレクトリ存在を判定し `exists` フラグ付きで返す。`removeRecentProject` IPC を追加し、renderer の `useAppStore` は `hydrateProject` 成功後と `restoreLastProject` の `needs-project` フォールバック時に最近リストを refresh、`openRecentProject` 失敗時は対象を自動的にリストから除外する。`ProjectSetupScreen` に既存の `welcome-recent-*` スタイルを使った最近リスト UI を実装し、存在しないエントリは薄表示でクリックすると除外する。検証: `pnpm -w lint` / `pnpm -w test`（203/203）/ `pnpm -w build` 成功。残課題: `.lzl` ファイル単位の最近リストはスコープ外。

[2026/05/06]R-08 全体解析の成功/失敗件数表示
全体解析の完了後に対象段落数、成功件数、失敗件数を renderer store の `analysisRunSummary` と AnalysisPane の静かな件数表示で確認できるようにした。結果が返らなかった対象段落は失敗扱いにし、progress や final response で成功した段落の解析結果は残す。0 件時も summary と status message を更新する。`useAppStore.test.ts` に成功、一部失敗、対象0件の回帰テストを追加。検証: `pnpm --filter @litelizard/desktop test -- useAppStore` / `pnpm -w lint` / `pnpm -w test` / `pnpm -w build` 成功。残課題なし

[2026/05/06]personaMode の .lzl 読み込み既定値を現行仕様に合わせた
`.lzl` v1 は `personaMode` を保存せず、Reading Agent が新しい読者選択の正規入力である方針に合わせて、`.lzl` から `LiteLizardDocument` へ変換する際の互換用既定値を `friendly` から `general-reader` に変更した。`docs/specs/reading-agent.md` に `.lzl` へ personaMode を新規永続化しないことと、active Reading Agent を上書きしないことを追記。converter の回帰テストを追加し、`pnpm --filter @litelizard/shared test -- converter` / `pnpm --filter @litelizard/shared test` / `pnpm -w lint` / `pnpm -w test` / `pnpm -w build` で確認。残課題なし

[2026/05/06]R-10 分析モード選択 UI スタブを追加
AnalysisPane に「段落 / 章 / 全体」を選べる segmented control を追加し、選択状態を renderer store の `analysisMode` として保持するようにした。章 / 全体は将来実装のスタブとして選択だけ可能にし、既存の段落解析実行は段落モード時のみ従来通り動くようにした。`useAppStore.test.ts` に mode 切替の回帰テストを追加。検証は `pnpm -w lint` / `pnpm -w test` / `pnpm -w build` 成功。残課題: 章解析・全体解析の実行ロジックは後続タスク。

[2026/05/06]R-12 分析カードクリック時アニメーション改善
分析カードの active 表示に短い pulse と控えめな内枠を追加し、クリック直後に選択されたことが分かるようにした。stale 表示と active 左罫線が重ならないよう stale 側を少し内側へ逃がし、`prefers-reduced-motion` では animation / transition を止める。表示状態だけの小変更のためテスト追加はせず、差分レビューと `pnpm -w lint` / `pnpm -w test` / `pnpm -w build` で確認。残課題なし

[2026/05/06]Issue #65 preload mock 解析ストアの仕様を回帰テストで固定
`apps/desktop/src/preload/preloadMockApi.ts` の `loadAnalysis` / `saveAnalysisResult` / `createAnalysisGeneration` は既に `documentId` ごとに `GenerationalAnalysisFile` をインメモリで保持し、main 側 `analysisStore.ts` の最新世代返却・パターン追記・世代インクリメント＋空 paragraphs と整合する実装になっていた。Electron dev + mock モードでの解析 UI 回帰確認を支えるため、`preloadMockApi.test.ts` に「保存前の null」「同一段落への複数 pattern 蓄積」「異なる documentId 独立」「戻り値の deep clone」「世代インクリメントで paragraphs リセット」「未保存 documentId でも generation:1 から」の 6 ケースを追加。実装は無変更。`pnpm -w lint` / `pnpm -w test` / `pnpm -w build` 成功。残課題なし

[2026/05/06]T-04 章削除・段落統合のエッジケーステストを整備
`docs/specs/chapter-paragraph-ops.md` のエッジケース表に対応するテストを追加した。store 層では `deleteChapterFromDocument` の通常ケース（前章末尾への吸収＋ stale 化）、先頭章削除時の無題章生成、唯一章削除、空章削除（先頭・中間・唯一）、未知 ID の no-op を `documentOps.test.ts` に 8 件追加。Lexical Plugin 層では Backspace の判定（先頭章 no-op、非先頭章タイトルの格下げ、章境界 no-op、同一章内段落統合、非 collapsed/非段落先頭の pass-through）と隣接段落テキスト結合を `editor/utils/backspaceMerge.ts` に純粋関数として切り出して `backspaceMerge.test.ts` で 12 件確認。`ChapterCommandPlugin` は同 helper を呼ぶ最小リファクタに留め、判定順序・ undo push・ Lexical 操作は変えていない。`pnpm -w lint` / `pnpm -w test`（desktop 178 件・shared 44 件・api 4 件）/ `pnpm -w build` 成功。残課題: Lexical エディター上での手動 / Electron 統合テストはチケット範囲外。

[2026/05/06]WBS L-09/T-05 整合性更新
L-09 分析コンテキストポリシー切替と T-05 回帰テストは実装済みだったため、WBS の状態・完了メモ・集計を実態に合わせて更新した

[2026/05/06]L-09 分析コンテキストポリシー切替を実装
解析時の前段落コンテキストを `scope: document/chapter` × `limitMode: none/lastN` の組み合わせで切替できるようにした。`AnalysisContextPolicy` を shared 型に追加し、`AnalysisSettings.contextPolicy` で既定値 `{document, lastN, 10}`（従来挙動）として保存。`buildContextTexts` を policy 受け取りに拡張、`apiBridge.runAnalysis` / `dryRunReadingAgent` で main 側 settings を伝搬、renderer の `toAnalysisParagraphInput` に `chapterId` を追加、SettingsScreen に分析コンテキスト UI を追加。`AnalysisParagraphSchema.chapterId` は optional で互換維持し、欠落時は document scope に fallback。回帰テストは settings store 3 件、buildContextTexts 4 件、ipc 引数検証 2 件を追加。仕様 `docs/specs/analysis-api.md` §2.1 を「将来拡張」から実装済みに書き換え。残課題: トークン上限ベースの自動 trim、UI の disabled スタイル整備

[2026/05/06]Issue #64 analysisStore の競合書き込み対策
`saveAnalysis` の一時ファイル名を `${pid}.${randomUUID()}.tmp` に変えて並行保存時の rename 競合と `ENOENT` を回避し、`appendParagraphPattern` / `createGeneration` を `(projectRoot, documentId)` 単位の Promise チェーンで直列化してロストアップデートを防いだ。同一段落への 10 並列 append、異段落並列、`saveAnalysis` 並列、`createGeneration` 並列の 4 シナリオを vitest で追加。残課題: 複数プロセス間ロックは未対応（Electron 1 プロセス前提）

[2026/05/05]GitHub Actions CI 修正
Reading Agent 追加で `AnalysisRequestSchema` に `agentId` が必須になった一方、API 統合テストの payload と API 成功レスポンスが古い契約のままだったため、CI の `apps/api` テストが validation error で失敗していた。テスト payload と `/v1/analysis/paragraphs` 成功レスポンスを `agentId` 付きに揃え、`pnpm test` / `pnpm build` で確認した

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
