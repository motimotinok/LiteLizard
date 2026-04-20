import { describe, expect, it } from 'vitest';
import { DEFAULT_ANALYSIS_SETTINGS } from '@litelizard/shared';
import { mergeAnalysisSettings } from './analysisSettingsStore.js';

describe('mergeAnalysisSettings', () => {
  it('configured 状態を secret の有無から合成する', () => {
    const merged = mergeAnalysisSettings(
      {
        defaultProvider: 'anthropic',
        providers: {
          openai: { defaultModel: 'gpt-4.1-mini' },
          anthropic: { defaultModel: 'claude-3-7-sonnet-latest' },
        },
        localLlm: {
          endpoint: 'http://127.0.0.1:11434',
          defaultModel: 'llama3.2',
        },
      },
      { openai: true, anthropic: false },
    );

    expect(merged.defaultProvider).toBe('anthropic');
    expect(merged.providers.openai.apiKeyConfigured).toBe(true);
    expect(merged.providers.anthropic.apiKeyConfigured).toBe(false);
    expect(merged.localLlm.configured).toBe(true);
  });

  it('欠損値は default settings で補完する', () => {
    const merged = mergeAnalysisSettings(undefined, { openai: false, anthropic: false });

    expect(merged.providers.openai.defaultModel).toBe(DEFAULT_ANALYSIS_SETTINGS.providers.openai.defaultModel);
    expect(merged.localLlm.endpoint).toBe(DEFAULT_ANALYSIS_SETTINGS.localLlm.endpoint);
  });

  it('ローカル LLM 設定は空文字で解除できる', () => {
    const merged = mergeAnalysisSettings(
      {
        defaultProvider: 'local-llm',
        providers: {
          openai: { defaultModel: 'gpt-4o-mini' },
          anthropic: { defaultModel: 'claude-3-5-sonnet-latest' },
        },
        localLlm: {
          endpoint: '',
          defaultModel: '',
        },
      },
      { openai: false, anthropic: false },
    );

    expect(merged.localLlm.endpoint).toBe('');
    expect(merged.localLlm.defaultModel).toBe('');
    expect(merged.localLlm.configured).toBe(false);
  });
});
