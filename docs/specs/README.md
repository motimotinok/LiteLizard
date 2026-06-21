# 詳細仕様インデックス

> トピック別の詳細仕様を管理する。各ファイルが1つのトピックの「現行仕様」を表す。
> 決定の経緯・却下した代替案は `docs/decisions.md` を参照。

| ファイル | トピック | 関連タスク | 状態 |
|----------|---------|-----------|------|
| [lzl-format.md](lzl-format.md) | .lzl ファイルフォーマット (lzl-v1) | S-01 | stable |
| [document-id.md](document-id.md) | ID 生成・重複検出 | S-03 | stable |
| [auth-session.md](auth-session.md) | 認証・セッションフロー | S-05, S-09 | revised（S-09 でローカル完結主軸に改訂） |
| [save-model.md](save-model.md) | 保存確定モデル（完全自動保存） | S-02 | stable |
| [project-management.md](project-management.md) | プロジェクト管理フロー（フォルダベース） | S-04 | stable |
| [analysis-api.md](analysis-api.md) | 解析 API エンドポイント（リクエスト・レスポンス・保存・コンテキストポリシー） | S-06, S-09, L-09 | revised（S-09 でローカル処理主軸に改訂、L-09 を将来拡張として追記） |
| [chapter-paragraph-ops.md](chapter-paragraph-ops.md) | 章削除・段落統合エッジケース | S-07 | stable |
| [undo-redo.md](undo-redo.md) | Undo/Redo 対象範囲・実装方針（Zustand 統合 Command スタック） | S-08 | stable |
| [ui-redesign-minimal.md](ui-redesign-minimal.md) | UI リデザイン仕様（案 A Minimal・現行実装の基準） | R-16 | implemented baseline（今後の方向は `DESIGN.md`） |
| [reading-agent.md](reading-agent.md) | Reading Agent 永続化・編集・解析適用 | R-18 | stable |
