import { describe, expect, it } from 'vitest';
import { DEFAULT_READING_AGENT_TEMPERATURE, ReadingAgentInputSchema, ReadingAgentSchema } from './api.js';

const validAgent = {
  id: 'reader-quiet',
  name: '静かな読者',
  role: '情緒や余韻を中心に短く読む',
  systemPrompt: 'あなたは静かな読者として、段落の余韻を短く分析します。',
  model: null,
  temperature: DEFAULT_READING_AGENT_TEMPERATURE,
  contextPolicy: { mode: 'whole-document' },
  tagDefinitions: [],
  createdAt: '2026-05-02T00:00:00.000Z',
  updatedAt: '2026-05-02T00:00:00.000Z',
  builtIn: true,
};

describe('ReadingAgent schemas', () => {
  it('accepts a valid persisted reading agent', () => {
    expect(ReadingAgentSchema.parse(validAgent)).toEqual(validAgent);
  });

  it('accepts valid editable reading agent input', () => {
    const input = {
      name: '担当編集',
      role: '売り・引っかかりを評価',
      systemPrompt: 'あなたは担当編集として、読者がつまずく点を指摘します。',
      model: 'claude-haiku-4-5-20251001',
      temperature: 0.4,
      contextPolicy: { mode: 'preceding', range: 'lastN', lastN: 3 },
    };

    expect(ReadingAgentInputSchema.parse(input)).toEqual({
      ...input,
      tagDefinitions: [],
    });
  });

  it('normalizes editable structured tag definitions', () => {
    const result = ReadingAgentInputSchema.parse({
      name: '担当編集',
      role: '売り・引っかかりを評価',
      systemPrompt: 'あなたは担当編集として、読者がつまずく点を指摘します。',
      model: null,
      temperature: 0.4,
      contextPolicy: { mode: 'whole-document' },
      tagDefinitions: [
        {
          id: ' Issue ',
          label: '問題',
          values: [
            { id: ' Strong ', label: '強み', color: '#6D8B6D' },
            { id: 'broken', label: '色なし', color: 'green' },
            { id: 'strong', label: '重複' },
          ],
        },
      ],
    });

    expect(result.tagDefinitions).toEqual([
      {
        id: 'issue',
        label: '問題',
        values: [
          { id: 'strong', label: '強み', color: '#6D8B6D' },
          { id: 'broken', label: '色なし' },
        ],
        system: false,
      },
    ]);
  });

  it('rejects legacy reading agents without contextPolicy', () => {
    const legacy = {
      id: 'reader-legacy',
      name: '旧読者',
      role: '旧形式',
      systemPrompt: '旧形式のプロンプトです。',
      createdAt: '2026-05-02T00:00:00.000Z',
      updatedAt: '2026-05-02T00:00:00.000Z',
      builtIn: false,
    };

    expect(ReadingAgentSchema.safeParse(legacy).success).toBe(false);
  });

  it('rejects out-of-range preceding lastN', () => {
    const result = ReadingAgentInputSchema.safeParse({
      name: '短い読者',
      role: '直前だけ読む',
      systemPrompt: '直前だけ読んでください。',
      model: null,
      temperature: 0.7,
      contextPolicy: { mode: 'preceding', range: 'lastN', lastN: 0 },
    });

    expect(result.success).toBe(false);
  });

  it('rejects out-of-range temperature', () => {
    const result = ReadingAgentInputSchema.safeParse({
      name: '高温読者',
      role: '揺らぎを見る',
      systemPrompt: '揺らぎを読んでください。',
      model: null,
      temperature: 1.5,
      contextPolicy: { mode: 'whole-document' },
    });

    expect(result.success).toBe(false);
  });

  it('rejects blank editable fields', () => {
    const result = ReadingAgentInputSchema.safeParse({
      name: '',
      role: ' ',
      systemPrompt: '',
      contextPolicy: { mode: 'whole-document' },
    });

    expect(result.success).toBe(false);
  });

  it('rejects invalid persisted metadata', () => {
    const result = ReadingAgentSchema.safeParse({
      ...validAgent,
      createdAt: 'not-a-date',
    });

    expect(result.success).toBe(false);
  });
});
