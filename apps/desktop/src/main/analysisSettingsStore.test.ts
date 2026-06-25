import { describe, expect, it } from 'vitest';
import {
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
    expect(merged.providers.anthropic.defaultModel).toBe(DEFAULT_ANALYSIS_SETTINGS.providers.anthropic.defaultModel);
    expect(merged.localLlm.endpoint).toBe(DEFAULT_ANALYSIS_SETTINGS.localLlm.endpoint);
  });

  it('旧 Anthropic 既定モデルは Claude Haiku 4.5 の API ID に移行する', () => {
    const merged = mergeAnalysisSettings(
      {
        defaultProvider: 'anthropic',
        providers: {
          openai: { defaultModel: 'gpt-4o-mini' },
          anthropic: { defaultModel: 'claude-3-5-sonnet-latest' },
        },
        localLlm: {
          endpoint: 'http://127.0.0.1:11434',
          defaultModel: 'llama3.2',
        },
      },
      { openai: false, anthropic: false },
    );

    expect(merged.providers.anthropic.defaultModel).toBe(DEFAULT_ANALYSIS_SETTINGS.providers.anthropic.defaultModel);
  });

  it('短い Anthropic placeholder 値は Claude Haiku 4.5 の API ID に移行する', () => {
    const merged = mergeAnalysisSettings(
      {
        defaultProvider: 'anthropic',
        providers: {
          openai: { defaultModel: 'gpt-4o-mini' },
          anthropic: { defaultModel: 'claude-haiku-4-5' },
        },
        localLlm: {
          endpoint: 'http://127.0.0.1:11434',
          defaultModel: 'llama3.2',
        },
      },
      { openai: false, anthropic: false },
    );

    expect(merged.providers.anthropic.defaultModel).toBe(DEFAULT_ANALYSIS_SETTINGS.providers.anthropic.defaultModel);
  });

  it('ローカル LLM 設定は空文字で解除できる', () => {
    const merged = mergeAnalysisSettings(
      {
        defaultProvider: 'local-llm',
        providers: {
          openai: { defaultModel: 'gpt-4o-mini' },
          anthropic: { defaultModel: 'claude-haiku-4-5-20251001' },
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

  it('旧 contextPolicy は分析設定へ残さない', () => {
    const legacySettings = {
      defaultProvider: 'openai',
      providers: {
        openai: { defaultModel: 'gpt-4o-mini' },
        anthropic: { defaultModel: 'claude-haiku-4-5-20251001' },
      },
      localLlm: { endpoint: 'http://x', defaultModel: 'm' },
      contextPolicy: { scope: 'chapter', limitMode: 'lastN', lastN: 3 },
    } as never;
    const merged = mergeAnalysisSettings(legacySettings, { openai: false, anthropic: false });

    expect('contextPolicy' in merged).toBe(false);
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
          anthropic: { defaultModel: 'claude-haiku-4-5-20251001' },
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
          anthropic: { defaultModel: 'claude-haiku-4-5-20251001' },
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
