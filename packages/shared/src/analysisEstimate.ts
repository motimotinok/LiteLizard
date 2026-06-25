import {
  DEFAULT_ANALYSIS_CONTEXT_POLICY,
  type AnalysisContextPolicy,
} from './types.js';

/**
 * 分析実行前の概算コスト見積もり。
 *
 * 受け入れ条件（docs/tickets/2026-05-11-analysis-estimate-confirmation.md）の通り、
 * 確認 UI に「対象段落数」「対象本文量」「コンテキスト本文量」「概算入力量」「概算 output 量」
 * を表示するためのプリミティブを返す。トークン単位ではなく文字数単位での概算であり、
 * 課金額の正確な計算ではない点に注意。
 */
export interface AnalysisCostEstimate {
  targetCount: number;
  targetTextChars: number;
  contextTextChars: number;
  /**
   * system prompt + context + 対象段落本文 をすべて合計した、概算入力文字数。
   * target ごとに system prompt と context が乗算される点に注意。
   */
  totalInputChars: number;
  /**
   * 概算 output 文字数。1 段落あたり {@link OUTPUT_CHARS_PER_PARAGRAPH_DEFAULT}（または指定値）。
   */
  estimatedOutputChars: number;
}

export interface AnalysisEstimateAgent {
  name: string;
  role: string;
  systemPrompt: string;
}

export interface AnalysisEstimateParagraph {
  paragraphId: string;
  text: string;
  chapterId?: string;
  order?: number;
}

export interface AnalysisEstimateInput {
  /** 分析実行で送る対象段落（stale 段落）。 */
  targetParagraphs: AnalysisEstimateParagraph[];
  /** コンテキスト候補となるドキュメント全段落（古い順）。 */
  documentParagraphs: AnalysisEstimateParagraph[];
  /** 選択中 Reading Agent の contextPolicy。 */
  contextPolicy?: AnalysisContextPolicy;
  /** 現在選択中の Reading Agent。未選択時は null を渡す。 */
  agent: AnalysisEstimateAgent | null;
  /** 1 段落あたりの概算 output 文字数。指定しない場合は {@link OUTPUT_CHARS_PER_PARAGRAPH_DEFAULT}。 */
  outputCharsPerParagraph?: number;
}

/**
 * 1 段落あたりの概算 output 文字数の既定値。
 *
 * LiteLizard の分析結果は emotion(<= 8) + theme(<= 8) + deepMeaning(<= 1000) + confidence。
 * 実測の感触で 200〜600 文字程度。中央値を見て 500 を採用している。
 */
export const OUTPUT_CHARS_PER_PARAGRAPH_DEFAULT = 500;

/**
 * `buildSystemPrompt`（apps/desktop/src/main/analysisProvider.ts）が出力する
 * 固定文字列の概算長。agent 名/役割/プロンプトおよび context block は含まない。
 *
 * - "You are LiteLizard analysis model." 等のフレーム文
 * - "Reading agent name: ." 等の見出し
 * - "Return strict JSON with keys: ..." の指示文
 * - "Reference paragraphs (document order):" もしくは "Reference paragraphs: none"
 *
 * 微小な差分は概算誤差として許容する。実際の system prompt 長を一字一句測る必要が出たら、
 * 共通の system prompt ビルダーを shared に移して両方から使う構成に変更する。
 */
export const SYSTEM_PROMPT_FIXED_OVERHEAD_CHARS = 220;

/**
 * context block 1 件あたりの装飾オーバーヘッド（番号 + ピリオド + 空白 + 改行）。
 */
const CONTEXT_ITEM_DECORATION_CHARS = 5;

function selectContextTexts(
  documentParagraphs: AnalysisEstimateParagraph[],
  targetParagraphId: string,
  policy: AnalysisContextPolicy,
): string[] {
  const index = documentParagraphs.findIndex((p) => p.paragraphId === targetParagraphId);
  if (index < 0 || policy.mode === 'target-only') {
    return [];
  }

  if (policy.mode === 'whole-document') {
    return documentParagraphs
      .filter((p) => p.paragraphId !== targetParagraphId)
      .map((p) => p.text)
      .filter((text) => text.trim().length > 0);
  }

  if (index === 0) {
    return [];
  }

  let candidates = documentParagraphs.slice(0, index);

  if (policy.range === 'lastN') {
    const lastN = Math.max(0, Math.trunc(policy.lastN));
    candidates = candidates.slice(Math.max(0, candidates.length - lastN));
  }

  return candidates
    .map((p) => p.text)
    .filter((text) => text.trim().length > 0);
}

function agentPromptChars(agent: AnalysisEstimateAgent | null): number {
  if (!agent) {
    return 0;
  }
  return agent.name.length + agent.role.length + agent.systemPrompt.length;
}

export function estimateAnalysisCost(input: AnalysisEstimateInput): AnalysisCostEstimate {
  const policy = input.contextPolicy ?? DEFAULT_ANALYSIS_CONTEXT_POLICY;
  const outputCharsPerParagraph = Math.max(
    0,
    Math.trunc(input.outputCharsPerParagraph ?? OUTPUT_CHARS_PER_PARAGRAPH_DEFAULT),
  );
  const agentChars = agentPromptChars(input.agent);

  let targetTextChars = 0;
  let contextTextChars = 0;
  let totalInputChars = 0;

  for (const target of input.targetParagraphs) {
    targetTextChars += target.text.length;

    const contextTexts = selectContextTexts(input.documentParagraphs, target.paragraphId, policy);
    const perTargetContextChars =
      contextTexts.reduce((sum, text) => sum + text.length, 0) +
      contextTexts.length * CONTEXT_ITEM_DECORATION_CHARS;
    contextTextChars += perTargetContextChars;

    totalInputChars +=
      SYSTEM_PROMPT_FIXED_OVERHEAD_CHARS +
      agentChars +
      perTargetContextChars +
      target.text.length;
  }

  return {
    targetCount: input.targetParagraphs.length,
    targetTextChars,
    contextTextChars,
    totalInputChars,
    estimatedOutputChars: input.targetParagraphs.length * outputCharsPerParagraph,
  };
}
