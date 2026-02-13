import { z } from 'zod';
import type { PersonaMode, UsageResponse } from './types.js';

export const EmailLinkRequestSchema = z.object({
  email: z.string().email(),
});

export const EmailLinkVerifySchema = z.object({
  email: z.string().email(),
  code: z.string().min(6).max(6),
  requestId: z.string().min(1),
});

export const AnalysisParagraphSchema = z.object({
  paragraphId: z.string().min(1),
  order: z.number().int().positive().optional(),
  text: z.string().min(1).max(10_000),
});

export const AnalysisRequestSchema = z.object({
  documentId: z.string().min(1),
  personaMode: z.enum(['friendly', 'editor', 'general-reader']).default('general-reader'),
  promptVersion: z.string().min(1),
  paragraphs: z.array(AnalysisParagraphSchema).min(1).max(20),
});

export const AnalysisResultSchema = z.object({
  paragraphId: z.string().min(1),
  emotion: z.array(z.string()).max(8),
  theme: z.array(z.string()).max(8),
  deepMeaning: z.string().max(1000),
  confidence: z.number().min(0).max(1),
  model: z.string().min(1),
  analyzedAt: z.string().datetime(),
  promptVersion: z.string().min(1),
});

export const AnalysisSuccessSchema = z.object({
  requestId: z.string().min(1),
  documentId: z.string().min(1),
  personaMode: z.enum(['friendly', 'editor', 'general-reader']),
  promptVersion: z.string().min(1),
  results: z.array(AnalysisResultSchema),
});

export const ApiErrorSchema = z.object({
  requestId: z.string().min(1).optional(),
  error: z.object({
    code: z.string().min(1),
    message: z.string().min(1),
    retryable: z.boolean().optional(),
  }),
});

export type AnalysisRequest = z.infer<typeof AnalysisRequestSchema>;
export type AnalysisResult = z.infer<typeof AnalysisResultSchema>;
export type AnalysisSuccess = z.infer<typeof AnalysisSuccessSchema>;
export type ApiError = z.infer<typeof ApiErrorSchema>;
export type AnalysisRunInput = AnalysisRequest;
export type AnalysisRunResult = AnalysisSuccess;
export type EmailLinkRequest = z.infer<typeof EmailLinkRequestSchema>;
export type EmailLinkVerify = z.infer<typeof EmailLinkVerifySchema>;
export type Persona = PersonaMode;
export type Usage = UsageResponse;

export const ERROR_CODES = {
  ANALYSIS_ABORTED: 'ANALYSIS_ABORTED',
  REVISION_MISMATCH: 'REVISION_MISMATCH',
  UNAUTHORIZED: 'UNAUTHORIZED',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;
