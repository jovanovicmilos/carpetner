// The API app (no listen, no database connect: server.ts does that; tests use it directly).
import express from 'express';
import { authRouter } from './auth';
import { onError } from './http';
import { workshopRouter } from './workshops';

/** `rateLimit: false` only for tests that make many requests from one address. */
export function createApp({ rateLimit = true } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1); // behind nginx / the Vite proxy: req.ip is the client (rate limits)
  app.use(express.json({ limit: '5mb' })); // a kitchen project is ~100 kB; room for plan underlays later
  app.get('/api/v1/health', (_req, res) => void res.send({ ok: true }));
  app.use('/api/v1', authRouter({ rateLimit }), workshopRouter());
  app.use('/api', (_req, res) => void res.status(404).send({ error: 'not_found' }));
  app.use(onError);
  return app;
}
