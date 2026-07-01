import fs from 'node:fs/promises';
import path from 'node:path';
import {
  DEFAULT_ANALYSIS_SETTINGS,
  DEFAULT_EDITOR_TWEAKS,
  type AnalysisPanelMode,
  type AnalysisSettings,
  type AnalysisSettingsInput,
  type EditorTweaks,
  type EditorTypeface,
} from '@litelizard/shared';

const SETTINGS_FILE_NAME = 'analysis-settings.json';
const MIN_BODY_FONT_SIZE = 15;
const MAX_BODY_FONT_SIZE = 22;
const MIN_LINE_HEIGHT = 1.4;
const MAX_LINE_HEIGHT = 2.4;
const MIN_PAPER_WARMTH = 0;
const MAX_PAPER_WARMTH = 100;
const LEGACY_ANTHROPIC_DEFAULT_MODELS = new Set([
  'claude-3-5-sonnet-latest',
  'claude-haiku-4-5',
]);

function cloneDefaultSettings(): AnalysisSettings {
  return structuredClone(DEFAULT_ANALYSIS_SETTINGS);
}

function clampNumber(value: unknown, min: number, max: number, fallback: number) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.min(Math.max(value, min), max);
}

function normalizeAnthropicDefaultModel(input?: string | null) {
  const model = input?.trim();
  if (!model || LEGACY_ANTHROPIC_DEFAULT_MODELS.has(model)) {
    return DEFAULT_ANALYSIS_SETTINGS.providers.anthropic.defaultModel;
  }
  return model;
}

function normalizeEditorTweaks(input?: Partial<EditorTweaks> | null): EditorTweaks {
  const typeface: EditorTypeface =
    input?.typeface === 'serif' || input?.typeface === 'sans'
      ? input.typeface
      : DEFAULT_EDITOR_TWEAKS.typeface;
  const analysisPanelMode: AnalysisPanelMode =
    input?.analysisPanelMode === 'side' || input?.analysisPanelMode === 'overlay'
      ? input.analysisPanelMode
      : DEFAULT_EDITOR_TWEAKS.analysisPanelMode;

  return {
    typeface,
    bodyFontSize: clampNumber(
      input?.bodyFontSize,
      MIN_BODY_FONT_SIZE,
      MAX_BODY_FONT_SIZE,
      DEFAULT_EDITOR_TWEAKS.bodyFontSize,
    ),
    lineHeight: clampNumber(
      input?.lineHeight,
      MIN_LINE_HEIGHT,
      MAX_LINE_HEIGHT,
      DEFAULT_EDITOR_TWEAKS.lineHeight,
    ),
    paperWarmth: clampNumber(
      input?.paperWarmth,
      MIN_PAPER_WARMTH,
      MAX_PAPER_WARMTH,
      DEFAULT_EDITOR_TWEAKS.paperWarmth,
    ),
    analysisPanelMode,
  };
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
    analysisRunConfirmationEnabled:
      typeof input?.analysisRunConfirmationEnabled === 'boolean'
        ? input.analysisRunConfirmationEnabled
        : DEFAULT_ANALYSIS_SETTINGS.analysisRunConfirmationEnabled,
    providers: {
      openai: {
        defaultModel: input?.providers?.openai?.defaultModel?.trim() || DEFAULT_ANALYSIS_SETTINGS.providers.openai.defaultModel,
      },
      anthropic: {
        defaultModel: normalizeAnthropicDefaultModel(input?.providers?.anthropic?.defaultModel),
      },
    },
    localLlm: {
      endpoint: localEndpoint,
      defaultModel: localDefaultModel,
    },
    editorTweaks: normalizeEditorTweaks(input?.editorTweaks),
  };
}

export function mergeAnalysisSettings(
  input: AnalysisSettingsInput | Partial<AnalysisSettingsInput> | null | undefined,
  configured: { openai: boolean; anthropic: boolean },
): AnalysisSettings {
  const normalized = normalizeSettings(input);
  const settings = cloneDefaultSettings();

  settings.defaultProvider = normalized.defaultProvider;
  settings.analysisRunConfirmationEnabled = normalized.analysisRunConfirmationEnabled ?? true;
  settings.providers.openai.defaultModel = normalized.providers.openai.defaultModel;
  settings.providers.openai.apiKeyConfigured = configured.openai;
  settings.providers.anthropic.defaultModel = normalized.providers.anthropic.defaultModel;
  settings.providers.anthropic.apiKeyConfigured = configured.anthropic;
  settings.localLlm.endpoint = normalized.localLlm.endpoint;
  settings.localLlm.defaultModel = normalized.localLlm.defaultModel;
  settings.localLlm.configured = Boolean(normalized.localLlm.endpoint && normalized.localLlm.defaultModel);
  settings.editorTweaks = normalized.editorTweaks ?? { ...DEFAULT_EDITOR_TWEAKS };

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
