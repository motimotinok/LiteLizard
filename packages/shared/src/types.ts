export type PersonaMode = 'friendly' | 'editor' | 'general-reader';
export type AnalysisProviderId = 'openai' | 'anthropic' | 'local-llm';

export type LizardStatus = 'pending' | 'complete' | 'failed' | 'stale';

export interface LizardError {
  code: string;
  message: string;
}

export interface LizardData {
  status: LizardStatus;
  emotion?: string[];
  theme?: string[];
  deepMeaning?: string;
  confidence?: number;
  model?: string;
  requestId?: string;
  analyzedAt?: string;
  error?: LizardError;
}

export interface Paragraph {
  id: string;
  order: number;
  chapterId: string;
  light: {
    text: string;
    charCount?: number;
  };
  lizard: LizardData;
}

export interface Chapter {
  id: string;
  order: number;
  title: string;
}

export interface LiteLizardDocument {
  version: 2;
  documentId: string;
  title: string;
  personaMode: PersonaMode;
  createdAt: string;
  updatedAt: string;
  source?: {
    format: 'litelizard-json' | 'markdown-md' | 'lzl-v1';
    originPath?: string;
  };
  chapters: Chapter[];
  paragraphs: Paragraph[];
  meta?: {
    tags?: string[];
  };
}

export interface LiteLizardAnalysisParagraph {
  paragraphId: string;
  order: number;
  lizard: LizardData;
}

export interface LiteLizardAnalysisFile {
  version: 1;
  documentId: string;
  title: string;
  personaMode: PersonaMode;
  createdAt: string;
  updatedAt: string;
  paragraphs: LiteLizardAnalysisParagraph[];
}

// 新形式 .litelizard/analysis/{documentId}_NNN.json のルート構造
export interface GenerationalAnalysisFile {
  version: 1;
  documentId: string;
  generation: number;
  createdAt: string;
  updatedAt: string;
  paragraphs: Record<string, ParagraphAnalysisHistory>;
}

export interface ParagraphAnalysisHistory {
  // patterns[length - 1] が最新（デフォルト表示）
  patterns: ParagraphAnalysisPattern[];
}

/**
 * 段落分析結果の標準フィールド。
 * - 既存の保存済みデータとの互換のため、すべてのフィールドを optional にしている。
 * - `sourceText` は表示時に段落本文と一致するかを判定するために使う。
 * - 拡張フィールドは、想定外キーに気付きやすくするため index signature を持たせない。
 *   将来的に標準フィールドが増えた場合はこの interface に追記する。
 */
export interface ParagraphAnalysisResult {
  emotion?: string[];
  theme?: string[];
  deepMeaning?: string;
  confidence?: number;
  model?: string;
  sourceText?: string;
}

export interface ParagraphAnalysisPattern {
  analyzedAt: string;
  userPrompt?: string;
  result: ParagraphAnalysisResult;
}

export interface ReadingAgent {
  id: string;
  name: string;
  role: string;
  systemPrompt: string;
  model: string | null;
  temperature: number;
  createdAt: string;
  updatedAt: string;
  builtIn: boolean;
}

export interface ReadingAgentInput {
  name: string;
  role: string;
  systemPrompt: string;
  model: string | null;
  temperature: number;
}

export interface FileNode {
  path: string;
  name: string;
  type: 'file' | 'directory';
  children?: FileNode[];
}

export interface Session {
  accessToken: string;
  userId: string;
  email: string;
  expiresAt: string;
}

export interface UsageResponse {
  today: {
    requestCount: number;
    inputTokens: number;
    outputTokens: number;
    estimatedCost: number;
  };
  month: {
    requestCount: number;
    inputTokens: number;
    outputTokens: number;
    estimatedCost: number;
  };
}

export interface RevisionMismatchError {
  code: 'REVISION_MISMATCH';
  message: string;
}

export interface CloudProviderSettings {
  apiKeyConfigured: boolean;
  defaultModel: string;
}

export interface LocalLlmSettings {
  endpoint: string;
  defaultModel: string;
  configured: boolean;
}

export interface AnalysisSettings {
  defaultProvider: AnalysisProviderId;
  providers: {
    openai: CloudProviderSettings;
    anthropic: CloudProviderSettings;
  };
  localLlm: LocalLlmSettings;
}

export interface AnalysisSettingsInput {
  defaultProvider: AnalysisProviderId;
  providers: {
    openai: {
      defaultModel: string;
    };
    anthropic: {
      defaultModel: string;
    };
  };
  localLlm: {
    endpoint: string;
    defaultModel: string;
  };
}

export const DEFAULT_ANALYSIS_SETTINGS: AnalysisSettings = {
  defaultProvider: 'openai',
  providers: {
    openai: {
      apiKeyConfigured: false,
      defaultModel: 'gpt-4o-mini',
    },
    anthropic: {
      apiKeyConfigured: false,
      defaultModel: 'claude-3-5-sonnet-latest',
    },
  },
  localLlm: {
    endpoint: 'http://127.0.0.1:11434',
    defaultModel: 'llama3.1:8b',
    configured: false,
  },
};
