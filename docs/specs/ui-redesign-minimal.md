# UI リデザイン仕様（案 A Minimal）

**状態**: stable（2026-04-25 採用） / **関連タスク**: R-16 / **関連 decisions**: [2026-04-25 UI 全面刷新](../decisions.md)

---

## 採用方針

iA Writer 寄りの極めて静謐な執筆 UI を採用する。色彩・装飾は最小限、本文タイポと罫線で構造を示す。

- 静けさを最優先する
- 古紙の黄ばみをベース、深い藍を唯一のアクセント
- 段落 ↔ 分析カードの対応関係は、本文側の強い装飾ではなく分析パネル側の強調とスクロール連動で示す
- 主要操作（解析実行）以外は罫線・テキストリンクで控えめに表現
- macOS で「自然なデスクトップアプリ」に見える振る舞いにする

## デザイントークン

| token | 値 | 用途 |
|---|---|---|
| `--paper` | `oklch(98% 0.012 88)` | 基本ペーパー（ベージュ寄り） |
| `--paper-soft` | `oklch(96.5% 0.014 86)` | 沈んだ面（パネル境界・ホバー） |
| `--paper-soft-strong` | `oklch(94.8% 0.018 84)` | 選択ハイライト |
| `--ink` | `oklch(28% 0.012 80)` | 本文テキスト |
| `--ink-2` | `oklch(45% 0.012 80)` | 副次テキスト |
| `--ink-3` | `oklch(62% 0.012 80)` | メタ情報・アイコン基調 |
| `--ink-4` | `oklch(78% 0.012 80)` | プレースホルダ・薄い番号 |
| `--rule` | `oklch(91% 0.014 84)` | 通常罫線 |
| `--rule-strong` | `oklch(85% 0.016 82)` | フォーム枠線 |
| `--accent` | `oklch(40% 0.10 250)` | 深い藍（唯一のアクセント） |
| `--accent-soft` | `oklch(92% 0.04 250)` | 藍の弱バリアント（バッジ背景） |

タイポ:
- `--serif`: `"Shippori Mincho", "游明朝", YuMincho, "Hiragino Mincho ProN", serif`
- `--ui-font`: `-apple-system, BlinkMacSystemFont, "Hiragino Sans", "Yu Gothic Medium", "Noto Sans JP", system-ui, sans-serif`
- `--mono`: `"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace`
- `--sans`: `"IBM Plex Sans", "Noto Sans JP", -apple-system, ...`（Tweaks 用に予約。本実装では未使用）

ジオメトリ:
- icon rail: `44px`
- sidebar: `232px`
- analysis panel: `380px`
- 本文 max-width: `640px`（左右 padding `56px`）
- 角丸: `3〜4px`
- 影: 使用しない（罫線で構造を示す）

## レイアウト

```
┌────────────────────────────────────────────────────────────────────┐
│ traffic lights (macOS hiddenInset)                                  │
│                                                                     │
│ 44px  │ 232px      │ 1fr (main)                  │ 380px (panel)    │
│ ───── │ ────────── │ ─────────────────────────── │ ──────────────── │
│ 📁     │ Workspace  │  ┌──── titlebar (44px) ──── │ Reading Agent ▾  │
│ 🤖     │ ▸ pakira   │  │     pakira.md — 下書き  │ ─────────────────│
│ 🔍     │ ▸ notes    │  │                  [▢]   │ [ 段落を読ませる ] │
│       │ ▸ drafts   │  └─────────────────────── ──│ ─────────────────│
│       │            │                             │ 一  86            │
│       │            │      緑の衝動               │ 緊張・予兆       │
│       │            │      ────                  │ うまくいかなか…   │
│       │            │                             │                  │
│       │            │   一  朝、ベランダに…       │ 二  88            │
│       │            │                             │ 始まり・衝動     │
│ ⚙       │ essays / 4 │                             │                  │
└────────────────────────────────────────────────────────────────────┘
```

## 画面ごとの仕様

### 執筆画面（コア画面）
- タイトルバー: 中央寄せ・`12.5px UI font`、ファイル名 + 区切り（`—`）+ ステータス（下書き / 保存済み）
- 表題ヘッダ（`<header class="editor-title">`）: `serif 28px / weight 500 / letter-spacing 0.12em`、下に `width 24px / height 1px / ink-3` の細罫
- 段落番号: エディタ左余白では半角アラビア数字。通常時は非表示、段落 hover / focus / dragging 時だけ表示する
- 構造ガター: 本文左余白に章レール、DnD ハンドル、段落番号を集約し、本文行そのものへ強い背景・罫線を付けない
- 段落ホバー: 本文背景や左罫線では強調しない。右側の分析カード連動と左余白ガターの表示で対応関係を示す
- ドラッグハンドル: 段落番号よりさらに左側に置き、hover / focus / dragging 時に表示する
- 章表示: 本文上の章タイトル行は表示せず、章のまとまりは左余白の薄い章レールと小さな章番号で示す
- フッター（保存ドット・文字数）は撤去。保存状態はタイトルバーに 1 行で出す
- ステータスバー（モード／視点／ヒント）も撤去

### 分析パネル
- 上部にセクションラベル `READING AGENT` + Agent ドロップダウン（モック 4 種）+ 「新しいエージェントを作成」リンクで `agents` 画面へ遷移
- 主要ボタン: `段落を読ませる`（藍背景）。`runAnalysis()` を呼ぶ。
- カード:
  - アラビア数字番号 + 確度（mono 10.5px、0–100）
  - タグは下線のみ・色なし（emotion color hash は撤去）。区切りはドット (`·`)
  - 本文 `serif 12.5px / line-height 1.75`
  - アクティブ時に左 2px 藍縦線、`paper-soft` 背景
  - ステイル時は左 2px 黄帯（`oklch(70% 0.10 70)`）
  - `+/−` で全文展開、`↺` で再解析、`< 1/3 >` で履歴ナビ

### 設定画面
- 左 rail + 232 サイドバー + 中央 main の `AuxShell` 構造
- サイドバー: 6 タブ（分析エンジン / エージェント / エディタ / 外観 / キーボード / LiteLizard について）。タブの先頭に漢数字 prefix
- メインは `max-width 720px`、`CenteredHeader` + `Section` (一・二・三 ラベル) + `Row` (160px ラベル + 1fr フィールド) 構造
- 「分析エンジン」のみ実装、他はプレースホルダ「この項目は今後追加されます。」

### 分析エージェント管理画面（新規）
- 左 rail + 232 サイドバー + 中央 main
- サイドバーに 4 件のエージェント（漢数字 + 明朝名 + UI font 補足）
- メイン: 中央寄せヘッダ + 3 セクション「役割」「プロンプト（mono）」「モデル設定」
- 「保存」「サンプルで試す」ボタンは UI のみで `disabled`、永続化・適用は後続タスク

### ウェルカム画面
- 左 rail + メイン（サイドバー無し）
- `CenteredHeader (overline=LiteLizard, title=静かに、段落の手応えを)`
- 「フォルダを開く」主要ボタン
- 「最近」リストはモック先行スコープのため、現実装では非表示。`rootPath` ベースの履歴は別タスクで実装

## キーボード
- `Cmd/Ctrl + S`: 即時保存
- `Cmd/Ctrl + Shift + A`: 分析パネル開閉
- `Cmd/Ctrl + Wheel`: ミクロ／マクロ表示切替
- ステータスバーのモード切替（旧 `Cmd+Shift+M`）は廃止

## 漢数字ヘルパ
- `apps/desktop/src/renderer/components/ui/kanji.ts`
- `toKanjiIndex(n)` は 1〜9 を `一〜九`、10 を `十`、11〜19 を `十一〜十九`、20〜99 を `二十〜九十九` に変換。0 や 100 以上、整数でない値は半角アラビア数字を返す。

## アーキテクチャ

```
apps/desktop/src/renderer/
├─ App.tsx                         # WorkspaceShell（44+232+1fr グリッド）
├─ index.html                      # Google Fonts preconnect + link
├─ styles.css                      # トークン + 全コンポーネントスタイル
├─ store/useAppStore.ts            # WorkspacePanel: 'editor'|'settings'|'agents'
├─ components/
│  ├─ LeftIconRail.tsx             # 4 ボタン構成 + 藍縦線
│  ├─ ExplorerPane.tsx             # Workspace ラベル + ツリー + フッタメタ
│  ├─ AnalysisPane.tsx             # Reading Agent + 段落を読ませる + カード
│  ├─ ProjectSetupScreen.tsx       # ウェルカム画面
│  ├─ SettingsScreen.tsx           # 漢数字タブ + Section/Row
│  ├─ AgentsScreen.tsx             # 新規（モック）
│  ├─ editor/
│  │  ├─ index.tsx                 # editor-title + footer 撤去
│  │  ├─ EditorEmptyState.tsx      # 案 A 風空状態
│  │  └─ plugins/StructureChromePlugin.tsx  # 漢数字 data-attribute
│  └─ ui/
│     ├─ icons.tsx                 # lucide 風 1.25px stroke
│     ├─ AuxShell.tsx              # 補助画面共通シェル
│     ├─ CenteredHeader.tsx        # overline + 中央タイトル + 細罫
│     ├─ kanji.ts                  # toKanjiIndex
│     └─ agents.ts                 # READING_AGENTS モック
```

## スコープ外（後続タスク）
- Tweaks（明朝/ゴシック切替、本文サイズ、行間、黄ばみ強度、パネル横並び/オーバーレイ）
- Reading Agent の永続化・プロンプト実行への反映
- Recent files の永続化
- 検索画面の中身
- 本文側を強く装飾する段落 ↔ パネル連動の fade highlight アニメーション
- Web フォントのローカル同梱（オフライン対応）
