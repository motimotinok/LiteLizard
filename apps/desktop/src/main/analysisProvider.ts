import OpenAI from 'openai';
import type { AnalysisResult, AnalysisRunInput } from '@litelizard/shared';
import type { AnalysisProviderId, AnalysisSettings, PersonaMode } from '@litelizard/shared';

export interface AnalysisProviderRequest {
  paragraphId: string;
  text: string;
  personaMode: PersonaMode;
  promptVersion: string;
  model: string;
  contextTexts: string[];
}

export interface AnalysisProvider {
  id: AnalysisProviderId;
  analyzeParagraph(input: AnalysisProviderRequest): Promise<AnalysisResult>;
}

export interface ResolvedAnalysisProvider {
  id: AnalysisProviderId;
  label: string;
  model: string;
  provider: AnalysisProvider;
}

type SecretMap = Partial<Record<AnalysisProviderId | string, string>>;

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

function extractJsonText(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) {
    return '{}';
  }

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    return fenced[1].trim();
  }

  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start >= 0 && end > start) {
    return trimmed.slice(start, end + 1);
  }

  return trimmed;
}

function buildSystemPrompt(personaMode: PersonaMode, contextTexts: string[]): string {
  const contextBlock =
    contextTexts.length > 0
      ? `\nContext paragraphs (oldest first):\n${contextTexts.map((text, index) => `${index + 1}. ${text}`).join('\n')}`
      : '\nContext paragraphs: none';

  return [
    'You are LiteLizard analysis model.',
    'Return strict JSON with keys: emotion(string[]), theme(string[]), deepMeaning(string), confidence(number 0..1).',
    `Persona mode: ${personaMode}.`,
    contextBlock,
  ].join(' ');
}

export function normalizeAnalysisPayload(
  paragraphId: string,
  promptVersion: string,
  model: string,
  payload: {
    emotion?: unknown;
    theme?: unknown;
    deepMeaning?: unknown;
    confidence?: unknown;
  },
): AnalysisResult {
  return {
    paragraphId,
    emotion: normalizeArray(payload.emotion),
    theme: normalizeArray(payload.theme),
    deepMeaning:
      typeof payload.deepMeaning === 'string' ? payload.deepMeaning.trim().slice(0, 1000) : 'No deep meaning provided.',
    confidence: normalizeConfidence(payload.confidence),
    model,
    analyzedAt: new Date().toISOString(),
    promptVersion,
  };
}

export function createOpenAiAnalysisProvider(apiKey: string): AnalysisProvider {
  const client = new OpenAI({ apiKey });

  return {
    id: 'openai',
    async analyzeParagraph(input: AnalysisProviderRequest): Promise<AnalysisResult> {
      const system = buildSystemPrompt(input.personaMode, input.contextTexts);
      const completion = await client.responses.create({
        model: input.model,
        input: [
          { role: 'system', content: system },
          { role: 'user', content: input.text },
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

      return normalizeAnalysisPayload(input.paragraphId, input.promptVersion, input.model, parsed);
    },
  };
}

export function createAnthropicAnalysisProvider(apiKey: string): AnalysisProvider {
  return {
    id: 'anthropic',
    async analyzeParagraph(input: AnalysisProviderRequest): Promise<AnalysisResult> {
      const system = buildSystemPrompt(input.personaMode, input.contextTexts);
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: input.model,
          max_tokens: 1200,
          system,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `${input.text}\n\nReturn JSON only.`,
                },
              ],
            },
          ],
        }),
      });

      if (!response.ok) {
        const raw = await response.text();
        throw new Error(`Anthropic API request failed (${response.status}): ${raw.slice(0, 200)}`);
      }

      const payload = await response.json() as {
        content?: Array<{ type?: string; text?: string }>;
      };
      const text = payload.content?.find((part) => part.type === 'text')?.text ?? '';
      const parsed = JSON.parse(extractJsonText(text)) as {
        emotion?: unknown;
        theme?: unknown;
        deepMeaning?: unknown;
        confidence?: unknown;
      };

      return normalizeAnalysisPayload(input.paragraphId, input.promptVersion, input.model, parsed);
    },
  };
}

function providerDisplayName(providerId: AnalysisProviderId): string {
  if (providerId === 'openai') return 'OpenAI';
  if (providerId === 'anthropic') return 'Anthropic';
  return 'Local LLM';
}

export function resolveAnalysisProvider(
  settings: AnalysisSettings,
  secrets: SecretMap,
): ResolvedAnalysisProvider {
  if (settings.defaultProvider === 'local-llm') {
    throw new Error('ローカル LLM は未対応です。設定を OpenAI または Anthropic に変更してください。');
  }

  const providerId = settings.defaultProvider;
  const label = providerDisplayName(providerId);
  const apiKey = secrets[providerId]?.trim();

  if (!apiKey) {
    throw new Error(`${label} API キーが未設定です。設定画面で保存してください。`);
  }

  if (providerId === 'openai') {
    return {
      id: 'openai',
      label,
      model: settings.providers.openai.defaultModel,
      provider: createOpenAiAnalysisProvider(apiKey),
    };
  }

  return {
    id: 'anthropic',
    label,
    model: settings.providers.anthropic.defaultModel,
    provider: createAnthropicAnalysisProvider(apiKey),
  };
}

export function buildContextTexts(
  paragraphs: AnalysisRunInput['documentParagraphs'],
  paragraphId: string,
  maxItems = 10,
): string[] {
  const index = paragraphs.findIndex((paragraph) => paragraph.paragraphId === paragraphId);
  if (index <= 0) {
    return [];
  }

  return paragraphs
    .slice(Math.max(0, index - maxItems), index)
    .map((paragraph) => paragraph.text)
    .filter((text) => text.trim().length > 0);
}
