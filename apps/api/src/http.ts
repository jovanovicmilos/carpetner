// Errors and input checks shared by all routes. Errors go out as `{ error: code }`; the UI turns codes into Serbian text.
import type { ErrorRequestHandler } from 'express';

export class HttpError extends Error {
  constructor(public status: number, public code: string) { super(code); }
}

/** A required non-empty string field (trimmed); anything else in the body is ignored by the callers. */
export function str(body: unknown, key: string, opts: { max?: number } = {}): string {
  const v = (body as Record<string, unknown> | undefined)?.[key];
  if (typeof v !== 'string' || !v.trim()) throw new HttpError(400, `missing_${key}`);
  if (v.length > (opts.max ?? 200)) throw new HttpError(400, `too_long_${key}`);
  return v.trim();
}

export const email = (body: unknown) => {
  const e = str(body, 'email').toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e)) throw new HttpError(400, 'invalid_email');
  return e;
};

export const password = (body: unknown, key = 'password') => {
  const p = (body as Record<string, unknown> | undefined)?.[key];
  if (typeof p !== 'string' || !p) throw new HttpError(400, `missing_${key}`);
  if (p.length < 8 || p.length > 200) throw new HttpError(400, 'weak_password');
  return p;
};

export const onError: ErrorRequestHandler = (e, _req, res, _next) => {
  if (e instanceof HttpError) return void res.status(e.status).send({ error: e.code });
  if ((e as { type?: string }).type === 'entity.too.large') return void res.status(413).send({ error: 'too_large' });
  if ((e as { type?: string }).type === 'entity.parse.failed') return void res.status(400).send({ error: 'bad_json' });
  if ((e as { name?: string }).name === 'CastError') return void res.status(404).send({ error: 'not_found' });
  console.error(e);
  res.status(500).send({ error: 'server' });
};
