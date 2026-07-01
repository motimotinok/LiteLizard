import crypto from 'node:crypto';
import {
  ReadingAgentInputSchema,
  buildAnalysisDocumentTexts,
  isKnownProviderModel,
  type AnalysisContextPolicy,
  type AnalysisResult,
  type AnalysisRunInput,
  type AnalysisRunResult,
  type ReadingAgent,
  type ReadingAgentDryRunInput,
} from '@litelizard/shared';
import { buildContextTexts } from './analysisProvider.js';
import type { ResolvedAnalysisProvider } from './analysisProvider.js';

function buildPromptCacheKey(input: {
  documentId: string;
  promptVersion: string;
  model: string;
  agent: ReadingAgent | ReadingAgentDryRunInput['agent'];
  documentTexts: string[];
  contextPolicy: AnalysisContextPolicy;
}) {
  const hash = crypto
    .createHash('sha256')
    .update(JSON.stringify({
      documentId: input.documentId,
      promptVersion: input.promptVersion,
      model: input.model,
      agentName: input.agent.name,
      agentRole: input.agent.role,
      agentPrompt: input.agent.systemPrompt,
      contextPolicy: input.contextPolicy,
      documentTexts: input.documentTexts,
    }))
    .digest('hex')
    .slice(0, 48);

  return `llz:${hash}`;
}

function resolveAgentModel(agent: ReadingAgent | ReadingAgentDryRunInput['agent'], resolvedProvider: ResolvedAnalysisProvider) {
  const override = agent.model?.trim();
  if (!override) {
    return resolvedProvider.model;
  }

  if (resolvedProvider.id === 'openai' && isKnownProviderModel('anthropic', override)) {
    throw new Error(
      `Reading Agent のモデル override「${override}」は Anthropic 用です。既定 provider を Anthropic に切り替えるか、OpenAI 用モデルを選択してください。`,
    );
  }

  if (resolvedProvider.id === 'anthropic' && isKnownProviderModel('openai', override)) {
    throw new Error(
      `Reading Agent のモデル override「${override}」は OpenAI 用です。既定 provider を OpenAI に切り替えるか、Anthropic 用モデルを選択してください。`,
    );
  }

  return override;
}

export async function runAnalysis(
  input: AnalysisRunInput,
  resolvedProvider: ResolvedAnalysisProvider,
  agent: ReadingAgent,
  onProgress?: (result: AnalysisResult) => void,
  contextPolicy: AnalysisContextPolicy = agent.contextPolicy,
): Promise<AnalysisRunResult> {
  const results: AnalysisResult[] = [];
  const model = resolveAgentModel(agent, resolvedProvider);
  const documentTexts = buildAnalysisDocumentTexts(input.documentParagraphs);
  const promptCacheKey =
    resolvedProvider.id === 'openai'
      ? buildPromptCacheKey({
          documentId: input.documentId,
          promptVersion: input.promptVersion,
          model,
          agent,
          documentTexts,
          contextPolicy,
        })
      : undefined;

  for (const paragraph of input.paragraphs) {
    const analyze = () =>
      resolvedProvider.provider.analyzeParagraph({
        paragraphId: paragraph.paragraphId,
        text: paragraph.text,
        agent,
        promptVersion: input.promptVersion,
        model,
        contextTexts: buildContextTexts(input.documentParagraphs, paragraph.paragraphId, contextPolicy),
        documentTexts,
        promptCacheKey,
        additionalInstruction: input.additionalInstruction,
      });

    let analyzed: AnalysisResult;
    try {
      analyzed = await analyze();
    } catch {
      // 失敗した段落だけを一度リトライする。成功済み段落は再送しない。
      analyzed = await analyze();
    }

    onProgress?.(analyzed);
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
}

export async function dryRunReadingAgent(
  input: ReadingAgentDryRunInput,
  resolvedProvider: ResolvedAnalysisProvider,
  contextPolicy?: AnalysisContextPolicy,
): Promise<AnalysisResult> {
  const agent = ReadingAgentInputSchema.parse(input.agent);
  const resolvedContextPolicy = contextPolicy ?? agent.contextPolicy;
  const documentTexts = buildAnalysisDocumentTexts(input.documentParagraphs);
  const model = resolveAgentModel(agent, resolvedProvider);
  return resolvedProvider.provider.analyzeParagraph({
    paragraphId: input.paragraph.paragraphId,
    text: input.paragraph.text,
    agent,
    promptVersion: input.promptVersion,
    model,
    contextTexts: buildContextTexts(input.documentParagraphs, input.paragraph.paragraphId, resolvedContextPolicy),
    documentTexts,
    promptCacheKey:
      resolvedProvider.id === 'openai'
        ? buildPromptCacheKey({
            documentId: 'dry-run',
            promptVersion: input.promptVersion,
            model,
            agent,
            documentTexts,
            contextPolicy: resolvedContextPolicy,
          })
        : undefined,
  });
}
