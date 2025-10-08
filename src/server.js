import Fastify from 'fastify';
import { registerRoutes } from './api/routes.js';
import { correlationIdPlugin } from './api/correlation.js';

const port = process.env.PORT ? Number(process.env.PORT) : 8000;

export async function buildServer() {
  const app = Fastify({ 
    logger: { level: process.env.LOG_LEVEL || 'info' },
    requestTimeout: 8000, // 8s request timeout
    keepAliveTimeout: 5000, // 5s keep-alive
  });

  app.register(correlationIdPlugin);
  app.get('/health', async () => ({ status: 'ok' }));

  await registerRoutes(app);
  return app;
}

async function start() {
  const app = await buildServer();
  await app.listen({ port, host: '0.0.0.0' });
}

// Start server unless running under test runner
if (!process.env.VITEST) {
  start().catch(err => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  });
}

