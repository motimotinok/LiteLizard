import type { AnalysisProviderId } from './types.js';

export type CloudAnalysisProviderId = Extract<AnalysisProviderId, 'openai' | 'anthropic'>;

export type ProviderModelTier = 'frontier' | 'balanced' | 'cost-effective';

export interface ProviderModelOption {
  id: string;
  label: string;
  description: string;
  tier: ProviderModelTier;
}

const PROVIDER_MODEL_OPTIONS = {
  openai: [
    {
      id: 'gpt-5.5',
      label: 'GPT-5.5',
      description: '最も複雑な推論やコーディング向け',
      tier: 'frontier',
    },
    {
      id: 'gpt-5.4',
      label: 'GPT-5.4',
      description: '日本語分析の品質と費用のバランス向け',
      tier: 'balanced',
    },
    {
      id: 'gpt-5.4-mini',
      label: 'GPT-5.4 mini',
      description: '低レイテンシ・低コスト寄り',
      tier: 'cost-effective',
    },
    {
      id: 'gpt-5.4-nano',
      label: 'GPT-5.4 nano',
      description: '最小コスト・最短応答向け',
      tier: 'cost-effective',
    },
  ],
  anthropic: [
    {
      id: 'claude-opus-4-8',
      label: 'Claude Opus 4.8',
      description: '複雑な分析や長い文脈の精読向け',
      tier: 'frontier',
    },
    {
      id: 'claude-sonnet-4-6',
      label: 'Claude Sonnet 4.6',
      description: '日本語分析の品質と費用のバランス向け',
      tier: 'balanced',
    },
    {
      id: 'claude-haiku-4-5-20251001',
      label: 'Claude Haiku 4.5',
      description: '軽量・高速な分析向け',
      tier: 'cost-effective',
    },
  ],
} as const satisfies Record<CloudAnalysisProviderId, readonly ProviderModelOption[]>;

export function getProviderModelOptions(providerId: CloudAnalysisProviderId): readonly ProviderModelOption[] {
  return PROVIDER_MODEL_OPTIONS[providerId];
}

export function isKnownProviderModel(providerId: CloudAnalysisProviderId, modelId: string): boolean {
  const normalizedModelId = modelId.trim();
  return getProviderModelOptions(providerId).some((option) => option.id === normalizedModelId);
}
