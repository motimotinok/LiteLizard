import fs from 'node:fs';
import path from 'node:path';
import {
  createAnthropicAnalysisProvider,
  createLocalLlmAnalysisProvider,
  createOpenAiAnalysisProvider,
} from '../src/main/analysisProvider.ts';
import type { AnalysisProviderId, ReadingAgentInput } from '@litelizard/shared';

type ProviderArg = AnalysisProviderId | 'all';

const repoRoot = path.resolve(import.meta.dirname, '../../..');
const envPath = path.join(repoRoot, '.env');

const defaultModels: Record<AnalysisProviderId, string> = {
  openai: 'gpt-5.4',
  anthropic: 'claude-sonnet-4-6',
  'local-llm': '',
};

function loadDotEnv(filePath: string) {
  if (!fs.existsSync(filePath)) return;

  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const separator = trimmed.indexOf('=');
    if (separator < 0) continue;

    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function parseProviderArg(): ProviderArg {
  const providerIndex = process.argv.findIndex((arg) => arg === '--provider');
  const value = providerIndex >= 0 ? process.argv[providerIndex + 1] : undefined;
  if (value === 'openai' || value === 'anthropic' || value === 'local-llm' || value === 'all') {
    return value;
  }

  throw new Error('Usage: tsx scripts/verify-analysis-provider.ts --provider openai|anthropic|local-llm|all');
}

function requireEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required but missing.`);
  }
  return value;
}

const agent: ReadingAgentInput = {
  name: '低コスト検証用の読者',
  role: '読者視点の短い反応を返す',
  systemPrompt:
    '日本語の短い本文を読み、感情、テーマ、深読みを簡潔に返してください。出力は指定されたJSON schemaに合わせてください。',
  model: '',
  contextPolicy: { mode: 'preceding', range: 'all' },
  tagDefinitions: [],
};

const sample = {
  paragraphId: 'p_verify001',
  text: '夜明け前の机に、書きかけの手紙だけが残っていた。',
  contextTexts: ['彼女は一晩中、返事を書くべきか迷っていた。'],
};

async function verifyProvider(providerId: AnalysisProviderId) {
  const model =
    providerId === 'openai'
      ? process.env.OPENAI_MODEL?.trim() || defaultModels.openai
      : providerId === 'anthropic'
        ? process.env.ANTHROPIC_MODEL?.trim() || defaultModels.anthropic
        : requireEnv('LOCAL_LLM_MODEL');

  const provider =
    providerId === 'openai'
      ? createOpenAiAnalysisProvider(requireEnv('OPENAI_API_KEY'))
      : providerId === 'anthropic'
        ? createAnthropicAnalysisProvider(requireEnv('ANTHROPIC_API_KEY'))
        : createLocalLlmAnalysisProvider(requireEnv('LOCAL_LLM_ENDPOINT'));

  const result = await provider.analyzeParagraph({
    paragraphId: sample.paragraphId,
    text: sample.text,
    agent,
    promptVersion: 'verify-live-2026-05-13',
    model,
    contextTexts: sample.contextTexts,
  });

  console.log(JSON.stringify({
    provider: providerId,
    model,
    paragraphId: result.paragraphId,
    responseLength: result.response.length,
    tagCount: Object.values(result.tags).flat().length,
    promptVersion: result.promptVersion,
    ok: true,
  }, null, 2));
}

loadDotEnv(envPath);
const providerArg = parseProviderArg();
const providers: AnalysisProviderId[] =
  providerArg === 'all' ? ['openai', 'anthropic', 'local-llm'] : [providerArg];

for (const provider of providers) {
  await verifyProvider(provider);
}
