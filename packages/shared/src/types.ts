export type PersonaMode = 'friendly' | 'editor' | 'general-reader';

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

export interface ParagraphAnalysisPattern {
  analyzedAt: string;
  userPrompt?: string;
  result: Record<string, unknown>;
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
