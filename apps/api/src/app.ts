import Fastify from 'fastify';
import cors from '@fastify/cors';
import authPlugin from './plugins/auth.js';
import { authRoutes } from './routes/auth.js';
import { analysisRoutes } from './routes/analysis.js';
import { meRoutes } from './routes/me.js';
import { createDb } from './db/index.js';

export function buildApp() {
  const app = Fastify({ logger: true });

  app.register(cors, { origin: true });

  const db = createDb();
  app.decorate('db', db);

  app.register(authPlugin);
  app.register(authRoutes);
  app.register(analysisRoutes);
  app.register(meRoutes);

  app.get('/health', async () => ({ ok: true }));

  app.addHook('onClose', async () => {
    db.close();
  });

  return app;
}
