import fp from 'fastify-plugin';
import fastifyJwt from '@fastify/jwt';

export default fp(async (app) => {
  await app.register(fastifyJwt, {
    secret: process.env.JWT_SECRET ?? 'dev-only-change-me',
    sign: {
      expiresIn: '1h',
    },
  });

  app.decorate('authenticate', async (request: any, reply: any) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.code(401).send({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication is required',
          retryable: false,
        },
      });
    }
  });
});
