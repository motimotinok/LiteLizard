import crypto from 'node:crypto';
import {
  ReadingAgentInputSchema,
  type AnalysisContextPolicy,
  type AnalysisResult,
  type AnalysisRunInput,
  type AnalysisRunResult,
  type ReadingAgent,
  type ReadingAgentDryRunInput,
} from '@litelizard/shared';
import { buildContextTexts } from './analysisProvider.js';
import type { ResolvedAnalysisProvider } from './analysisProvider.js';

function resolveAgentModel(agent: ReadingAgent | ReadingAgentDryRunInput['agent'], resolvedProvider: ResolvedAnalysisProvider) {
  return agent.model?.trim() || resolvedProvider.model;
}

export async function runAnalysis(
  input: AnalysisRunInput,
  resolvedProvider: ResolvedAnalysisProvider,
  agent: ReadingAgent,
  onProgress?: (result: AnalysisResult) => void,
  contextPolicy: AnalysisContextPolicy = agent.contextPolicy,
): Promise<AnalysisRunResult> {
  const execute = async (progressCallback?: (result: AnalysisResult) => void) => {
    const results: AnalysisResult[] = [];
    const model = resolveAgentModel(agent, resolvedProvider);

    for (const paragraph of input.paragraphs) {
      const analyzed = await resolvedProvider.provider.analyzeParagraph({
        paragraphId: paragraph.paragraphId,
        text: paragraph.text,
        agent,
        promptVersion: input.promptVersion,
        model,
        temperature: agent.temperature,
        contextTexts: buildContextTexts(input.documentParagraphs, paragraph.paragraphId, contextPolicy),
      });
      progressCallback?.(analyzed);
      results.push(analyzed);
    }

    return {
      requestId: `req_${crypto.randomUUID()}`,
      documentId: input.documentId,
      agentId: input.agentId,
      personaMode: input.personaMode,
      promptVersion: input.promptVersion,
      results,
    } satisfies AnalysisRunResult;
  };

  try {
    return await execute(onProgress);
  } catch {
    // リトライ時は onProgress を渡さない（重複発火・重複保存を防ぐ）
    return execute();
  }
}

export async function dryRunReadingAgent(
  input: ReadingAgentDryRunInput,
  resolvedProvider: ResolvedAnalysisProvider,
  contextPolicy?: AnalysisContextPolicy,
): Promise<AnalysisResult> {
  const agent = ReadingAgentInputSchema.parse(input.agent);
  const resolvedContextPolicy = contextPolicy ?? agent.contextPolicy;
  return resolvedProvider.provider.analyzeParagraph({
    paragraphId: input.paragraph.paragraphId,
    text: input.paragraph.text,
    agent,
    promptVersion: input.promptVersion,
    model: resolveAgentModel(agent, resolvedProvider),
    temperature: agent.temperature,
    contextTexts: buildContextTexts(input.documentParagraphs, input.paragraph.paragraphId, resolvedContextPolicy),
  });
}
