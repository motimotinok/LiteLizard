import type { FastifyInstance } from 'fastify';
import { getUsage } from '../services/usage.js';

export async function meRoutes(app: FastifyInstance) {
  app.get('/v1/me/usage', { preHandler: [app.authenticate] }, async (request, reply) => {
    const user = request.user as { sub: string };
    const usage = getUsage(app.db, user.sub);
    return reply.code(200).send(usage);
  });
}
