import { describe, expect, it } from 'vitest';
import {
  estimateAnalysisCost,
  OUTPUT_CHARS_PER_PARAGRAPH_DEFAULT,
  SYSTEM_PROMPT_FIXED_OVERHEAD_CHARS,
} from './analysisEstimate.js';
import type { AnalysisEstimateAgent, AnalysisEstimateParagraph } from './analysisEstimate.js';
import type { AnalysisContextPolicy } from './types.js';

const agent: AnalysisEstimateAgent = {
  name: 'ABC',
  role: 'role!',
  systemPrompt: 'PROMPT_____',
};
const AGENT_CHARS = agent.name.length + agent.role.length + agent.systemPrompt.length;

function makeParagraphs(): AnalysisEstimateParagraph[] {
  return [
    { paragraphId: 'p1', chapterId: 'c1', text: '一段落の本文' },
    { paragraphId: 'p2', chapterId: 'c1', text: '二段落の本文だ' },
    { paragraphId: 'p3', chapterId: 'c2', text: '三段落の本文を書く' },
    { paragraphId: 'p4', chapterId: 'c2', text: '四段落めの本文の続き' },
  ];
}

describe('estimateAnalysisCost', () => {
  it('対象が空のときは targetCount=0 で input/output いずれも 0 になる', () => {
    const estimate = estimateAnalysisCost({
      targetParagraphs: [],
      documentParagraphs: makeParagraphs(),
      agent,
    });

    expect(estimate.targetCount).toBe(0);
    expect(estimate.targetTextChars).toBe(0);
    expect(estimate.contextTextChars).toBe(0);
    expect(estimate.totalInputChars).toBe(0);
    expect(estimate.estimatedOutputChars).toBe(0);
  });

  it('対象段落数と概算 output 量は targetCount に比例する', () => {
    const paragraphs = makeParagraphs();
    const estimate = estimateAnalysisCost({
      targetParagraphs: [paragraphs[0], paragraphs[2]],
      documentParagraphs: paragraphs,
      agent,
      outputCharsPerParagraph: 400,
    });

    expect(estimate.targetCount).toBe(2);
    expect(estimate.estimatedOutputChars).toBe(2 * 400);
    expect(estimate.targetTextChars).toBe(paragraphs[0].text.length + paragraphs[2].text.length);
  });

  it('outputCharsPerParagraph を省略した場合は既定値を使う', () => {
    const paragraphs = makeParagraphs();
    const estimate = estimateAnalysisCost({
      targetParagraphs: [paragraphs[0]],
      documentParagraphs: paragraphs,
      agent,
    });

    expect(estimate.estimatedOutputChars).toBe(OUTPUT_CHARS_PER_PARAGRAPH_DEFAULT);
  });

  it('preceding lastN だと前段落数が絞られて contextTextChars が小さくなる', () => {
    const paragraphs = makeParagraphs();
    const target = paragraphs[3]; // 直前に 3 段落ある

    const allEstimate = estimateAnalysisCost({
      targetParagraphs: [target],
      documentParagraphs: paragraphs,
      agent,
      contextPolicy: { mode: 'preceding', range: 'all' },
    });

    const lastNEstimate = estimateAnalysisCost({
      targetParagraphs: [target],
      documentParagraphs: paragraphs,
      agent,
      contextPolicy: { mode: 'preceding', range: 'lastN', lastN: 1 },
    });

    expect(lastNEstimate.contextTextChars).toBeLessThan(allEstimate.contextTextChars);
    expect(lastNEstimate.totalInputChars).toBeLessThan(allEstimate.totalInputChars);
  });

  it('target-only は context を送らない', () => {
    const paragraphs = makeParagraphs();
    const target = paragraphs[3];

    const estimate = estimateAnalysisCost({
      targetParagraphs: [target],
      documentParagraphs: paragraphs,
      agent,
      contextPolicy: { mode: 'target-only' },
    });

    expect(estimate.contextTextChars).toBe(0);
    expect(estimate.totalInputChars).toBe(
      SYSTEM_PROMPT_FIXED_OVERHEAD_CHARS + AGENT_CHARS + target.text.length,
    );
  });

  it('whole-document は対象を重複させず後続を含む全文を context に含める', () => {
    const paragraphs = makeParagraphs();
    const target = paragraphs[1];

    const estimate = estimateAnalysisCost({
      targetParagraphs: [target],
      documentParagraphs: paragraphs,
      agent,
      contextPolicy: { mode: 'whole-document' },
    });

    const expectedContextChars =
      paragraphs
        .filter((paragraph) => paragraph.paragraphId !== target.paragraphId)
        .reduce((sum, paragraph) => sum + paragraph.text.length, 0) +
      (paragraphs.length - 1) * 5;
    expect(estimate.contextTextChars).toBe(expectedContextChars);
  });

  it('totalInputChars には system prompt + agent + context + target 本文が含まれる', () => {
    const paragraphs = makeParagraphs();
    const target = paragraphs[1]; // 直前に p1 が 1 件
    const policy: AnalysisContextPolicy = { mode: 'preceding', range: 'all' };
    const estimate = estimateAnalysisCost({
      targetParagraphs: [target],
      documentParagraphs: paragraphs,
      agent,
      contextPolicy: policy,
    });

    const expectedContextChars = paragraphs[0].text.length + /* decoration */ 5;
    expect(estimate.contextTextChars).toBe(expectedContextChars);
    expect(estimate.totalInputChars).toBe(
      SYSTEM_PROMPT_FIXED_OVERHEAD_CHARS + AGENT_CHARS + expectedContextChars + target.text.length,
    );
  });

  it('先頭段落のときは context が空でも system prompt 分の input がある', () => {
    const paragraphs = makeParagraphs();
    const target = paragraphs[0];

    const estimate = estimateAnalysisCost({
      targetParagraphs: [target],
      documentParagraphs: paragraphs,
      agent,
      contextPolicy: { mode: 'preceding', range: 'all' },
    });

    expect(estimate.contextTextChars).toBe(0);
    expect(estimate.totalInputChars).toBe(
      SYSTEM_PROMPT_FIXED_OVERHEAD_CHARS + AGENT_CHARS + target.text.length,
    );
  });

  it('agent が null のときは agent 由来の input chars は 0 として扱う', () => {
    const paragraphs = makeParagraphs();
    const estimate = estimateAnalysisCost({
      targetParagraphs: [paragraphs[0]],
      documentParagraphs: paragraphs,
      agent: null,
      contextPolicy: { mode: 'target-only' },
    });

    expect(estimate.totalInputChars).toBe(
      SYSTEM_PROMPT_FIXED_OVERHEAD_CHARS + paragraphs[0].text.length,
    );
  });
});
