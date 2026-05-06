---
status: todo
started_at:
completed_at:
---

# 段落と分析カードの fade highlight を連動させる

## 背景

WBS R-21 では、段落と分析カードの fade highlight 連動アニメーションが未完了になっている。UI リデザイン仕様では、段落と分析カードの対応関係を見た目で示すことが採用方針に含まれている。

## ゴール

エディター段落と分析カードのどちらかを選択・ホバーしたとき、対応する相手側が控えめに fade highlight される。

## スコープ

- editor 側 active paragraph と AnalysisPane 側 active card の状態を確認する
- 段落クリック/ホバーから分析カードへ、分析カードクリック/ホバーから段落へ対応状態を伝える
- fade highlight は短く控えめにし、active / stale / dragging 表示と競合しないようにする
- 必要に応じて `prefers-reduced-motion` を考慮する

## 非ゴール

- 分析カードクリック時アニメーション単体の再調整
- スクロール同期の本格実装
- 新しい分析結果 UI の追加
- エディター構造の大幅変更

## 受け入れ条件

- [ ] 段落を操作したとき対応する分析カードが分かる
- [ ] 分析カードを操作したとき対応する段落が分かる
- [ ] active / stale / dragging の既存表示と競合しない
- [ ] 動きが控えめで、静かな執筆 UI のトーンを壊していない
- [ ] `prefers-reduced-motion` でも状態が分かる

## 検証方法

- [ ] 関連する既存テストを確認する
- [ ] 必要なテストを追加または更新する
- [ ] `pnpm -w lint`
- [ ] `pnpm -w test`
- [ ] `pnpm -w build`

## 完了メモ

未着手。

## 元 WBS

- R-21 段落 ↔ 分析カードの fade highlight 連動アニメーション
