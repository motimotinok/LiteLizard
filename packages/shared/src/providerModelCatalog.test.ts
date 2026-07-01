import { describe, expect, it } from 'vitest';
import {
  DEFAULT_ANALYSIS_SETTINGS,
  getProviderModelOptions,
  isKnownProviderModel,
} from './index.js';

describe('provider model catalog', () => {
  it('OpenAI の候補と既定モデルを保持する', () => {
    const options = getProviderModelOptions('openai');

    expect(options.map((option) => option.id)).toEqual([
      'gpt-5.5',
      'gpt-5.4',
      'gpt-5.4-mini',
      'gpt-5.4-nano',
    ]);
    expect(DEFAULT_ANALYSIS_SETTINGS.providers.openai.defaultModel).toBe('gpt-5.4');
    expect(isKnownProviderModel('openai', 'gpt-5.4')).toBe(true);
  });

  it('Anthropic の候補から現在使用不可のモデルを除外する', () => {
    const options = getProviderModelOptions('anthropic');

    expect(options.map((option) => option.id)).toEqual([
      'claude-opus-4-8',
      'claude-sonnet-4-6',
      'claude-haiku-4-5-20251001',
    ]);
    expect(DEFAULT_ANALYSIS_SETTINGS.providers.anthropic.defaultModel).toBe('claude-sonnet-4-6');
    expect(isKnownProviderModel('anthropic', 'claude-fable-5')).toBe(false);
  });

  it('候補外の保存済みモデルは custom として扱える', () => {
    expect(isKnownProviderModel('openai', 'gpt-4o-mini')).toBe(false);
    expect(isKnownProviderModel('anthropic', 'claude-3-7-sonnet-latest')).toBe(false);
  });
});
