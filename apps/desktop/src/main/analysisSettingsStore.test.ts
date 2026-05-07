import { describe, expect, it } from 'vitest';
import {
  DEFAULT_ANALYSIS_CONTEXT_POLICY,
  DEFAULT_ANALYSIS_SETTINGS,
  DEFAULT_EDITOR_TWEAKS,
} from '@litelizard/shared';
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

  it('contextPolicy が未指定の場合は既定値で補完する', () => {
    const merged = mergeAnalysisSettings(undefined, { openai: false, anthropic: false });

    expect(merged.contextPolicy).toEqual(DEFAULT_ANALYSIS_CONTEXT_POLICY);
  });

  it('contextPolicy の有効な値はそのまま反映する', () => {
    const merged = mergeAnalysisSettings(
      {
        defaultProvider: 'openai',
        providers: {
          openai: { defaultModel: 'gpt-4o-mini' },
          anthropic: { defaultModel: 'claude-3-5-sonnet-latest' },
        },
        localLlm: { endpoint: 'http://x', defaultModel: 'm' },
        contextPolicy: { scope: 'chapter', limitMode: 'lastN', lastN: 3 },
      },
      { openai: false, anthropic: false },
    );

    expect(merged.contextPolicy).toEqual({ scope: 'chapter', limitMode: 'lastN', lastN: 3 });
  });

  it('contextPolicy の不正値は既定値にフォールバックし lastN は範囲内にクランプする', () => {
    const merged = mergeAnalysisSettings(
      {
        defaultProvider: 'openai',
        providers: {
          openai: { defaultModel: 'gpt-4o-mini' },
          anthropic: { defaultModel: 'claude-3-5-sonnet-latest' },
        },
        localLlm: { endpoint: 'http://x', defaultModel: 'm' },
        contextPolicy: {
          // 不正値を意図的に渡す
          scope: 'invalid' as unknown as 'document',
          limitMode: 'invalid' as unknown as 'lastN',
          lastN: 5_000,
        },
      },
      { openai: false, anthropic: false },
    );

    expect(merged.contextPolicy.scope).toBe(DEFAULT_ANALYSIS_CONTEXT_POLICY.scope);
    expect(merged.contextPolicy.limitMode).toBe(DEFAULT_ANALYSIS_CONTEXT_POLICY.limitMode);
    expect(merged.contextPolicy.lastN).toBe(999);
  });

  it('editorTweaks が未指定の場合は既定値で補完する', () => {
    const merged = mergeAnalysisSettings(undefined, { openai: false, anthropic: false });

    expect(merged.editorTweaks).toEqual(DEFAULT_EDITOR_TWEAKS);
  });

  it('editorTweaks の有効な値はそのまま反映する', () => {
    const merged = mergeAnalysisSettings(
      {
        defaultProvider: 'openai',
        providers: {
          openai: { defaultModel: 'gpt-4o-mini' },
          anthropic: { defaultModel: 'claude-3-5-sonnet-latest' },
        },
        localLlm: { endpoint: 'http://x', defaultModel: 'm' },
        editorTweaks: {
          typeface: 'sans',
          bodyFontSize: 19,
          lineHeight: 2.1,
          paperWarmth: 72,
          analysisPanelMode: 'overlay',
        },
      },
      { openai: false, anthropic: false },
    );

    expect(merged.editorTweaks).toEqual({
      typeface: 'sans',
      bodyFontSize: 19,
      lineHeight: 2.1,
      paperWarmth: 72,
      analysisPanelMode: 'overlay',
    });
  });

  it('editorTweaks の不正値は既定値に戻し、数値は安全範囲にクランプする', () => {
    const merged = mergeAnalysisSettings(
      {
        defaultProvider: 'openai',
        providers: {
          openai: { defaultModel: 'gpt-4o-mini' },
          anthropic: { defaultModel: 'claude-3-5-sonnet-latest' },
        },
        localLlm: { endpoint: 'http://x', defaultModel: 'm' },
        editorTweaks: {
          typeface: 'invalid' as unknown as 'serif',
          bodyFontSize: 30,
          lineHeight: 0.8,
          paperWarmth: 120,
          analysisPanelMode: 'invalid' as unknown as 'side',
        },
      },
      { openai: false, anthropic: false },
    );

    expect(merged.editorTweaks).toEqual({
      ...DEFAULT_EDITOR_TWEAKS,
      bodyFontSize: 22,
      lineHeight: 1.4,
      paperWarmth: 100,
    });
  });
});
