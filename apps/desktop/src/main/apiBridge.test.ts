import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  buildAnalysisSystemPrompt,
  buildAnalysisTargetPrompt,
  type AnalysisResult,
  type AnalysisRunInput,
  type ReadingAgent,
} from '@litelizard/shared';
import { dryRunReadingAgent, runAnalysis } from './apiBridge.js';
import {
  ANALYSIS_PROVIDER_OUTPUT_JSON_SCHEMA,
  buildContextTexts,
  buildOpenAiResponseRequest,
  createLocalLlmAnalysisProvider,
  normalizeAnalysisPayload,
  resolveAnalysisProvider,
} from './analysisProvider.js';
import type { ResolvedAnalysisProvider } from './analysisProvider.js';

afterEach(() => {
  vi.unstubAllGlobals();
});

const testAgent: ReadingAgent = {
  id: 'reader-quiet',
  name: '静かな読者',
  role: '余韻を読む',
  systemPrompt: '余韻を中心に読んでください。',
  model: null,
  temperature: 0.7,
  contextPolicy: { mode: 'preceding', range: 'all' },
  createdAt: '2026-05-02T00:00:00.000Z',
  updatedAt: '2026-05-02T00:00:00.000Z',
  builtIn: true,
};

describe('resolveAnalysisProvider', () => {
  it('OpenAI を選択できる', () => {
    const resolved = resolveAnalysisProvider(
      {
        defaultProvider: 'openai',
        providers: {
          openai: { apiKeyConfigured: true, defaultModel: 'gpt-4.1-mini' },
          anthropic: { apiKeyConfigured: false, defaultModel: 'claude-3-7-sonnet-latest' },
        },
        localLlm: {
          endpoint: 'http://127.0.0.1:11434',
          defaultModel: 'llama3.2',
          configured: true,
        },
      },
      { openai: 'sk-openai' },
    );

    expect(resolved.id).toBe('openai');
    expect(resolved.model).toBe('gpt-4.1-mini');
  });

  it('Anthropic を選択できる', () => {
    const resolved = resolveAnalysisProvider(
      {
        defaultProvider: 'anthropic',
        providers: {
          openai: { apiKeyConfigured: true, defaultModel: 'gpt-4.1-mini' },
          anthropic: { apiKeyConfigured: true, defaultModel: 'claude-3-7-sonnet-latest' },
        },
        localLlm: {
          endpoint: 'http://127.0.0.1:11434',
          defaultModel: 'llama3.2',
          configured: true,
        },
      },
      { anthropic: 'sk-ant' },
    );

    expect(resolved.id).toBe('anthropic');
    expect(resolved.model).toBe('claude-3-7-sonnet-latest');
  });

  it('Anthropic キー未設定なら明示エラーにする', () => {
    expect(() =>
      resolveAnalysisProvider(
        {
          defaultProvider: 'anthropic',
          providers: {
            openai: { apiKeyConfigured: true, defaultModel: 'gpt-4.1-mini' },
            anthropic: { apiKeyConfigured: false, defaultModel: 'claude-3-7-sonnet-latest' },
          },
          localLlm: {
            endpoint: 'http://127.0.0.1:11434',
            defaultModel: 'llama3.2',
            configured: true,
          },
        },
        { openai: 'sk-openai' },
      ),
    ).toThrow('Anthropic API キーが未設定です');
  });

  it('local-llm を選択できる', () => {
    const resolved = resolveAnalysisProvider(
      {
        defaultProvider: 'local-llm',
        providers: {
          openai: { apiKeyConfigured: false, defaultModel: 'gpt-4.1-mini' },
          anthropic: { apiKeyConfigured: false, defaultModel: 'claude-3-7-sonnet-latest' },
        },
        localLlm: {
          endpoint: 'http://127.0.0.1:11434/',
          defaultModel: 'llama3.2',
          configured: true,
        },
      },
      {},
    );

    expect(resolved.id).toBe('local-llm');
    expect(resolved.label).toBe('Local LLM');
    expect(resolved.model).toBe('llama3.2');
  });

  it('local-llm の endpoint 未設定なら明示エラーにする', () => {
    expect(() =>
      resolveAnalysisProvider(
        {
          defaultProvider: 'local-llm',
          providers: {
            openai: { apiKeyConfigured: false, defaultModel: 'gpt-4.1-mini' },
            anthropic: { apiKeyConfigured: false, defaultModel: 'claude-3-7-sonnet-latest' },
          },
          localLlm: {
            endpoint: '',
            defaultModel: 'llama3.2',
            configured: false,
          },
        },
        {},
      ),
    ).toThrow('Local LLM のエンドポイント URL が未設定です');
  });

  it('local-llm の model 未設定なら明示エラーにする', () => {
    expect(() =>
      resolveAnalysisProvider(
        {
          defaultProvider: 'local-llm',
          providers: {
            openai: { apiKeyConfigured: false, defaultModel: 'gpt-4.1-mini' },
            anthropic: { apiKeyConfigured: false, defaultModel: 'claude-3-7-sonnet-latest' },
          },
          localLlm: {
            endpoint: 'http://127.0.0.1:11434',
            defaultModel: '',
            configured: false,
          },
        },
        {},
      ),
    ).toThrow('Local LLM のモデル名が未設定です');
  });
});

describe('analysis prompt builders', () => {
  it('Reading Agent と全文を target 段落より前の共通prefixへ置く', () => {
    const first = buildAnalysisSystemPrompt(testAgent, ['前段落'], ['one', 'two', 'three']);
    const second = buildAnalysisSystemPrompt(testAgent, ['前段落', 'one'], ['one', 'two', 'three']);
    const commonFirst = first.split('Reference paragraphs')[0];
    const commonSecond = second.split('Reference paragraphs')[0];

    expect(commonFirst).toBe(commonSecond);
    expect(commonFirst).toContain('Reading agent name: 静かな読者.');
    expect(commonFirst).toContain('Reading agent role: 余韻を読む.');
    expect(commonFirst).toContain('余韻を中心に読んでください。');
    expect(commonFirst).toContain('Full document (document order):');
    expect(commonFirst).toContain('1. one');
    expect(commonFirst).toContain('2. two');
    expect(commonFirst).toContain('3. three');
  });

  it('target 段落本文は可変promptとして明示する', () => {
    expect(buildAnalysisTargetPrompt('p-2', '対象本文')).toBe(
      [
        'Target paragraph:',
        'ID: p-2',
        'Text:',
        '対象本文',
        'Analyze this target paragraph only. Return JSON only.',
      ].join('\n\n'),
    );
  });
});

describe('buildOpenAiResponseRequest', () => {
  it('Responses API に prompt_cache_key と固定prefix/可変targetを送る', () => {
    const request = buildOpenAiResponseRequest({
      paragraphId: 'p-2',
      text: '対象本文',
      agent: testAgent,
      promptVersion: 'v1',
      model: 'gpt-5.4',
      temperature: 0.2,
      contextTexts: ['前段落'],
      documentTexts: ['前段落', '対象本文', '後段落'],
      promptCacheKey: 'llz:cache-key',
    });

    expect(request.prompt_cache_key).toBe('llz:cache-key');
    expect(request.prompt_cache_retention).toBe('24h');
    expect(Array.isArray(request.input)).toBe(true);
    const input = request.input as Array<{ role: string; content: string }>;
    expect(input[0]?.content).toContain('Full document (document order):');
    expect(input[0]?.content).toContain('1. 前段落');
    expect(input[0]?.content).toContain('2. 対象本文');
    expect(input[0]?.content).toContain('3. 後段落');
    expect(input[1]?.content).toContain('ID: p-2');
    expect(input[1]?.content).toContain('対象本文');
  });
});

describe('createLocalLlmAnalysisProvider', () => {
  it('Ollama generate API に keep_alive 30s の非ストリーミングリクエストを送る', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          response: JSON.stringify({
            emotion: ['静けさ'],
            theme: ['旅'],
            deepMeaning: '出発前の不安が描かれている。',
            confidence: 0.75,
          }),
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const provider = createLocalLlmAnalysisProvider('http://127.0.0.1:11434/');
    const result = await provider.analyzeParagraph({
      paragraphId: 'p-1',
      text: '旅立ちの朝、彼女はまだ扉の前にいた。',
      agent: testAgent,
      promptVersion: 'v1',
      model: 'llama3.2',
      temperature: 0.2,
      contextTexts: ['前の段落'],
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'http://127.0.0.1:11434/api/generate',
      expect.objectContaining({
        method: 'POST',
        headers: { 'content-type': 'application/json' },
      }),
    );

    const requestBody = JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string) as {
      model: string;
      prompt: string;
      format: unknown;
      stream: boolean;
      keep_alive: string;
      options: { temperature: number };
    };
    expect(requestBody).toMatchObject({
      model: 'llama3.2',
      stream: false,
      keep_alive: '30s',
      options: { temperature: 0.2 },
    });
    expect(requestBody.format).toEqual(ANALYSIS_PROVIDER_OUTPUT_JSON_SCHEMA);
    expect(requestBody.prompt).toContain('Reference paragraphs');
    expect(requestBody.prompt).toContain('余韻を中心に読んでください。');
    expect(requestBody.prompt).toContain('旅立ちの朝');
    expect(result).toMatchObject({
      paragraphId: 'p-1',
      model: 'llama3.2',
      promptVersion: 'v1',
      emotion: ['静けさ'],
      theme: ['旅'],
      deepMeaning: '出発前の不安が描かれている。',
      confidence: 0.75,
    });
  });

  it('Ollama の fenced JSON レスポンスを正規化できる', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          response: '```json\n{"emotion":["期待"],"theme":["再会"],"deepMeaning":"再会への期待。","confidence":0.6}\n```',
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const provider = createLocalLlmAnalysisProvider('http://127.0.0.1:11434');
    const result = await provider.analyzeParagraph({
      paragraphId: 'p-2',
      text: '駅の灯りが見えた。',
      agent: testAgent,
      promptVersion: 'v1',
      model: 'llama3.2',
      temperature: 0.7,
      contextTexts: [],
    });

    expect(result).toMatchObject({
      paragraphId: 'p-2',
      emotion: ['期待'],
      theme: ['再会'],
      deepMeaning: '再会への期待。',
      confidence: 0.6,
    });
  });

  it('Ollama がエラー応答を返したら状態コードつきエラーにする', async () => {
    const fetchMock = vi.fn(async () => new Response('model not found', { status: 500 }));
    vi.stubGlobal('fetch', fetchMock);

    const provider = createLocalLlmAnalysisProvider('http://127.0.0.1:11434');

    await expect(
      provider.analyzeParagraph({
        paragraphId: 'p-1',
        text: '本文',
        agent: testAgent,
        promptVersion: 'v1',
        model: 'missing-model',
        temperature: 0.7,
        contextTexts: [],
      }),
    ).rejects.toThrow('Local LLM API エラー (500): model not found');
  });

  it('Ollama に接続できない場合は接続失敗エラーにする', async () => {
    const fetchMock = vi.fn(async () => {
      throw new Error('ECONNREFUSED');
    });
    vi.stubGlobal('fetch', fetchMock);

    const provider = createLocalLlmAnalysisProvider('http://127.0.0.1:11434');

    await expect(
      provider.analyzeParagraph({
        paragraphId: 'p-1',
        text: '本文',
        agent: testAgent,
        promptVersion: 'v1',
        model: 'llama3.2',
        temperature: 0.7,
        contextTexts: [],
      }),
    ).rejects.toThrow('Local LLM 接続に失敗しました: ECONNREFUSED');
  });
});

describe('normalizeAnalysisPayload', () => {
  it('raw payload を AnalysisResult に正規化する', () => {
    const result = normalizeAnalysisPayload('p-1', 'v1', 'test-model', {
      emotion: [' 安心 ', '', 1],
      theme: ['旅', null],
      deepMeaning: '  深い意味  ',
      confidence: 1.7,
    });

    expect(result).toMatchObject({
      paragraphId: 'p-1',
      promptVersion: 'v1',
      model: 'test-model',
      emotion: ['安心', '1'],
      theme: ['旅', 'null'],
      deepMeaning: '深い意味',
      confidence: 1,
    });
    expect(result.analyzedAt).toMatch(/T/);
  });
});

describe('runAnalysis', () => {
  it('前段落コンテキストを付与して実行する', async () => {
    const provider = {
      id: 'openai' as const,
      analyzeParagraph: vi.fn(async (input) => {
        return {
          paragraphId: input.paragraphId,
          emotion: [],
          theme: input.contextTexts,
          deepMeaning: input.text,
          confidence: 0.5,
          model: input.model,
          analyzedAt: '2026-04-21T00:00:00.000Z',
          promptVersion: input.promptVersion,
        } satisfies AnalysisResult;
      }),
    };

    const resolved: ResolvedAnalysisProvider = {
      id: 'openai',
      label: 'OpenAI',
      model: 'gpt-4.1-mini',
      provider,
    };

    const input: AnalysisRunInput = {
      documentId: 'doc-1',
      agentId: 'reader-quiet',
      personaMode: 'general-reader',
      promptVersion: 'v1.0.0',
      paragraphs: [
        { paragraphId: 'p1', order: 1, text: 'one' },
        { paragraphId: 'p2', order: 2, text: 'two' },
        { paragraphId: 'p3', order: 3, text: 'three' },
      ],
      documentParagraphs: [
        { paragraphId: 'p1', order: 1, text: 'one' },
        { paragraphId: 'p2', order: 2, text: 'two' },
        { paragraphId: 'p3', order: 3, text: 'three' },
      ],
    };

    const result = await runAnalysis(input, resolved, testAgent);

    expect(provider.analyzeParagraph).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        paragraphId: 'p2',
        agent: testAgent,
        model: 'gpt-4.1-mini',
        temperature: 0.7,
        contextTexts: ['one'],
      }),
    );
    expect(provider.analyzeParagraph).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        paragraphId: 'p3',
        contextTexts: ['one', 'two'],
      }),
    );
    expect(result.results).toHaveLength(3);
    expect(result.agentId).toBe('reader-quiet');
  });

  it('OpenAI 解析では全文と安定した prompt cache key を段落ごとに渡す', async () => {
    const provider = {
      id: 'openai' as const,
      analyzeParagraph: vi.fn(async (input) => ({
        paragraphId: input.paragraphId,
        emotion: [],
        theme: [],
        deepMeaning: input.text,
        confidence: 0.5,
        model: input.model,
        analyzedAt: '2026-04-21T00:00:00.000Z',
        promptVersion: input.promptVersion,
      })),
    };
    const resolved: ResolvedAnalysisProvider = {
      id: 'openai',
      label: 'OpenAI',
      model: 'gpt-5.4',
      provider,
    };
    const input: AnalysisRunInput = {
      documentId: 'doc-1',
      agentId: 'reader-quiet',
      personaMode: 'general-reader',
      promptVersion: 'v1.0.0',
      paragraphs: [
        { paragraphId: 'p1', order: 1, text: 'one' },
        { paragraphId: 'p2', order: 2, text: 'two' },
      ],
      documentParagraphs: [
        { paragraphId: 'p1', order: 1, text: 'one' },
        { paragraphId: 'p2', order: 2, text: 'two' },
        { paragraphId: 'p3', order: 3, text: 'three' },
      ],
    };

    await runAnalysis(input, resolved, testAgent);

    const first = provider.analyzeParagraph.mock.calls[0]?.[0];
    const second = provider.analyzeParagraph.mock.calls[1]?.[0];
    expect(first.documentTexts).toEqual(['one', 'two', 'three']);
    expect(second.documentTexts).toEqual(['one', 'two', 'three']);
    expect(first.promptCacheKey).toMatch(/^llz:[a-f0-9]{48}$/);
    expect(second.promptCacheKey).toBe(first.promptCacheKey);

    await runAnalysis(
      {
        ...input,
        documentParagraphs: [
          { paragraphId: 'p1', order: 1, text: 'one changed' },
          { paragraphId: 'p2', order: 2, text: 'two' },
          { paragraphId: 'p3', order: 3, text: 'three' },
        ],
      },
      resolved,
      testAgent,
    );

    expect(provider.analyzeParagraph.mock.calls[2]?.[0].promptCacheKey).not.toBe(first.promptCacheKey);
  });

  it('agent model override を使う', async () => {
    const provider = {
      id: 'openai' as const,
      analyzeParagraph: vi.fn(async (input) => ({
        paragraphId: input.paragraphId,
        emotion: [],
        theme: [],
        deepMeaning: input.text,
        confidence: 0.5,
        model: input.model,
        analyzedAt: '2026-04-21T00:00:00.000Z',
        promptVersion: input.promptVersion,
      })),
    };
    const resolved: ResolvedAnalysisProvider = {
      id: 'openai',
      label: 'OpenAI',
      model: 'gpt-default',
      provider,
    };
    const agent = { ...testAgent, model: 'gpt-agent', temperature: 0.4 };

    await runAnalysis(
      {
        documentId: 'doc-1',
        agentId: agent.id,
        personaMode: 'general-reader',
        promptVersion: 'v1.0.0',
        paragraphs: [{ paragraphId: 'p1', order: 1, text: 'one' }],
        documentParagraphs: [{ paragraphId: 'p1', order: 1, text: 'one' }],
      },
      resolved,
      agent,
    );

    expect(provider.analyzeParagraph).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'gpt-agent', temperature: 0.4 }),
    );
  });

  it('既定 provider と不整合な既知 model override は通常分析で外部 provider に送らない', async () => {
    const provider = {
      id: 'openai' as const,
      analyzeParagraph: vi.fn(),
    };
    const resolved: ResolvedAnalysisProvider = {
      id: 'openai',
      label: 'OpenAI',
      model: 'gpt-5.4',
      provider,
    };
    const agent = { ...testAgent, model: 'claude-sonnet-4-6' };

    await expect(
      runAnalysis(
        {
          documentId: 'doc-1',
          agentId: agent.id,
          personaMode: 'general-reader',
          promptVersion: 'v1.0.0',
          paragraphs: [{ paragraphId: 'p1', order: 1, text: 'one' }],
          documentParagraphs: [{ paragraphId: 'p1', order: 1, text: 'one' }],
        },
        resolved,
        agent,
      ),
    ).rejects.toThrow('Anthropic 用です');

    expect(provider.analyzeParagraph).not.toHaveBeenCalled();
  });

  it('最初の失敗時だけ 1 回リトライする', async () => {
    const provider = {
      id: 'openai' as const,
      analyzeParagraph: vi
        .fn()
        .mockRejectedValueOnce(new Error('temporary'))
        .mockImplementation(async (input) => ({
          paragraphId: input.paragraphId,
          emotion: [],
          theme: [],
          deepMeaning: input.text,
          confidence: 0.5,
          model: input.model,
          analyzedAt: '2026-04-21T00:00:00.000Z',
          promptVersion: input.promptVersion,
        })),
    };

    const resolved: ResolvedAnalysisProvider = {
      id: 'openai',
      label: 'OpenAI',
      model: 'gpt-4.1-mini',
      provider,
    };

    await runAnalysis(
      {
        documentId: 'doc-1',
        agentId: 'reader-quiet',
        personaMode: 'general-reader',
        promptVersion: 'v1.0.0',
        paragraphs: [{ paragraphId: 'p1', order: 1, text: 'one' }],
        documentParagraphs: [{ paragraphId: 'p1', order: 1, text: 'one' }],
      },
      resolved,
      testAgent,
    );

    expect(provider.analyzeParagraph).toHaveBeenCalledTimes(2);
  });

  it('途中の一時失敗では成功済み段落を再送せず、リトライ成功も progress へ流す', async () => {
    const progress = vi.fn();
    const provider = {
      id: 'openai' as const,
      analyzeParagraph: vi.fn(async (input) => {
        if (input.paragraphId === 'p2' && provider.analyzeParagraph.mock.calls.filter(([call]) => call.paragraphId === 'p2').length === 1) {
          throw new Error('temporary p2');
        }
        return {
          paragraphId: input.paragraphId,
          emotion: [],
          theme: [],
          deepMeaning: input.text,
          confidence: 0.5,
          model: input.model,
          analyzedAt: '2026-04-21T00:00:00.000Z',
          promptVersion: input.promptVersion,
        } satisfies AnalysisResult;
      }),
    };
    const resolved: ResolvedAnalysisProvider = {
      id: 'openai',
      label: 'OpenAI',
      model: 'gpt-4.1-mini',
      provider,
    };

    const result = await runAnalysis(
      {
        documentId: 'doc-1',
        agentId: 'reader-quiet',
        personaMode: 'general-reader',
        promptVersion: 'v1.0.0',
        paragraphs: [
          { paragraphId: 'p1', order: 1, text: 'one' },
          { paragraphId: 'p2', order: 2, text: 'two' },
          { paragraphId: 'p3', order: 3, text: 'three' },
        ],
        documentParagraphs: [
          { paragraphId: 'p1', order: 1, text: 'one' },
          { paragraphId: 'p2', order: 2, text: 'two' },
          { paragraphId: 'p3', order: 3, text: 'three' },
        ],
      },
      resolved,
      testAgent,
      progress,
    );

    expect(provider.analyzeParagraph.mock.calls.map(([call]) => call.paragraphId)).toEqual([
      'p1',
      'p2',
      'p2',
      'p3',
    ]);
    expect(result.results.map((item) => item.paragraphId)).toEqual(['p1', 'p2', 'p3']);
    expect(progress).toHaveBeenCalledTimes(3);
    expect(progress.mock.calls.map(([item]) => item.paragraphId)).toEqual(['p1', 'p2', 'p3']);
  });
});

describe('dryRunReadingAgent', () => {
  it('agent draft を保存せずに1段落だけ解析する', async () => {
    const provider = {
      id: 'openai' as const,
      analyzeParagraph: vi.fn(async (input) => ({
        paragraphId: input.paragraphId,
        emotion: [],
        theme: input.contextTexts,
        deepMeaning: input.text,
        confidence: 0.5,
        model: input.model,
        analyzedAt: '2026-04-21T00:00:00.000Z',
        promptVersion: input.promptVersion,
      })),
    };
    const resolved: ResolvedAnalysisProvider = {
      id: 'openai',
      label: 'OpenAI',
      model: 'gpt-default',
      provider,
    };

    const result = await dryRunReadingAgent(
      {
        agent: { ...testAgent, id: undefined, model: 'draft-model', temperature: 0.2 },
        paragraph: { paragraphId: 'p2', order: 2, text: 'two' },
        documentParagraphs: [
          { paragraphId: 'p1', order: 1, text: 'one' },
          { paragraphId: 'p2', order: 2, text: 'two' },
        ],
        promptVersion: 'v1.0.0',
      },
      resolved,
    );

    expect(provider.analyzeParagraph).toHaveBeenCalledWith(
      expect.objectContaining({
        paragraphId: 'p2',
        model: 'draft-model',
        temperature: 0.2,
        contextTexts: ['one'],
      }),
    );
    expect(result.paragraphId).toBe('p2');
  });

  it('既定 provider と不整合な既知 model override は dry-run でも外部 provider に送らない', async () => {
    const provider = {
      id: 'anthropic' as const,
      analyzeParagraph: vi.fn(),
    };
    const resolved: ResolvedAnalysisProvider = {
      id: 'anthropic',
      label: 'Anthropic',
      model: 'claude-sonnet-4-6',
      provider,
    };

    await expect(
      dryRunReadingAgent(
        {
          agent: { ...testAgent, id: undefined, model: 'gpt-5.4' },
          paragraph: { paragraphId: 'p2', order: 2, text: 'two' },
          documentParagraphs: [
            { paragraphId: 'p1', order: 1, text: 'one' },
            { paragraphId: 'p2', order: 2, text: 'two' },
          ],
          promptVersion: 'v1.0.0',
        },
        resolved,
      ),
    ).rejects.toThrow('OpenAI 用です');

    expect(provider.analyzeParagraph).not.toHaveBeenCalled();
  });
});

describe('buildContextTexts', () => {
  it('preceding lastN で最大N件まで前段落だけ返す', () => {
    const paragraphs = Array.from({ length: 12 }, (_, index) => ({
      paragraphId: `p${index + 1}`,
      order: index + 1,
      text: `text-${index + 1}`,
    }));

    expect(buildContextTexts(paragraphs, 'p12', { mode: 'preceding', range: 'lastN', lastN: 7 })).toEqual([
      'text-5',
      'text-6',
      'text-7',
      'text-8',
      'text-9',
      'text-10',
      'text-11',
    ]);
  });

  it('既定では対象以外の文書全体を context として返す', () => {
    const paragraphs = [
      { paragraphId: 'p1', order: 1, text: 'one' },
      { paragraphId: 'p2', order: 2, text: 'two' },
      { paragraphId: 'p3', order: 3, text: 'three' },
      { paragraphId: 'p4', order: 4, text: 'four' },
    ];

    expect(buildContextTexts(paragraphs, 'p4')).toEqual(['one', 'two', 'three']);
  });

  it('対象段落が見つからないときは空配列を返す', () => {
    const paragraphs = [
      { paragraphId: 'p1', order: 1, text: 'one' },
      { paragraphId: 'p2', order: 2, text: 'two' },
    ];

    expect(buildContextTexts(paragraphs, 'missing')).toEqual([]);
  });

  it('target-only は context を返さない', () => {
    const paragraphs = [
      { paragraphId: 'p1', order: 1, text: 'a1', chapterId: 'c1' },
      { paragraphId: 'p2', order: 2, text: 'a2', chapterId: 'c1' },
      { paragraphId: 'p3', order: 3, text: 'b1', chapterId: 'c2' },
      { paragraphId: 'p4', order: 4, text: 'b2', chapterId: 'c2' },
    ];

    expect(
      buildContextTexts(paragraphs, 'p4', {
        mode: 'target-only',
      }),
    ).toEqual([]);
  });

  it('preceding all では件数制限なしで前段落を全件返す', () => {
    const paragraphs = Array.from({ length: 15 }, (_, index) => ({
      paragraphId: `p${index + 1}`,
      order: index + 1,
      text: `t${index + 1}`,
    }));

    const result = buildContextTexts(paragraphs, 'p15', {
      mode: 'preceding',
      range: 'all',
    });

    expect(result).toHaveLength(14);
    expect(result[0]).toBe('t1');
    expect(result[result.length - 1]).toBe('t14');
  });

  it('preceding lastN は指定件数を超えない', () => {
    const paragraphs = Array.from({ length: 8 }, (_, index) => ({
      paragraphId: `p${index + 1}`,
      order: index + 1,
      text: `t${index + 1}`,
    }));

    expect(
      buildContextTexts(paragraphs, 'p8', {
        mode: 'preceding',
        range: 'lastN',
        lastN: 3,
      }),
    ).toEqual(['t5', 't6', 't7']);
  });

  it('whole-document は対象を重複させず、対象より後の段落も含める', () => {
    const paragraphs = [
      { paragraphId: 'p1', order: 1, text: 'one' },
      { paragraphId: 'p2', order: 2, text: 'two' },
      { paragraphId: 'p3', order: 3, text: 'three' },
    ];

    expect(
      buildContextTexts(paragraphs, 'p2', {
        mode: 'whole-document',
      }),
    ).toEqual(['one', 'three']);
  });
});
