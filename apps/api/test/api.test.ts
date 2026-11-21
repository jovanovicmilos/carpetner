// End to end against an in-memory MongoDB: accounts, workshops with the trial plan, and workshop isolation of projects.
import { execSync } from 'node:child_process';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { outbox } from '../src/mail';

let mongo: MongoMemoryServer, server: Server, base = '';
// A locally installed mongod is used when there is one (no download); otherwise mongodb-memory-server fetches it.
const systemBinary = (() => { try { return execSync('command -v mongod', { encoding: 'utf8' }).trim() || undefined; } catch { return undefined; } })();

beforeAll(async () => {
  process.env.SECRET = 'test-secret';
  process.env.FRONTEND_BASE_URL = 'http://front.test';
  mongo = await MongoMemoryServer.create({ binary: { systemBinary } });
  await mongoose.connect(mongo.getUri());
  server = createApp({ rateLimit: false }).listen(0);
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/v1`;
}, 60_000);
afterAll(async () => { server?.close(); await mongoose.disconnect(); await mongo?.stop(); });

async function call(method: string, path: string, body?: unknown, token?: string) {
  const res = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
    body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}
const tokenFrom = (mail: string, param: string) => new URL(outbox.findLast(m => m.to === mail)!.text.match(/https?:\/\/\S+/)![0]).searchParams.get(param)!;

/** Registers, confirms the e-mail and returns the session. */
async function signUp(mail: string) {
  expect((await call('POST', '/auth/register', { name: 'Test', email: mail, password: 'lozinka123' })).status).toBe(201);
  const v = await call('POST', '/auth/verify', { token: tokenFrom(mail, 'potvrda') });
  expect(v.status).toBe(200);
  return v.body as { accessToken: string; refreshToken: string; user: { email: string; hasPassword: boolean } };
}

describe('accounts', () => {
  it('register → no login before confirmation → confirm → login; secrets never leave the API', async () => {
    const r = await call('POST', '/auth/register', { name: 'Ana', email: 'Ana@Radionica.rs', password: 'lozinka123' });
    expect(r.status).toBe(201);
    expect(r.body.user).not.toHaveProperty('password');
    expect((await call('POST', '/auth/register', { name: 'Ana', email: 'ana@radionica.rs', password: 'lozinka123' })).body).toEqual({ error: 'email_taken' });
    expect((await call('POST', '/auth/login', { email: 'ana@radionica.rs', password: 'lozinka123' })).body).toEqual({ error: 'not_verified' });
    const token = tokenFrom('ana@radionica.rs', 'potvrda');
    const v = await call('POST', '/auth/verify', { token });
    expect(v.body.user).toMatchObject({ email: 'ana@radionica.rs', verified: true, hasPassword: true });
    expect(v.body.user).not.toHaveProperty('accessTokens');
    expect((await call('POST', '/auth/verify', { token })).status).toBe(409); // the link signs in once
    expect((await call('POST', '/auth/login', { email: 'ana@radionica.rs', password: 'pogresna1' })).body).toEqual({ error: 'wrong_login' });
    const l = await call('POST', '/auth/login', { email: 'ana@radionica.rs', password: 'lozinka123' });
    expect((await call('GET', '/auth/me', undefined, l.body.accessToken)).body.user.email).toBe('ana@radionica.rs');
  });

  it('a short password or a bad address is refused', async () => {
    expect((await call('POST', '/auth/register', { name: 'X', email: 'x@y.rs', password: 'kratka' })).body).toEqual({ error: 'weak_password' });
    expect((await call('POST', '/auth/register', { name: 'X', email: 'nije-adresa', password: 'lozinka123' })).body).toEqual({ error: 'invalid_email' });
  });

  it('refresh rotates, logout ends the session, tokens of one purpose are not accepted for another', async () => {
    const s = await signUp('bojan@radionica.rs');
    const t = await call('POST', '/auth/token', { refreshToken: s.refreshToken });
    expect(t.status).toBe(200);
    expect((await call('POST', '/auth/token', { refreshToken: s.refreshToken })).status).toBe(401); // used once
    expect((await call('GET', '/auth/me', undefined, s.refreshToken)).status).toBe(401); // refresh is not an access token
    expect((await call('POST', '/auth/logout', {}, t.body.accessToken)).status).toBe(204);
    expect((await call('GET', '/auth/me', undefined, t.body.accessToken)).status).toBe(401);
  });

  it('password reset by e-mail: works once, signs out every device', async () => {
    const s = await signUp('ceca@radionica.rs');
    expect((await call('POST', '/auth/password/reset', { email: 'nema@nikog.rs' })).status).toBe(204); // does not reveal accounts
    expect((await call('POST', '/auth/password/reset', { email: 'ceca@radionica.rs' })).status).toBe(204);
    const token = tokenFrom('ceca@radionica.rs', 'lozinka');
    expect((await call('POST', '/auth/password/reset/confirm', { token, password: 'nova-lozinka' })).status).toBe(204);
    expect((await call('POST', '/auth/password/reset/confirm', { token, password: 'treca-lozinka' })).status).toBe(401);
    expect((await call('GET', '/auth/me', undefined, s.accessToken)).status).toBe(401);
    expect((await call('POST', '/auth/login', { email: 'ceca@radionica.rs', password: 'nova-lozinka' })).status).toBe(200);
  });
});

describe('sign-up as a workshop (Prijava → Nova radionica)', () => {
  it('the workshop typed at sign-up is made when the e-mail is confirmed, the person name is optional', async () => {
    expect((await call('POST', '/auth/register', { email: 'stolar@drvo.rs', password: 'lozinka123', workshop: 'Stolarija Drvo' })).status).toBe(201);
    const v = await call('POST', '/auth/verify', { token: tokenFrom('stolar@drvo.rs', 'potvrda') });
    expect(v.body.user).toMatchObject({ name: 'stolar' });
    expect(v.body.user).not.toHaveProperty('pendingWorkshop');
    const orgs = await call('GET', '/organizations', undefined, v.body.accessToken);
    expect(orgs.body).toMatchObject([{ name: 'Stolarija Drvo', role: 'owner' }]);
    expect(orgs.body[0].features).toContain('cutlist');
  });
});

describe('rate limits', () => {
  it('failed logins from one address stop at 10 per 15 minutes', async () => {
    const s = createApp().listen(0);
    const url = `http://127.0.0.1:${(s.address() as AddressInfo).port}/api/v1/auth/login`;
    const codes = [];
    for (let i = 0; i < 11; i++) codes.push((await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'a@b.rs', password: 'x' }) })).status);
    s.close();
    expect(codes).toEqual([...Array(10).fill(401), 429]);
  });
});

describe('workshops and projects', () => {
  it('a new workshop gets Start + 30 days of Pro; projects are visible only to its members', async () => {
    const a = await signUp('vlasnik.a@radionica.rs');
    const b = await signUp('vlasnik.b@radionica.rs');
    const orgA = await call('POST', '/organizations', { name: 'Radionica A' }, a.accessToken);
    expect(orgA.status).toBe(201);
    expect(orgA.body).toMatchObject({ name: 'Radionica A', role: 'owner' });
    expect(orgA.body.features).toContain('cutlist');
    expect(orgA.body.grants.find((g: { product: string }) => g.product === 'pro')).toMatchObject({ trial: true });
    const orgB = await call('POST', '/organizations', { name: 'Radionica B' }, b.accessToken);

    const data = { id: 'p1', name: 'Kuhinja Petrović', elements: [] };
    const p = await call('POST', `/organizations/${orgA.body.id}/projects`, { name: 'Kuhinja Petrović', data }, a.accessToken);
    expect(p.status).toBe(201);
    expect((await call('GET', `/projects/${p.body.id}`, undefined, a.accessToken)).body.data).toEqual(data);
    expect((await call('GET', `/organizations/${orgA.body.id}/projects`, undefined, a.accessToken)).body[0]).toMatchObject({ clientId: 'p1', name: 'Kuhinja Petrović' });
    expect((await call('PUT', `/projects/${p.body.id}`, { data: { ...data, elements: [{ id: 'D1' }] } }, a.accessToken)).status).toBe(200);
    expect((await call('GET', `/projects/${p.body.id}`, undefined, a.accessToken)).body.data.elements).toEqual([{ id: 'D1' }]);

    // Workshop B sees nothing of A: same answer as for a project that does not exist.
    for (const [m, path, body] of [['GET', `/projects/${p.body.id}`], ['PUT', `/projects/${p.body.id}`, { name: 'x' }], ['DELETE', `/projects/${p.body.id}`],
      ['GET', `/organizations/${orgA.body.id}/projects`], ['POST', `/organizations/${orgA.body.id}/projects`, { data }]] as const) {
      expect((await call(m, path, body, b.accessToken)).body, `${m} ${path}`).toEqual({ error: 'not_found' });
    }
    expect((await call('GET', `/organizations/${orgB.body.id}/projects`, undefined, b.accessToken)).body).toEqual([]);
    expect((await call('GET', '/organizations', undefined, b.accessToken)).body.map((o: { name: string }) => o.name)).toEqual(['Radionica B']);
    expect((await call('GET', '/projects/not-an-id', undefined, a.accessToken)).status).toBe(404);
    expect((await call('GET', `/organizations/${orgA.body.id}/projects`)).status).toBe(401);

    expect((await call('DELETE', `/projects/${p.body.id}`, undefined, a.accessToken)).status).toBe(204);
    expect((await call('GET', `/organizations/${orgA.body.id}/projects`, undefined, a.accessToken)).body).toEqual([]);
  });
});

describe('customers (sign-in link, own kitchens)', () => {
  /** Asks for a sign-in link and opens it; returns the session. */
  async function linkIn(mail: string) {
    expect((await call('POST', '/auth/link', { email: mail })).status).toBe(204);
    const r = await call('POST', '/auth/link/confirm', { token: tokenFrom(mail, 'link') });
    expect(r.status).toBe(200);
    return r.body as { accessToken: string; user: { email: string; kind: string; verified: boolean; hasPassword: boolean } };
  }

  it('an unknown address gets a customer account; the link signs in once', async () => {
    expect((await call('POST', '/auth/link', { email: 'nije-adresa' })).body).toEqual({ error: 'invalid_email' });
    expect((await call('POST', '/auth/link', { email: 'Ana.P@primer.rs' })).status).toBe(204);
    const token = tokenFrom('ana.p@primer.rs', 'link');
    const s = await call('POST', '/auth/link/confirm', { token });
    expect(s.body.user).toMatchObject({ email: 'ana.p@primer.rs', kind: 'customer', verified: true, hasPassword: false });
    expect((await call('POST', '/auth/link/confirm', { token })).body).toEqual({ error: 'invalid_token' }); // used
    expect((await call('POST', '/auth/link/confirm', { token: 'x.y.z' })).status).toBe(401);
    expect((await call('GET', '/organizations', undefined, s.body.accessToken)).body).toEqual([]); // no workshop
    // A link is not a session, a session is not a link.
    expect((await call('GET', '/auth/me', undefined, token)).status).toBe(401);
    expect((await call('POST', '/auth/link/confirm', { token: s.body.accessToken })).status).toBe(401);
  });

  it('kitchens belong to their customer: not to another customer, not to a workshop', async () => {
    const ana = await linkIn('ana.k@primer.rs');
    const marko = await linkIn('marko.k@primer.rs');
    const shop = await signUp('vlasnik.c@radionica.rs');
    await call('POST', '/organizations', { name: 'Radionica C' }, shop.accessToken);

    const data = { id: 'k1', name: 'Moja kuhinja — Ugaona (L)', elements: [] };
    const k = await call('POST', '/me/projects', { name: data.name, data }, ana.accessToken);
    expect(k.status).toBe(201);
    expect((await call('GET', '/me/projects', undefined, ana.accessToken)).body).toMatchObject([{ id: k.body.id, clientId: 'k1', name: data.name }]);
    expect((await call('PUT', `/projects/${k.body.id}`, { data: { ...data, elements: [{ id: 'D1' }] } }, ana.accessToken)).status).toBe(200);
    expect((await call('GET', `/projects/${k.body.id}`, undefined, ana.accessToken)).body.data.elements).toEqual([{ id: 'D1' }]);

    expect((await call('GET', '/me/projects', undefined, marko.accessToken)).body).toEqual([]);
    for (const t of [marko.accessToken, shop.accessToken]) {
      for (const [m, body] of [['GET'], ['PUT', { name: 'x' }], ['DELETE']] as const) {
        expect((await call(m, `/projects/${k.body.id}`, body, t)).body).toEqual({ error: 'not_found' });
      }
    }
    expect((await call('GET', '/me/projects')).status).toBe(401);
    expect((await call('DELETE', `/projects/${k.body.id}`, undefined, ana.accessToken)).status).toBe(204);
  });
});
