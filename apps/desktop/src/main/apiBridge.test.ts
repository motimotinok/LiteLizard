import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AnalysisResult, AnalysisRunInput } from '@litelizard/shared';
import { runAnalysis } from './apiBridge.js';
import {
  buildContextTexts,
  createLocalLlmAnalysisProvider,
  normalizeAnalysisPayload,
  resolveAnalysisProvider,
} from './analysisProvider.js';
import type { ResolvedAnalysisProvider } from './analysisProvider.js';

afterEach(() => {
  vi.unstubAllGlobals();
});

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
      personaMode: 'general-reader',
      promptVersion: 'v1',
      model: 'llama3.2',
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
      stream: boolean;
      keep_alive: string;
    };
    expect(requestBody).toMatchObject({
      model: 'llama3.2',
      stream: false,
      keep_alive: '30s',
    });
    expect(requestBody.prompt).toContain('Context paragraphs');
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
      personaMode: 'friendly',
      promptVersion: 'v1',
      model: 'llama3.2',
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
        personaMode: 'general-reader',
        promptVersion: 'v1',
        model: 'missing-model',
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
        personaMode: 'general-reader',
        promptVersion: 'v1',
        model: 'llama3.2',
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

    const result = await runAnalysis(input, resolved);

    expect(provider.analyzeParagraph).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        paragraphId: 'p2',
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
        personaMode: 'general-reader',
        promptVersion: 'v1.0.0',
        paragraphs: [{ paragraphId: 'p1', order: 1, text: 'one' }],
        documentParagraphs: [{ paragraphId: 'p1', order: 1, text: 'one' }],
      },
      resolved,
    );

    expect(provider.analyzeParagraph).toHaveBeenCalledTimes(2);
  });
});

describe('buildContextTexts', () => {
  it('最大10件まで前段落だけ返す', () => {
    const paragraphs = Array.from({ length: 12 }, (_, index) => ({
      paragraphId: `p${index + 1}`,
      order: index + 1,
      text: `text-${index + 1}`,
    }));

    expect(buildContextTexts(paragraphs, 'p12')).toEqual([
      'text-2',
      'text-3',
      'text-4',
      'text-5',
      'text-6',
      'text-7',
      'text-8',
      'text-9',
      'text-10',
      'text-11',
    ]);
  });

  it('対象だけを解析しても文書全体順序から context を拾える', () => {
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
});
