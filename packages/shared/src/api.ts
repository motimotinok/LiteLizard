import { z } from 'zod';
import { normalizeReadingAgentTagDefinitions } from './analysisTags.js';

export const AnalysisParagraphSchema = z.object({
  paragraphId: z.string().min(1),
  order: z.number().int().positive().optional(),
  text: z.string().min(1).max(10_000),
  // chapter scope ポリシー判定で利用。古いクライアントとの互換のため optional。
  chapterId: z.string().min(1).optional(),
});

export const AnalysisRequestSchema = z.object({
  documentId: z.string().min(1),
  agentId: z.string().min(1),
  personaMode: z.enum(['friendly', 'editor', 'general-reader']).default('general-reader'),
  promptVersion: z.string().min(1),
  additionalInstruction: z.string().trim().max(2_000).optional(),
  paragraphs: z.array(AnalysisParagraphSchema).min(1).max(20),
  documentParagraphs: z.array(AnalysisParagraphSchema).min(1),
});

export const AnalysisResultSchema = z.object({
  paragraphId: z.string().min(1),
  response: z.string().min(1).max(4_000),
  tags: z.record(z.array(z.string()).max(16)).default({}),
  model: z.string().min(1),
  analyzedAt: z.string().datetime(),
  promptVersion: z.string().min(1),
});

export const AnalysisSuccessSchema = z.object({
  requestId: z.string().min(1),
  documentId: z.string().min(1),
  agentId: z.string().min(1),
  personaMode: z.enum(['friendly', 'editor', 'general-reader']),
  promptVersion: z.string().min(1),
  results: z.array(AnalysisResultSchema),
});

const AnalysisContextPolicySchema = z.union([
  z.object({
    mode: z.literal('target-only'),
  }),
  z.object({
    mode: z.literal('preceding'),
    range: z.literal('all'),
  }),
  z.object({
    mode: z.literal('preceding'),
    range: z.literal('lastN'),
    lastN: z.number().int().min(1).max(999),
  }),
  z.object({
    mode: z.literal('whole-document'),
  }),
]);

const ReadingAgentModelSchema = z.preprocess(
  (value) => {
    if (typeof value === 'string' && value.trim().length === 0) {
      return null;
    }
    return value;
  },
  z.string().trim().min(1).max(120).nullable().default(null),
);

const ReadingAgentTagDefinitionsSchema = z.preprocess(
  normalizeReadingAgentTagDefinitions,
  z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      values: z.array(
        z.object({
          id: z.string(),
          label: z.string(),
          color: z.string().optional(),
        }),
      ),
      system: z.boolean().optional(),
    }),
  ).default([]),
);

export const ReadingAgentInputSchema = z.object({
  name: z.string().trim().min(1).max(80),
  role: z.string().trim().min(1).max(240),
  systemPrompt: z.string().trim().min(1).max(8_000),
  model: ReadingAgentModelSchema,
  contextPolicy: AnalysisContextPolicySchema,
  tagDefinitions: ReadingAgentTagDefinitionsSchema,
});

export const ReadingAgentSchema = ReadingAgentInputSchema.extend({
  id: z.string().trim().min(1).max(120),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  builtIn: z.boolean(),
});

export type AnalysisRequest = z.infer<typeof AnalysisRequestSchema>;
export type AnalysisParagraph = z.infer<typeof AnalysisParagraphSchema>;
export type AnalysisResult = z.infer<typeof AnalysisResultSchema>;
export type AnalysisSuccess = z.infer<typeof AnalysisSuccessSchema>;
export type AnalysisRunInput = AnalysisRequest;
export type AnalysisRunResult = AnalysisSuccess;
export type ReadingAgentInputPayload = z.infer<typeof ReadingAgentInputSchema>;
export type ReadingAgentPayload = z.infer<typeof ReadingAgentSchema>;
