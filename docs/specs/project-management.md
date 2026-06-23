# プロジェクト管理フロー仕様

関連タスク: S-04
決定経緯: `docs/decisions.md` [2026-03-28] S-04

---

## 1. 概要

LiteLizard はフォルダベースのプロジェクト管理を採用する。1つのフォルダ = 1つのプロジェクト。Obsidian の Vault と同じモデル。

---

## 2. 初回起動フロー

1. アプリを初めて起動すると「フォルダを選択してください」画面のみ表示される
2. ユーザーがフォルダを選択すると、そのフォルダ直下に `.litelizard/` ディレクトリが自動生成される（§3 参照）
3. 選択先が LiteLizard の作業場所として安全かを確認する（§10 参照）
4. セットアップ完了後、通常画面（エディタ + エクスプローラパネル）に遷移する

初回起動画面には他の UI 要素（エディタ、エクスプローラ等）は表示しない。フォルダ選択のみ。
フォルダ選択ダイアログでは、新しい作業フォルダをその場で作成できるようにする。

---

## 3. `.litelizard/` ディレクトリ構造

フォルダ選択時に以下の構造が自動生成される:

```
selected-folder/
├── .litelizard/
│   ├── config.json          ← プロジェクト設定
│   └── analysis/            ← 記事ごとの分析結果格納ディレクトリ
│       └── (分析結果ファイルは S-06 で詳細を策定)
├── story1.lzl
└── story2.lzl
```

### `config.json`

プロジェクト固有の設定を格納する。初期内容:

```json
{
  "version": 1
}
```

将来的に拡張される可能性がある（エディタ設定、表示設定など）。

### `analysis/`

記事ごとの分析結果ファイルを格納する。ファイル形式・命名規則は S-06（分析実行・IPC仕様）で策定する。

---

## 4. 2回目以降の起動

- 前回開いていたフォルダを自動で開き、通常画面を直接表示する
- フォルダ選択画面は表示しない

---

## 5. 前回フォルダの記憶

- 前回開いたフォルダのパスはアプリの `userData/app-store.json` に保存する
- `.litelizard/` 内ではなくアプリ側に保存する理由: 「どのプロジェクトを開くか」はプロジェクト外の情報であるため
- `lastOpenedFolder` と Recent files (`recentProjects`) は同じ store に並べて保存し、フォルダを開くたびに同期する

```typescript
interface AppStore {
  lastOpenedFolder: string | null;
  recentProjects: RecentProjectEntry[];
  activeReadingAgentId: string | null;
}

interface RecentProjectEntry {
  path: string;
  lastOpenedAt: string; // ISO 8601
}
```

`setLastOpenedFolder(path)` を呼ぶと、`lastOpenedFolder` の更新と同時に `recentProjects` の先頭に `path` を移動して `lastOpenedAt` を更新する。

---

## 6. フォルダの切り替え

- メニューバーの「ファイル」→「別のフォルダを開く」から切り替え可能
- 新しいフォルダを選択すると:
  1. 選択先に `.litelizard/` がなければ自動生成（§3 と同じ処理）
  2. `.litelizard/` への書き込み可否を確認する（§9）
  3. `lastOpenedFolder` を更新し、`recentProjects` を更新する
  4. 通常画面を新しいフォルダの内容で再描画

---

## 7. 既存プロジェクトを開く

すでに `.litelizard/` が存在するフォルダを選択した場合:

- `.litelizard/config.json` を読み込んでプロジェクト設定を復元する
- `.litelizard/` の再生成は行わない（既存の分析結果等を保持）
- 書き込み可否は §9 のプローブで確認する

---

## 8. 復元失敗時の挙動

`lastOpenedFolder` が指すフォルダを開けない場合（削除済み、`.litelizard/config.json` が読めない、書き込み不可、外部メディアが外されている等）には、エラーを握りつぶさずに以下を行う:

1. 失敗パスを `lastOpenedFolder` から外す（`null` にする）
2. 失敗パスを `recentProjects` からも除外する
3. ProjectSetupScreen を表示し、状態メッセージで失敗内容を伝える
4. ユーザーは「フォルダを開く」または Recent files から別のフォルダを選び直せる

これにより、同じ失敗パスを再起動のたびに繰り返し試すことを避ける。

ProjectSetupScreen の Recent files で「フォルダが見つからない」エントリは半透明で表示し、クリックで `recentProjects` から除外する。

---

## 9. 書き込み可否の確認

「保存先として選んだフォルダに書き込めない」状態を、解析実行や保存が走るより前に検出する:

- `assertProjectWritable(folderPath)` を以下のタイミングで呼ぶ
  - フォルダ選択ダイアログ後の `ensureProject` 内（既存プロジェクトの場合）
  - `listTree` IPC ハンドラ内（復元経路で `.litelizard/config.json` は読めても書けないケースを検出）
- 確認方法: `.litelizard/.write-probe-<pid>-<rand>` を書き込み・即削除し、`writeFile` が成功するかで判定する
- 失敗時は `PROJECT_NOT_WRITABLE: ...` エラーを投げ、上位の `LIST_TREE_FAILED` などとして renderer に届く
- renderer 側は §8 のフォールバック導線に乗せる

新規プロジェクト初期化（`initializeProject`）は `.litelizard/` を作成する過程で書き込みを伴うため、追加プローブは不要。

---

## 10. プロジェクトフォルダとして不適切な場所の拒否

ユーザーが macOS のシステム領域や LiteLizard の内部 / 開発用フォルダを誤って作業場所に選ぶと、`.litelizard/` や `.lzl` を不自然な場所へ書き込んでしまう。フォルダ選択後、プロジェクト初期化より前に以下を拒否する:

- ファイルシステムのルート
- `/System`, `/Library`, `/Applications`, `/usr`, `/bin`, `/sbin`, `/etc`, `/dev` 配下
- `.git`, `.litelizard`, `node_modules` そのもの
- LiteLizard の開発用 checkout に見えるフォルダ

拒否時は `PROJECT_LOCATION_UNSAFE` と日本語の理由を返し、renderer 側では ProjectSetupScreen に戻して選び直しを促す。通常のユーザーフォルダ配下や `Documents` 配下の新規フォルダは従来通り許可する。
