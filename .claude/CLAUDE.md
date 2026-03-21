日本語で応答してください。
ユーザーは音声入力で指示を飛ばすことがあります。誤字がある場合は適宜文脈から内容を読み取ってください。
実装を進めながら仕様を動的に変更していく予定のため、将来的な拡張性を加味した実装方針の検討や問題点の指摘などを行なってください。

---

## Claude の役割

### Claude が担うこと
- **仕様策定・設計判断**: ユーザーとの対話を通じて仕様を詰め、設計を決定する
- **実装全般**: すべての実装タスクを Claude が担う
- **WBS の更新・タスク割り振り**: `docs/wbs.md` にタスクを追加・優先度付けする
- **PROJECTMEMORY の管理**: TASKS / ARCHIVE の整理・更新
- **設計判断の記録**: `docs/decisions.md` に技術選択の理由を記録する

---

## 開発ワークフロー

### ブランチ運用
- メイン作業ディレクトリ（`/Users/jane/litelizard/claude`）は **dev ブランチに常駐**
- 作業は dev から feature branch（`feat/<task-id>`）を切って実施
- **並列実行時**: 事前作成済みの worktree（work1〜work5）に feature branch を割り当てて並列作業
- **単一タスク時**: メインディレクトリで直接 feature branch を切って作業
- 作業完了・レビュー後、dev にローカルマージし feature branch を削除
- リモートとの同期: `git fetch origin && git merge origin/dev`

### タスクの流れ
1. `PROJECTMEMORY/TASKS.md` の「NEXT」でタスクを確認
2. dev から `feat/<task-id>` ブランチを切って実装（並列時は worktree を使用）
3. 完了したら `docs/wbs.md` のステータスを更新
4. dev にマージ、feature branch を削除
5. `PROJECTMEMORY/TASKS.md` のキューを更新

### PR・レビュー方針

- **PR はレビュー依頼の場ではなく変更の記録・区切りとして使う**
- レビューは Claude が実装時に code-reviewer エージェントで自己完結させる（PR 後の指摘ループは原則行わない）
- PR に指摘コメントがついた場合の対応基準:

| 優先度 | 内容 | 対応 |
|--------|------|------|
| P1 | データ消失・クラッシュ系バグ | マージ前に必ず修正 |
| P2 | 設計の不整合・将来影響あり | 仕様変更で影響するなら修正、しないなら Issue 起票して後回し |
| P3 | 軽微なコード品質・スタイル | 仕様が固まったタイミングで Issue 起票、即時対応しない |

- **P2/P3 で即時対応しないものは GitHub Issue として起票する**（TODO コメントより追跡しやすいため）

### ファイルの役割分担

| ファイル | 管理 | 役割 |
|---------|------|------|
| `docs/wbs.md` | git | タスク台帳（唯一の信頼できるソース） |
| `docs/decisions.md` | git | 設計判断ログ |
| `docs/LiteLizard_spec_v003.md` | git | 仕様書 |
| `docs/implementation-status.md` | git | 実装状況（仕様 v003 対照） |
| `docs/specs/*.md` | git | トピック別詳細仕様（実装者向け。決定経緯は decisions.md） |
| `PROJECTMEMORY/TASKS.md` | .gitignore | 優先度順タスクキュー + 方針覚書ダッシュボード |
| `PROJECTMEMORY/ARCHIVE.md` | .gitignore | 完了タスク保管庫 |

---

## サブエージェント利用ルール

サブエージェントは自己判断で自由に使ってよい。ユーザーへの確認は不要。調査・実装・レビュー・テストなど、必要と判断したら積極的に活用すること。

### コードベース調査
コードベースの広範な調査が必要な場合は **Explore エージェント**を使う。単純な検索は Glob / Grep を直接使う。

### 並列実行
`/parallel-planner` スキルでプランを生成し、`/parallel-executor` スキルに従ってサブエージェントを起動・実行する。
並列実行時は事前作成済みの worktree（work1〜work5、最大5並列）を使用する。
