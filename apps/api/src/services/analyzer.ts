import OpenAI from 'openai';
import type { AnalysisRequest, AnalysisResult } from '@litelizard/shared';

function estimateTokens(input: string) {
  return Math.ceil(input.length / 4);
}

function mockAnalyze(paragraphId: string, text: string, promptVersion: string): AnalysisResult {
  const hasAnxiety = /不安|緊張|怖|見られて/.test(text);

  return {
    paragraphId,
    emotion: hasAnxiety ? ['不安', '緊張'] : ['落ち着き', '内省'],
    theme: hasAnxiety ? ['対人不安', '自己意識'] : ['自己理解', '日常観察'],
    deepMeaning: hasAnxiety
      ? '外部の視線に対する過敏さが自己評価を強めている可能性があります。'
      : '体験の描写を通じて内面の意味づけが整理されつつあります。',
    confidence: 0.72,
    model: 'mock-litelizard-v1',
    analyzedAt: new Date().toISOString(),
    promptVersion,
  };
}

async function openAiAnalyze(
  client: OpenAI,
  paragraphId: string,
  text: string,
  promptVersion: string,
  personaMode: string
): Promise<AnalysisResult> {
  const system = `You are LiteLizard analysis model. Return strict JSON with keys: emotion(string[]), theme(string[]), deepMeaning(string), confidence(number 0..1). Persona mode: ${personaMode}.`;
  const completion = await client.responses.create({
    model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
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

  const raw = completion.output_text;
  const parsed = JSON.parse(raw) as {
    emotion: string[];
    theme: string[];
    deepMeaning: string;
    confidence: number;
  };

  return {
    paragraphId,
    emotion: parsed.emotion,
    theme: parsed.theme,
    deepMeaning: parsed.deepMeaning,
    confidence: parsed.confidence,
    model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
    analyzedAt: new Date().toISOString(),
    promptVersion,
  };
}

export async function analyzeParagraphs(input: AnalysisRequest): Promise<{
  results: AnalysisResult[];
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number;
  model: string;
}> {
  const apiKey = process.env.OPENAI_API_KEY;
  const client = apiKey ? new OpenAI({ apiKey }) : null;
  const results: AnalysisResult[] = [];

  for (const paragraph of input.paragraphs) {
    if (paragraph.text.includes('[[FAIL]]')) {
      throw new Error('Forced failure for testing');
    }
    // all-or-nothing: fail whole request if one paragraph fails
    const result = client
      ? await openAiAnalyze(client, paragraph.paragraphId, paragraph.text, input.promptVersion, input.personaMode)
      : mockAnalyze(paragraph.paragraphId, paragraph.text, input.promptVersion);

    results.push(result);
  }

  const inputTokens = input.paragraphs.reduce((acc, p) => acc + estimateTokens(p.text), 0);
  const outputTokens = results.reduce((acc, r) => acc + estimateTokens(r.deepMeaning), 0);
  const estimatedCost = Number((inputTokens * 0.00000015 + outputTokens * 0.0000006).toFixed(6));

  return {
    results,
    inputTokens,
    outputTokens,
    estimatedCost,
    model: client ? process.env.OPENAI_MODEL ?? 'gpt-4o-mini' : 'mock-litelizard-v1',
  };
}
