import type { FastifyInstance } from 'fastify';
import { EmailLinkRequestSchema, EmailLinkVerifySchema } from '@litelizard/shared';
import { requestEmailLink, verifyEmailLink } from '../services/auth.js';

export async function authRoutes(app: FastifyInstance) {
  app.post('/v1/auth/email-link/request', async (request, reply) => {
    const parsed = EmailLinkRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: parsed.error.flatten().formErrors.join(', ') || 'Invalid request body',
          retryable: false,
        },
      });
    }

    const result = requestEmailLink(app.db, parsed.data.email);
    return reply.code(200).send({ requestId: result.requestId, devCode: result.devCode });
  });

  app.post('/v1/auth/email-link/verify', async (request, reply) => {
    const parsed = EmailLinkVerifySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: parsed.error.flatten().formErrors.join(', ') || 'Invalid request body',
          retryable: false,
        },
      });
    }

    try {
      const user = verifyEmailLink(app.db, parsed.data.email, parsed.data.requestId, parsed.data.code);
      const token = app.jwt.sign({ sub: user.id, email: user.email });
      return reply.code(200).send({
        accessToken: token,
        userId: user.id,
        email: user.email,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      });
    } catch (error) {
      return reply.code(400).send({
        error: {
          code: 'INVALID_EMAIL_LINK',
          message: error instanceof Error ? error.message : 'Invalid email link',
          retryable: true,
        },
      });
    }
  });
}
