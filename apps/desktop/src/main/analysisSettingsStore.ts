import fs from 'node:fs/promises';
import path from 'node:path';
import {
  DEFAULT_ANALYSIS_CONTEXT_POLICY,
  DEFAULT_ANALYSIS_SETTINGS,
  type AnalysisContextLimitMode,
  type AnalysisContextPolicy,
  type AnalysisContextScope,
  type AnalysisSettings,
  type AnalysisSettingsInput,
} from '@litelizard/shared';

const SETTINGS_FILE_NAME = 'analysis-settings.json';
const MIN_LAST_N = 1;
const MAX_LAST_N = 999;

function cloneDefaultSettings(): AnalysisSettings {
  return structuredClone(DEFAULT_ANALYSIS_SETTINGS);
}

function normalizeContextPolicy(
  input?: Partial<AnalysisContextPolicy> | null,
): AnalysisContextPolicy {
  const scope: AnalysisContextScope =
    input?.scope === 'chapter' || input?.scope === 'document'
      ? input.scope
      : DEFAULT_ANALYSIS_CONTEXT_POLICY.scope;
  const limitMode: AnalysisContextLimitMode =
    input?.limitMode === 'none' || input?.limitMode === 'lastN'
      ? input.limitMode
      : DEFAULT_ANALYSIS_CONTEXT_POLICY.limitMode;
  const rawLastN = input?.lastN;
  const lastN =
    typeof rawLastN === 'number' && Number.isFinite(rawLastN)
      ? Math.min(Math.max(Math.trunc(rawLastN), MIN_LAST_N), MAX_LAST_N)
      : DEFAULT_ANALYSIS_CONTEXT_POLICY.lastN;
  return { scope, limitMode, lastN };
}

function normalizeSettings(input?: Partial<AnalysisSettingsInput> | null): AnalysisSettingsInput {
  const localEndpoint =
    input?.localLlm?.endpoint === undefined
      ? DEFAULT_ANALYSIS_SETTINGS.localLlm.endpoint
      : input.localLlm.endpoint.trim();
  const localDefaultModel =
    input?.localLlm?.defaultModel === undefined
      ? DEFAULT_ANALYSIS_SETTINGS.localLlm.defaultModel
      : input.localLlm.defaultModel.trim();

  return {
    defaultProvider: input?.defaultProvider ?? DEFAULT_ANALYSIS_SETTINGS.defaultProvider,
    providers: {
      openai: {
        defaultModel: input?.providers?.openai?.defaultModel?.trim() || DEFAULT_ANALYSIS_SETTINGS.providers.openai.defaultModel,
      },
      anthropic: {
        defaultModel:
          input?.providers?.anthropic?.defaultModel?.trim() || DEFAULT_ANALYSIS_SETTINGS.providers.anthropic.defaultModel,
      },
    },
    localLlm: {
      endpoint: localEndpoint,
      defaultModel: localDefaultModel,
    },
    contextPolicy: normalizeContextPolicy(input?.contextPolicy),
  };
}

export function mergeAnalysisSettings(
  input: AnalysisSettingsInput | Partial<AnalysisSettingsInput> | null | undefined,
  configured: { openai: boolean; anthropic: boolean },
): AnalysisSettings {
  const normalized = normalizeSettings(input);
  const settings = cloneDefaultSettings();

  settings.defaultProvider = normalized.defaultProvider;
  settings.providers.openai.defaultModel = normalized.providers.openai.defaultModel;
  settings.providers.openai.apiKeyConfigured = configured.openai;
  settings.providers.anthropic.defaultModel = normalized.providers.anthropic.defaultModel;
  settings.providers.anthropic.apiKeyConfigured = configured.anthropic;
  settings.localLlm.endpoint = normalized.localLlm.endpoint;
  settings.localLlm.defaultModel = normalized.localLlm.defaultModel;
  settings.localLlm.configured = Boolean(normalized.localLlm.endpoint && normalized.localLlm.defaultModel);
  // normalizeSettings 内で必ず値を埋めているが、型上 optional のため fallback を残す
  settings.contextPolicy = normalized.contextPolicy ?? { ...DEFAULT_ANALYSIS_CONTEXT_POLICY };

  return settings;
}

export function createAnalysisSettingsStore(userDataPath: string) {
  const settingsPath = path.join(userDataPath, SETTINGS_FILE_NAME);

  return {
    async load(): Promise<AnalysisSettingsInput> {
      try {
        const raw = await fs.readFile(settingsPath, 'utf8');
        return normalizeSettings(JSON.parse(raw) as Partial<AnalysisSettingsInput>);
      } catch (error) {
        if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
          return normalizeSettings();
        }
        throw error;
      }
    },

    async save(input: AnalysisSettingsInput) {
      const normalized = normalizeSettings(input);
      await fs.mkdir(userDataPath, { recursive: true });
      await fs.writeFile(settingsPath, JSON.stringify(normalized, null, 2), 'utf8');
      return normalized;
    },
  };
}
