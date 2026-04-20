import fs from 'node:fs/promises';
import path from 'node:path';
import {
  DEFAULT_ANALYSIS_SETTINGS,
  type AnalysisSettings,
  type AnalysisSettingsInput,
} from '@litelizard/shared';

const SETTINGS_FILE_NAME = 'analysis-settings.json';

function cloneDefaultSettings(): AnalysisSettings {
  return structuredClone(DEFAULT_ANALYSIS_SETTINGS);
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
