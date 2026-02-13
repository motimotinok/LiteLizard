import crypto from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { AnalysisRequestSchema } from '@litelizard/shared';
import { analyzeParagraphs } from '../services/analyzer.js';
import { assertRateLimit, finishJob, startJob } from '../services/rateLimit.js';
import { getTodayInputTokens, incrementUsage } from '../services/usage.js';

export async function analysisRoutes(app: FastifyInstance) {
  app.post('/v1/analysis/paragraphs', { preHandler: [app.authenticate] }, async (request, reply) => {
    const user = request.user as { sub: string; email: string };
    const parsed = AnalysisRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        requestId: `req_${crypto.randomUUID()}`,
        error: {
          code: 'VALIDATION_ERROR',
          message: parsed.error.issues.map((issue) => issue.message).join(', '),
          retryable: false,
        },
      });
    }

    const body = parsed.data;
    if (body.paragraphs.length > 20 || body.paragraphs.some((p) => p.text.length > 10000)) {
      return reply.code(400).send({
        requestId: `req_${crypto.randomUUID()}`,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Paragraph limits exceeded',
          retryable: false,
        },
      });
    }

    try {
      assertRateLimit(user.sub);
      startJob(user.sub);
    } catch {
      return reply.code(429).send({
        requestId: `req_${crypto.randomUUID()}`,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Request limit exceeded. Try again later.',
          retryable: true,
        },
      });
    }

    const estimatedInputTokens = body.paragraphs.reduce(
      (acc, paragraph) => acc + Math.ceil(paragraph.text.length / 4),
      0,
    );
    const todayUsedInputTokens = getTodayInputTokens(app.db, user.sub);
    if (todayUsedInputTokens + estimatedInputTokens > 200_000) {
      finishJob(user.sub);
      return reply.code(429).send({
        requestId: `req_${crypto.randomUUID()}`,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Daily token quota exceeded.',
          retryable: true,
        },
      });
    }

    const requestId = `req_${crypto.randomUUID()}`;

    app.db
      .prepare(
        `INSERT INTO analysis_requests (request_id, user_id, document_id, paragraph_count, model, prompt_version, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        requestId,
        user.sub,
        body.documentId,
        body.paragraphs.length,
        process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
        body.promptVersion,
        'pending',
        new Date().toISOString()
      );

    try {
      const analysis = await Promise.race([
        analyzeParagraphs(body),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Analysis timeout after 10s')), 10_000),
        ),
      ]);
      incrementUsage(app.db, user.sub, {
        inputTokens: analysis.inputTokens,
        outputTokens: analysis.outputTokens,
        estimatedCost: analysis.estimatedCost,
      });

      app.db
        .prepare(
          `UPDATE analysis_requests SET status = ?, finished_at = ?, model = ? WHERE request_id = ?`
        )
        .run('complete', new Date().toISOString(), analysis.model, requestId);

      return reply.code(200).send({
        requestId,
        documentId: body.documentId,
        personaMode: body.personaMode,
        promptVersion: body.promptVersion,
        results: analysis.results,
      });
    } catch (error) {
      app.db
        .prepare(
          `UPDATE analysis_requests SET status = ?, finished_at = ?, error_code = ? WHERE request_id = ?`
        )
        .run('failed', new Date().toISOString(), 'ANALYSIS_ABORTED', requestId);

      return reply.code(500).send({
        requestId,
        error: {
          code: 'ANALYSIS_ABORTED',
          message:
            error instanceof Error
              ? `At least one paragraph failed. No results were applied. ${error.message}`
              : 'At least one paragraph failed. No results were applied.',
          retryable: true,
        },
      });
    } finally {
      finishJob(user.sub);
    }
  });
}
