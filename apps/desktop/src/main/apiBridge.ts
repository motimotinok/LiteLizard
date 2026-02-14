import crypto from 'node:crypto';
import OpenAI from 'openai';
import type { AnalysisResult, AnalysisRunInput, AnalysisRunResult, PersonaMode } from '@litelizard/shared';

const MODEL = process.env.OPENAI_MODEL ?? 'gpt-4o-mini';

function normalizeArray(input: unknown): string[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .map((item) => String(item).trim())
    .filter(Boolean)
    .slice(0, 8);
}

function normalizeConfidence(input: unknown): number {
  if (typeof input !== 'number' || Number.isNaN(input)) {
    return 0;
  }
  if (input < 0) {
    return 0;
  }
  if (input > 1) {
    return 1;
  }
  return input;
}

async function analyzeParagraph(
  client: OpenAI,
  paragraphId: string,
  text: string,
  promptVersion: string,
  personaMode: PersonaMode
): Promise<AnalysisResult> {
  const system = `You are LiteLizard analysis model. Return strict JSON with keys: emotion(string[]), theme(string[]), deepMeaning(string), confidence(number 0..1). Persona mode: ${personaMode}.`;
  const completion = await client.responses.create({
    model: MODEL,
    input: [
      { role: 'system', content: system },
      { role: 'user', content: text },
    ],
    text: {
      format: {
        type: 'json_schema',
        name: 'litelizard_analysis',
        schema: {
          type: 'object',
          additionalProperties: false,
          required: ['emotion', 'theme', 'deepMeaning', 'confidence'],
          properties: {
            emotion: { type: 'array', items: { type: 'string' }, maxItems: 8 },
            theme: { type: 'array', items: { type: 'string' }, maxItems: 8 },
            deepMeaning: { type: 'string', maxLength: 1000 },
            confidence: { type: 'number', minimum: 0, maximum: 1 },
          },
        },
      },
    },
  });

  const parsed = JSON.parse(completion.output_text) as {
    emotion?: unknown;
    theme?: unknown;
    deepMeaning?: unknown;
    confidence?: unknown;
  };

  return {
    paragraphId,
    emotion: normalizeArray(parsed.emotion),
    theme: normalizeArray(parsed.theme),
    deepMeaning:
      typeof parsed.deepMeaning === 'string' ? parsed.deepMeaning.slice(0, 1000) : 'No deep meaning provided.',
    confidence: normalizeConfidence(parsed.confidence),
    model: MODEL,
    analyzedAt: new Date().toISOString(),
    promptVersion,
  };
}

export async function runAnalysis(input: AnalysisRunInput, apiKey: string): Promise<AnalysisRunResult> {
  const trimmedKey = apiKey.trim();
  if (!trimmedKey) {
    throw new Error('API key is not configured. Open Settings and save your API key.');
  }

  const execute = async () => {
    const client = new OpenAI({ apiKey: trimmedKey });
    const results: AnalysisResult[] = [];

    for (const paragraph of input.paragraphs) {
      if (paragraph.text.includes('[[FAIL]]')) {
        throw new Error('Forced failure for testing');
      }
      // all-or-nothing: fail the whole analysis when one paragraph fails.
      const analyzed = await analyzeParagraph(
        client,
        paragraph.paragraphId,
        paragraph.text,
        input.promptVersion,
        input.personaMode
      );
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
