// Requests per IP in a time window; only responses `counts(status)` accepts are counted (e.g. failed logins).
// shortcut: counter in this process's memory (a restart clears it, several instances count separately); Mongo / Redis for more servers.
import type { RequestHandler } from 'express';

export function rateLimit({ windowMs, max, counts = () => true }: { windowMs: number; max: number; counts?: (status: number) => boolean }): RequestHandler {
  const hits = new Map<string, number[]>();
  const recent = (ip: string, now: number) => (hits.get(ip) ?? []).filter(t => now - t < windowMs);
  return (req, res, next) => {
    const ip = req.ip ?? '';
    if (recent(ip, Date.now()).length >= max) return void res.status(429).send({ error: 'too_many' });
    res.on('finish', () => { if (counts(res.statusCode)) { const now = Date.now(); hits.set(ip, [...recent(ip, now), now]); } });
    next();
  };
}

const pass: RequestHandler = (_req, _res, next) => next();

/** New counters per app (each test app starts clean). */
export const limits = (on = true) => !on ? { login: pass, mail: pass } : ({
  login: rateLimit({ windowMs: 15 * 60_000, max: 10, counts: s => s === 400 || s === 401 }),
  mail: rateLimit({ windowMs: 60 * 60_000, max: 5, counts: s => s < 300 }),
});
