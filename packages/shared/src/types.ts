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
  light: {
    text: string;
    charCount?: number;
  };
  lizard: LizardData;
}

export interface LiteLizardDocument {
  version: 1;
  documentId: string;
  title: string;
  personaMode: PersonaMode;
  createdAt: string;
  updatedAt: string;
  source?: {
    format: 'litelizard-json';
    originPath?: string;
  };
  paragraphs: Paragraph[];
  meta?: {
    tags?: string[];
  };
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
