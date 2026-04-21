import crypto from 'node:crypto';
import type { AnalysisResult, AnalysisRunInput, AnalysisRunResult } from '@litelizard/shared';
import { buildContextTexts } from './analysisProvider.js';
import type { ResolvedAnalysisProvider } from './analysisProvider.js';

export async function runAnalysis(
  input: AnalysisRunInput,
  resolvedProvider: ResolvedAnalysisProvider,
): Promise<AnalysisRunResult> {
  const execute = async () => {
    const results: AnalysisResult[] = [];

    for (const paragraph of input.paragraphs) {
      if (paragraph.text.includes('[[FAIL]]')) {
        throw new Error('Forced failure for testing');
      }

      const analyzed = await resolvedProvider.provider.analyzeParagraph({
        paragraphId: paragraph.paragraphId,
        text: paragraph.text,
        personaMode: input.personaMode,
        promptVersion: input.promptVersion,
        model: resolvedProvider.model,
        contextTexts: buildContextTexts(input.documentParagraphs, paragraph.paragraphId),
      });
      results.push(analyzed);
    }

    return {
      requestId: `req_${crypto.randomUUID()}`,
      documentId: input.documentId,
      personaMode: input.personaMode,
      promptVersion: input.promptVersion,
      results,
    } satisfies AnalysisRunResult;
  };

  try {
    return await execute();
  } catch {
    return execute();
  }
}
