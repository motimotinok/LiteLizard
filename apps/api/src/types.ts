import type { FastifyInstance } from 'fastify';
import type { Database } from 'better-sqlite3';

export interface ApiContext {
  db: Database;
  app: FastifyInstance;
}

export interface AuthTokenPayload {
  sub: string;
  email: string;
}
