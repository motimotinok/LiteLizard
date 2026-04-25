export interface ReadingAgent {
  id: string;
  name: string;
  desc: string;
}

/**
 * 分析エージェントのモック一覧。
 * 永続化・プロンプト適用は別タスク。
 */
export const READING_AGENTS: ReadingAgent[] = [
  { id: 'reader-quiet', name: '静かな読者', desc: '情緒や余韻を中心に短く' },
  { id: 'reader-critical', name: '批評的な読者', desc: '構成・論理・破綻を指摘' },
  { id: 'reader-first', name: 'はじめての読者', desc: '予備知識ゼロで率直に' },
  { id: 'reader-editor', name: '担当編集', desc: '売り・引っかかりを評価' },
];
