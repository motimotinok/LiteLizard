import { describe, expect, it } from 'vitest';
import { ReadingAgentInputSchema, ReadingAgentSchema } from './api.js';

const validAgent = {
  id: 'reader-quiet',
  name: '静かな読者',
  role: '情緒や余韻を中心に短く読む',
  systemPrompt: 'あなたは静かな読者として、段落の余韻を短く分析します。',
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
    };

    expect(ReadingAgentInputSchema.parse(input)).toEqual(input);
  });

  it('rejects blank editable fields', () => {
    const result = ReadingAgentInputSchema.safeParse({
      name: '',
      role: ' ',
      systemPrompt: '',
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
