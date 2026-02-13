import type { Database } from 'better-sqlite3';

declare module 'fastify' {
  interface FastifyInstance {
    db: Database;
    authenticate: (request: unknown, reply: unknown) => Promise<void>;
  }
}
