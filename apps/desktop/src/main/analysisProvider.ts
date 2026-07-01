import OpenAI, { AuthenticationError, RateLimitError } from 'openai';
import type {
  Response as OpenAiResponse,
  ResponseCreateParamsNonStreaming,
} from 'openai/resources/responses/responses';
import {
  DEFAULT_ANALYSIS_CONTEXT_POLICY,
  buildAnalysisContextTexts,
  buildAnalysisSystemPrompt,
  buildAnalysisTargetPrompt,
  filterTagsByDefinitions,
  normalizeReadingAgentTagDefinitions,
  type AnalysisContextPolicy,
  type AnalysisProviderId,
  type AnalysisResult,
  type AnalysisRunInput,
  type AnalysisSettings,
  type ReadingAgentInput,
  type ReadingAgentTagDefinition,
} from '@litelizard/shared';

export interface AnalysisProviderRequest {
  paragraphId: string;
  text: string;
  agent: ReadingAgentInput;
  promptVersion: string;
  model: string;
  temperature: number;
  contextTexts: string[];
  documentTexts?: string[];
  promptCacheKey?: string;
  additionalInstruction?: string;
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
type OpenAiResponseCreateParamsWithPromptCache = ResponseCreateParamsNonStreaming & {
  prompt_cache_key?: string;
  prompt_cache_retention?: '24h';
};

export const ANALYSIS_PROVIDER_OUTPUT_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['response'],
  properties: {
    response: { type: 'string', maxLength: 4000 },
    tags: {
      type: 'object',
      additionalProperties: {
        type: 'array',
        items: { type: 'string' },
        maxItems: 16,
      },
    },
  },
} as const;

export function buildAnalysisProviderOutputJsonSchema(
  tagDefinitions: readonly ReadingAgentTagDefinition[] = [],
) {
  const definitions = normalizeReadingAgentTagDefinitions(tagDefinitions);
  const tagProperties = Object.fromEntries(
    definitions.map((definition) => [
      definition.id,
      {
        type: 'array',
        items: {
          type: 'string',
          enum: definition.values.map((value) => value.id),
        },
        maxItems: 16,
      },
    ]),
  );

  return {
    type: 'object',
    additionalProperties: false,
    required: ['response'],
    properties: {
      response: { type: 'string', maxLength: 4000 },
      tags: {
        type: 'object',
        additionalProperties: false,
        properties: tagProperties,
      },
    },
  } as const;
}

function normalizeArray(input: unknown): string[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .map((item) => String(item).trim())
    .filter(Boolean)
    .slice(0, 8);
}

function normalizeTags(input: unknown): Record<string, string[]> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return {};
  }

  const tags: Record<string, string[]> = {};
  for (const [key, value] of Object.entries(input)) {
    const tagKey = key.trim();
    const values = normalizeArray(value);
    if (tagKey && values.length > 0) {
      tags[tagKey] = values;
    }
  }
  return tags;
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

export function buildOpenAiResponseRequest(
  input: AnalysisProviderRequest,
): OpenAiResponseCreateParamsWithPromptCache {
  const system = buildAnalysisSystemPrompt(input.agent, input.contextTexts, input.documentTexts ?? input.contextTexts);
  const targetPrompt = buildAnalysisTargetPrompt(input.paragraphId, input.text, input.additionalInstruction);
  return {
    model: input.model,
    temperature: input.temperature,
    input: [
      { role: 'system', content: system },
      { role: 'user', content: targetPrompt },
    ],
    text: {
      format: {
        type: 'json_schema',
        name: 'litelizard_analysis',
        schema: buildAnalysisProviderOutputJsonSchema(input.agent.tagDefinitions),
      },
    },
    ...(input.promptCacheKey
      ? {
          prompt_cache_key: input.promptCacheKey,
          prompt_cache_retention: '24h' as const,
        }
      : {}),
  };
}

export function normalizeAnalysisPayload(
  paragraphId: string,
  promptVersion: string,
  model: string,
  payload: {
    response?: unknown;
    tags?: unknown;
    deepMeaning?: unknown;
  },
  tagDefinitions: readonly ReadingAgentTagDefinition[] = [],
): AnalysisResult {
  const response =
    typeof payload.response === 'string'
      ? payload.response.trim().slice(0, 4000)
      : typeof payload.deepMeaning === 'string'
        ? payload.deepMeaning.trim().slice(0, 4000)
        : 'No response provided.';

  return {
    paragraphId,
    response,
    tags: filterTagsByDefinitions(normalizeTags(payload.tags), tagDefinitions),
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
      let completion: OpenAiResponse;
      try {
        completion = await client.responses.create(buildOpenAiResponseRequest(input));
      } catch (error) {
        if (error instanceof AuthenticationError) {
          throw new Error('OpenAI API キーが無効です。設定画面で再入力してください。');
        }
        if (error instanceof RateLimitError) {
          throw new Error('OpenAI のレート制限に達しました。しばらく待ってから再試行してください。');
        }
        throw error;
      }

      const parsed = JSON.parse(completion.output_text) as {
        response?: unknown;
        tags?: unknown;
      };

      return normalizeAnalysisPayload(input.paragraphId, input.promptVersion, input.model, parsed, input.agent.tagDefinitions);
    },
  };
}

export function createAnthropicAnalysisProvider(apiKey: string): AnalysisProvider {
  return {
    id: 'anthropic',
    async analyzeParagraph(input: AnalysisProviderRequest): Promise<AnalysisResult> {
      const system = buildAnalysisSystemPrompt(input.agent, input.contextTexts);
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
          temperature: input.temperature,
          system,
          tools: [
            {
              name: 'return_litelizard_analysis',
              description: 'Return the LiteLizard paragraph analysis result.',
              input_schema: buildAnalysisProviderOutputJsonSchema(input.agent.tagDefinitions),
            },
          ],
          tool_choice: { type: 'tool', name: 'return_litelizard_analysis' },
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: buildAnalysisTargetPrompt(input.paragraphId, input.text, input.additionalInstruction),
                },
              ],
            },
          ],
        }),
      });

      if (!response.ok) {
        const raw = await response.text();
        if (response.status === 401) {
          throw new Error('Anthropic API キーが無効です。設定画面で再入力してください。');
        }
        if (response.status === 429) {
          throw new Error('Anthropic のレート制限に達しました。しばらく待ってから再試行してください。');
        }
        throw new Error(`Anthropic API エラー (${response.status}): ${raw.slice(0, 200)}`);
      }

      const payload = await response.json() as {
        content?: Array<{ type?: string; text?: string; input?: unknown }>;
      };
      const toolInput = payload.content?.find((part) => part.type === 'tool_use')?.input;
      const text = payload.content?.find((part) => part.type === 'text')?.text ?? '';
      const parsed = (toolInput && typeof toolInput === 'object'
        ? toolInput
        : JSON.parse(extractJsonText(text))) as {
        response?: unknown;
        tags?: unknown;
      };

      return normalizeAnalysisPayload(input.paragraphId, input.promptVersion, input.model, parsed, input.agent.tagDefinitions);
    },
  };
}

export function createLocalLlmAnalysisProvider(endpoint: string): AnalysisProvider {
  const baseUrl = endpoint.trim().replace(/\/+$/, '');

  return {
    id: 'local-llm',
    async analyzeParagraph(input: AnalysisProviderRequest): Promise<AnalysisResult> {
      const system = buildAnalysisSystemPrompt(input.agent, input.contextTexts);
      const prompt = [system, buildAnalysisTargetPrompt(input.paragraphId, input.text, input.additionalInstruction)].join('\n\n');

      let response: Response;
      try {
        response = await fetch(`${baseUrl}/api/generate`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            model: input.model,
            prompt,
            format: buildAnalysisProviderOutputJsonSchema(input.agent.tagDefinitions),
            stream: false,
            keep_alive: '30s',
            options: {
              temperature: input.temperature,
            },
          }),
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`Local LLM 接続に失敗しました: ${message}`);
      }

      if (!response.ok) {
        const raw = await response.text();
        throw new Error(`Local LLM API エラー (${response.status}): ${raw.slice(0, 200)}`);
      }

      const payload = await response.json() as { response?: unknown };
      const text = typeof payload.response === 'string' ? payload.response : '';
      const parsed = JSON.parse(extractJsonText(text)) as {
        response?: unknown;
        tags?: unknown;
      };

      return normalizeAnalysisPayload(input.paragraphId, input.promptVersion, input.model, parsed, input.agent.tagDefinitions);
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
    const endpoint = settings.localLlm.endpoint.trim();
    const model = settings.localLlm.defaultModel.trim();

    if (!endpoint) {
      throw new Error('Local LLM のエンドポイント URL が未設定です。設定画面で保存してください。');
    }

    if (!model) {
      throw new Error('Local LLM のモデル名が未設定です。設定画面で保存してください。');
    }

    return {
      id: 'local-llm',
      label: providerDisplayName('local-llm'),
      model,
      provider: createLocalLlmAnalysisProvider(endpoint),
    };
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

/**
 * 解析対象段落の参照本文を、Reading Agent のコンテキストポリシーに従って組み立てる。
 */
export function buildContextTexts(
  paragraphs: AnalysisRunInput['documentParagraphs'],
  paragraphId: string,
  policy: AnalysisContextPolicy = DEFAULT_ANALYSIS_CONTEXT_POLICY,
): string[] {
  return buildAnalysisContextTexts(paragraphs, paragraphId, policy);
}
