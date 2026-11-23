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

describe('Korisnici i uloge (members, invitations)', () => {
  it('owners invite up to the plan seats; a new address joins on its first sign-in; one owner always stays', async () => {
    const o = await signUp('vlasnik.tim@radionica.rs');
    const x = await signUp('majstor.tim@radionica.rs');
    const out = await signUp('strani.tim@radionica.rs');
    const org = (await call('POST', '/organizations', { name: 'Tim radionica' }, o.accessToken)).body.id as string;
    const path = `/organizations/${org}`;

    expect((await call('POST', `${path}/invites`, { email: 'novi.tim@radionica.rs', role: 'owner' }, o.accessToken)).body).toEqual({ error: 'feature_locked' }); // roles: Premium
    const added = await call('POST', `${path}/invites`, { email: 'majstor.tim@radionica.rs' }, o.accessToken); // has an account: joins at once
    expect(added.body.member).toMatchObject({ email: 'majstor.tim@radionica.rs', role: 'designer' });
    expect((await call('POST', `${path}/invites`, { email: 'majstor.tim@radionica.rs' }, o.accessToken)).body).toEqual({ error: 'already_member' });
    expect((await call('POST', `${path}/invites`, { email: 'novi.tim@radionica.rs' }, x.accessToken)).body).toEqual({ error: 'owner_only' });
    const inv = await call('POST', `${path}/invites`, { email: 'novi.tim@radionica.rs' }, o.accessToken);
    expect(inv.status).toBe(201);
    expect(outbox.findLast(m => m.to === 'novi.tim@radionica.rs')!.text).toContain('/prijava?poziv=novi.tim%40radionica.rs');
    expect((await call('POST', `${path}/invites`, { email: 'cetvrti.tim@radionica.rs' }, o.accessToken)).body).toEqual({ error: 'users_limit' }); // Pro: 3 seats

    const team = (await call('GET', `${path}/members`, undefined, x.accessToken)).body;
    expect(team.members.map((m: { email: string }) => m.email).sort()).toEqual(['majstor.tim@radionica.rs', 'vlasnik.tim@radionica.rs']);
    expect(team.invites).toEqual([{ id: inv.body.invite.id, email: 'novi.tim@radionica.rs', role: 'designer' }]);
    expect((await call('GET', `${path}/members`, undefined, out.accessToken)).body).toEqual({ error: 'not_found' });

    // The invited address signs up without a workshop name: the first session claims the invitation.
    const n = await signUp('novi.tim@radionica.rs');
    expect((await call('GET', '/organizations', undefined, n.accessToken)).body.map((w: { name: string; role: string }) => [w.name, w.role])).toEqual([['Tim radionica', 'designer']]);
    expect((await call('GET', `${path}/members`, undefined, o.accessToken)).body.invites).toEqual([]);

    expect((await call('DELETE', `${path}/members/${(o.user as unknown as { _id: string })._id}`, undefined, o.accessToken)).body).toEqual({ error: 'last_owner' });
    expect((await call('PATCH', `${path}/members/${(o.user as unknown as { _id: string })._id}`, { role: 'designer' }, o.accessToken)).body).toEqual({ error: 'last_owner' });
    expect((await call('DELETE', `${path}/members/${added.body.member.id}`, undefined, n.accessToken)).body).toEqual({ error: 'owner_only' });
    expect((await call('DELETE', `${path}/members/${added.body.member.id}`, undefined, o.accessToken)).status).toBe(204);
    expect((await call('GET', `${path}/projects`, undefined, x.accessToken)).body).toEqual({ error: 'not_found' }); // removed: no access
  });
});

/** Asks for a sign-in link and opens it; returns the session. */
async function linkIn(mail: string) {
  expect((await call('POST', '/auth/link', { email: mail })).status).toBe(204);
  const r = await call('POST', '/auth/link/confirm', { token: tokenFrom(mail, 'link') });
  expect(r.status).toBe(200);
  return r.body as { accessToken: string; user: { email: string; kind: string; verified: boolean; hasPassword: boolean } };
}

describe('customers (sign-in link, own kitchens)', () => {

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

describe('directory and requests (Pošalji → Upiti)', () => {
  it('listed workshops get requests; a workshop sees only its own, the e-mail after taking; the copy is its project', async () => {
    const shopA = await signUp('vlasnik.d@radionica.rs');
    const shopB = await signUp('vlasnik.e@radionica.rs');
    const a = (await call('POST', '/organizations', { name: 'Radionica D' }, shopA.accessToken)).body;
    const b = (await call('POST', '/organizations', { name: 'Radionica E' }, shopB.accessToken)).body;
    const hidden = (await call('POST', '/organizations', { name: 'Bez profila' }, shopB.accessToken)).body;

    // Profile: only members write it; a filled-in city puts the workshop in the public directory.
    expect((await call('PUT', `/organizations/${a.id}/profile`, { city: 'X' }, shopB.accessToken)).body).toEqual({ error: 'not_found' });
    const prof = await call('PUT', `/organizations/${a.id}/profile`, { name: 'Stolarija D', city: 'Novi Sad', about: 'Kuhinje po meri.', services: ['m', 'mo', 'zlo'], km: 30, leadFrom: 4, leadTo: 6 }, shopA.accessToken);
    expect(prof.body).toMatchObject({ name: 'Stolarija D', city: 'Novi Sad', services: ['m', 'mo'], km: 30, open: true });
    await call('PUT', `/organizations/${b.id}/profile`, { city: 'Futog' }, shopB.accessToken);
    const dir = (await call('GET', '/workshops')).body.map((w: { name: string }) => w.name);
    expect(dir).toEqual(expect.arrayContaining(['Stolarija D', 'Radionica E']));
    expect(dir).not.toContain('Bez profila');
    expect((await call('GET', `/workshops/${hidden.id}`)).status).toBe(404);

    const ana = await linkIn('ana.z@primer.rs');
    const other = await linkIn('marko.z@primer.rs');
    const k = (await call('POST', '/me/projects', { name: 'Moja kuhinja — Ugaona (L)', data: { id: 'kz', elements: [{ id: 'D1' }] } }, ana.accessToken)).body;

    expect((await call('POST', '/me/requests', { projectId: k.id, workshops: [] }, ana.accessToken)).body).toEqual({ error: 'missing_workshops' });
    expect((await call('POST', '/me/requests', { projectId: k.id, workshops: [a.id, b.id, hidden.id, a.id + 'x'] }, ana.accessToken)).body).toEqual({ error: 'too_many_workshops' });
    expect((await call('POST', '/me/requests', { projectId: k.id, workshops: [hidden.id] }, ana.accessToken)).body).toEqual({ error: 'workshop_unavailable' });
    expect((await call('POST', '/me/requests', { projectId: k.id, workshops: [a.id] }, other.accessToken)).body).toEqual({ error: 'not_found' }); // not their kitchen
    const sent = await call('POST', '/me/requests', { projectId: k.id, workshops: [a.id, b.id], message: 'Zid B nije ravan.' }, ana.accessToken);
    expect(sent.status).toBe(201);
    expect(sent.body.map((x: { workshop: string }) => x.workshop).sort()).toEqual(['Radionica E', 'Stolarija D']);
    // The customer keeps editing; the request keeps the kitchen as it was sent.
    await call('PUT', `/projects/${k.id}`, { data: { id: 'kz', elements: [] } }, ana.accessToken);

    const inboxA = (await call('GET', `/organizations/${a.id}/requests`, undefined, shopA.accessToken)).body;
    expect(inboxA).toHaveLength(1);
    expect(inboxA[0]).toMatchObject({ name: 'Moja kuhinja — Ugaona (L)', status: 'new', message: 'Zid B nije ravan.', others: 1, customer: 'ana.z', contact: null });
    expect(inboxA[0]).not.toHaveProperty('data');
    const reqA = inboxA[0].id;
    expect((await call('GET', `/requests/${reqA}`, undefined, shopA.accessToken)).body.data.elements).toEqual([{ id: 'D1' }]);
    // Another workshop, another customer: nothing.
    expect((await call('GET', `/organizations/${a.id}/requests`, undefined, shopB.accessToken)).body).toEqual({ error: 'not_found' });
    for (const t of [shopB.accessToken, other.accessToken]) {
      expect((await call('GET', `/requests/${reqA}`, undefined, t)).body).toEqual({ error: 'not_found' });
      expect((await call('POST', `/requests/${reqA}/take`, {}, t)).body).toEqual({ error: 'not_found' });
    }
    expect((await call('POST', `/requests/${reqA}/take`, {}, ana.accessToken)).body).toEqual({ error: 'not_found' }); // the customer cannot take it

    const taken = await call('POST', `/requests/${reqA}/take`, {}, shopA.accessToken);
    expect(taken.body).toMatchObject({ status: 'taken', contact: 'ana.z@primer.rs' });
    // Shared session: the workshop works on the customer's own kitchen (no copy), both edit it.
    expect(taken.body.workshopProjectId).toBe(k.id);
    expect((await call('GET', `/organizations/${a.id}/projects`, undefined, shopA.accessToken)).body).toMatchObject([{ id: k.id, name: 'Moja kuhinja — Ugaona (L)' }]);
    const cur = (await call('GET', `/projects/${k.id}`, undefined, shopA.accessToken)).body;
    expect(cur.data.elements).toEqual([]); // the kitchen as it is now (the request keeps it as sent)
    expect((await call('GET', `/projects/${k.id}?since=${cur.updatedAt}`, undefined, shopA.accessToken)).status).toBe(204); // live polling: unchanged
    const w = await call('PUT', `/projects/${k.id}`, { base: cur.updatedAt, data: { id: 'kz', elements: [{ id: 'G1' }] }, resume: { path: '/projekat' } }, shopA.accessToken);
    expect(w.status).toBe(200);
    expect((await call('PUT', `/projects/${k.id}`, { base: cur.updatedAt, data: { id: 'kz', elements: [] } }, ana.accessToken)).body).toEqual({ error: 'conflict' }); // stale: merge first
    const seen = (await call('GET', `/projects/${k.id}`, undefined, ana.accessToken)).body;
    expect(seen).toMatchObject({ data: { elements: [{ id: 'G1' }] } });
    expect(seen.resume).toBeUndefined(); // the workshop's last screen stays out of the customer's kitchen
    expect((await call('PUT', `/projects/${k.id}`, { base: seen.updatedAt, data: { id: 'kz', elements: [{ id: 'G1' }, { id: 'D3' }] } }, ana.accessToken)).status).toBe(200);
    expect((await call('DELETE', `/projects/${k.id}`, undefined, shopA.accessToken)).body).toEqual({ error: 'owner_only' });
    expect((await call('GET', `/projects/${k.id}`, undefined, shopB.accessToken)).status).toBe(404); // a workshop that did not take it
    expect((await call('POST', `/requests/${reqA}/take`, {}, shopA.accessToken)).body.workshopProjectId).toBe(k.id); // once
    expect((await call('POST', `/requests/${reqA}/decline`, {}, shopA.accessToken)).body).toEqual({ error: 'request_taken' });

    const reqB = (await call('GET', `/organizations/${b.id}/requests`, undefined, shopB.accessToken)).body[0].id;
    expect((await call('POST', `/requests/${reqB}/decline`, { reason: 'Ne radim u tom mestu' }, shopB.accessToken)).body).toMatchObject({ status: 'declined', declineReason: 'Ne radim u tom mestu', contact: null });
    expect((await call('GET', '/me/requests', undefined, ana.accessToken)).body.map((x: { workshop: string; status: string }) => `${x.workshop}:${x.status}`).sort())
      .toEqual(['Radionica E:declined', 'Stolarija D:taken']);

    // A paused workshop takes no new requests.
    await call('PUT', `/organizations/${a.id}/profile`, { city: 'Novi Sad', open: false }, shopA.accessToken);
    expect((await call('POST', '/me/requests', { projectId: k.id, workshops: [a.id] }, ana.accessToken)).body).toEqual({ error: 'workshop_unavailable' });
  });
});

describe('offers (Upiti → Ponude)', () => {
  it('a workshop sends versions for a taken request; only its customer accepts (undo once), nobody else sees it', async () => {
    const shop = await signUp('vlasnik.f@radionica.rs');
    const rival = await signUp('vlasnik.g@radionica.rs');
    const org = (await call('POST', '/organizations', { name: 'Radionica F' }, shop.accessToken)).body;
    await call('PUT', `/organizations/${org.id}/profile`, { city: 'Novi Sad' }, shop.accessToken);
    await call('POST', '/organizations', { name: 'Radionica G' }, rival.accessToken);
    const ana = await linkIn('ana.o@primer.rs');
    const other = await linkIn('marko.o@primer.rs');
    const k = (await call('POST', '/me/projects', { name: 'Moja kuhinja — Prava', data: { id: 'ko', elements: [] } }, ana.accessToken)).body;
    await call('POST', '/me/requests', { projectId: k.id, workshops: [org.id] }, ana.accessToken);
    const req = (await call('GET', `/organizations/${org.id}/requests`, undefined, shop.accessToken)).body[0];

    const offer = { total: 26806600, vatPct: 20, validDays: 14, advancePct: 40, included: 'elementi, radna ploča, okov, montaža', excluded: 'aparati', leadTime: '5 nedelja od merenja' };
    expect((await call('POST', `/requests/${req.id}/offers`, offer, shop.accessToken)).body).toEqual({ error: 'request_not_taken' });
    await call('POST', `/requests/${req.id}/take`, {}, shop.accessToken);
    expect((await call('POST', `/requests/${req.id}/offers`, { ...offer, total: 0 }, shop.accessToken)).body).toEqual({ error: 'missing_total' });
    expect((await call('POST', `/requests/${req.id}/offers`, offer, rival.accessToken)).body).toEqual({ error: 'not_found' });
    expect((await call('POST', `/requests/${req.id}/offers`, offer, ana.accessToken)).body).toEqual({ error: 'not_found' });
    const v1 = (await call('POST', `/requests/${req.id}/offers`, offer, shop.accessToken)).body;
    expect(v1).toMatchObject({ version: 1, total: 26806600, advancePct: 40, status: 'sent' });
    const v2 = (await call('POST', `/requests/${req.id}/offers`, { ...offer, total: 27000000 }, shop.accessToken)).body;
    expect(v2).toMatchObject({ version: 2, status: 'sent' });

    // The customer sees the latest version on their request; v1 is closed.
    const mine = (await call('GET', '/me/requests', undefined, ana.accessToken)).body;
    expect(mine[0]).toMatchObject({ workshop: 'Radionica F', status: 'taken', offer: { id: v2.id, version: 2, total: 27000000 } });
    expect((await call('POST', `/offers/${v1.id}/accept`, {}, ana.accessToken)).body).toEqual({ error: 'offer_closed' });
    for (const t of [other.accessToken, shop.accessToken, rival.accessToken]) {
      expect((await call('POST', `/offers/${v2.id}/accept`, {}, t)).body).toEqual({ error: 'not_found' });
    }
    const ok = await call('POST', `/offers/${v2.id}/accept`, {}, ana.accessToken);
    expect(ok.body).toMatchObject({ status: 'accepted' });
    expect(ok.body.undoUntil).toBeTruthy();
    expect((await call('GET', `/organizations/${org.id}/requests`, undefined, shop.accessToken)).body[0].offer).toMatchObject({ version: 2, status: 'accepted' });
    expect((await call('POST', `/requests/${req.id}/offers`, offer, shop.accessToken)).body).toEqual({ error: 'offer_accepted' });
    expect((await call('POST', `/offers/${v2.id}/undo`, {}, ana.accessToken)).body).toMatchObject({ status: 'sent' });
    expect((await call('POST', `/offers/${v2.id}/undo`, {}, ana.accessToken)).body).toEqual({ error: 'undo_expired' });
    expect((await call('POST', `/offers/${v2.id}/decline`, {}, ana.accessToken)).body).toMatchObject({ status: 'declined' });
    expect((await call('POST', `/offers/${v2.id}/accept`, {}, ana.accessToken)).body).toEqual({ error: 'offer_closed' });
  });
});

describe('offer PDF', () => {
  it('the workshop sends its quote PDF; the customer and the workshop get it back, nobody else', async () => {
    const shop = await signUp('vlasnik.p@radionica.rs');
    const rival = await signUp('vlasnik.r@radionica.rs');
    const org = (await call('POST', '/organizations', { name: 'Radionica P' }, shop.accessToken)).body;
    await call('PUT', `/organizations/${org.id}/profile`, { city: 'Niš' }, shop.accessToken);
    await call('POST', '/organizations', { name: 'Radionica R' }, rival.accessToken);
    const ana = await linkIn('ana.p@primer.rs');
    const k = (await call('POST', '/me/projects', { name: 'Moja kuhinja — Prava', data: { id: 'kp', elements: [] } }, ana.accessToken)).body;
    await call('POST', '/me/requests', { projectId: k.id, workshops: [org.id] }, ana.accessToken);
    const req = (await call('GET', `/organizations/${org.id}/requests`, undefined, shop.accessToken)).body[0];
    await call('POST', `/requests/${req.id}/take`, {}, shop.accessToken);
    const pdf = Buffer.from('%PDF-1.7 test').toString('base64');
    const bad = (await call('POST', `/requests/${req.id}/offers`, { total: 100000, pdf: Buffer.from('<html>').toString('base64') }, shop.accessToken)).body;
    expect(bad.hasPdf).toBe(false); // not a PDF: offer sent without it
    const o = (await call('POST', `/requests/${req.id}/offers`, { total: 100000, pdf }, shop.accessToken)).body;
    expect(o).toMatchObject({ version: 2, hasPdf: true });
    expect(o.pdf).toBeUndefined();
    for (const t of [ana.accessToken, shop.accessToken]) {
      const r = await fetch(`${base}/offers/${o.id}/pdf`, { headers: { Authorization: `Bearer ${t}` } });
      expect(r.headers.get('content-type')).toContain('application/pdf');
      expect(await r.text()).toBe('%PDF-1.7 test');
    }
    expect((await fetch(`${base}/offers/${o.id}/pdf`, { headers: { Authorization: `Bearer ${rival.accessToken}` } })).status).toBe(404);
    expect((await call('GET', '/me/requests', undefined, ana.accessToken)).body[0].offer).toMatchObject({ hasPdf: true });
  });
});

describe('room photos', () => {
  it('photos go with the request to every chosen workshop; only images; only its customer and those workshops see them', async () => {
    const shop = await signUp('vlasnik.foto@radionica.rs');
    const rival = await signUp('vlasnik.foto2@radionica.rs');
    const org = (await call('POST', '/organizations', { name: 'Radionica F' }, shop.accessToken)).body;
    await call('PUT', `/organizations/${org.id}/profile`, { city: 'Subotica' }, shop.accessToken);
    await call('POST', '/organizations', { name: 'Radionica G' }, rival.accessToken);
    const ana = await linkIn('ana.foto@primer.rs');
    const k = (await call('POST', '/me/projects', { name: 'Moja kuhinja — Prava', data: { id: 'kf', elements: [] } }, ana.accessToken)).body;
    const jpg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.from('slika')]);
    const send = (photos: unknown[]) => call('POST', '/me/requests', { projectId: k.id, workshops: [org.id], photos }, ana.accessToken);
    expect((await send([Buffer.from('<svg/>').toString('base64')])).body).toEqual({ error: 'bad_photo' });
    expect((await send(Array(6).fill(jpg.toString('base64')))).body).toEqual({ error: 'too_many_photos' });
    expect((await send([jpg.toString('base64')])).status).toBe(201);
    const req = (await call('GET', `/organizations/${org.id}/requests`, undefined, shop.accessToken)).body[0];
    expect(req.photos).toBe(1);
    for (const t of [ana.accessToken, shop.accessToken]) {
      const r = await fetch(`${base}/requests/${req.id}/photos/0`, { headers: { Authorization: `Bearer ${t}` } });
      expect(r.headers.get('content-type')).toContain('image/jpeg');
      expect(Buffer.from(await r.arrayBuffer()).equals(jpg)).toBe(true);
    }
    expect((await fetch(`${base}/requests/${req.id}/photos/0`, { headers: { Authorization: `Bearer ${rival.accessToken}` } })).status).toBe(404);
    expect((await fetch(`${base}/requests/${req.id}/photos/1`, { headers: { Authorization: `Bearer ${shop.accessToken}` } })).status).toBe(404);
  });
});

describe('unread messages', () => {
  it('each side counts what it has not seen; one e-mail per unseen run, again after the thread is opened', async () => {
    const shop = await signUp('vlasnik.u@radionica.rs');
    const org = (await call('POST', '/organizations', { name: 'Radionica U' }, shop.accessToken)).body;
    await call('PUT', `/organizations/${org.id}/profile`, { city: 'Niš' }, shop.accessToken);
    const ana = await linkIn('ana.u@primer.rs');
    const k = (await call('POST', '/me/projects', { name: 'Moja kuhinja — Prava', data: { id: 'ku', elements: [] } }, ana.accessToken)).body;
    await call('POST', '/me/requests', { projectId: k.id, workshops: [org.id] }, ana.accessToken);
    const id = (await call('GET', `/organizations/${org.id}/requests`, undefined, shop.accessToken)).body[0].id;
    const shopUnread = async () => (await call('GET', `/organizations/${org.id}/requests`, undefined, shop.accessToken)).body[0].unread;
    const anaUnread = async () => (await call('GET', '/me/requests', undefined, ana.accessToken)).body[0].unread;
    const mails = (to: string) => outbox.filter(m => m.to === to && m.subject.startsWith('Nova poruka')).length;

    await call('POST', `/requests/${id}/messages`, { text: 'Zid B nije ravan.' }, ana.accessToken);
    await call('POST', `/requests/${id}/messages`, { text: 'I prozor je niži.' }, ana.accessToken);
    expect([await shopUnread(), await anaUnread()]).toEqual([2, 0]);
    expect(mails('vlasnik.u@radionica.rs')).toBe(1); // the second waits until the thread is opened
    expect(outbox.findLast(m => m.to === 'vlasnik.u@radionica.rs')!.text).toContain(`/saradnja/${id}`);

    await call('GET', `/requests/${id}/thread`, undefined, shop.accessToken);
    expect(await shopUnread()).toBe(0);
    await call('POST', `/requests/${id}/messages`, { text: 'Važi, dolazim u sredu.' }, shop.accessToken);
    expect([await shopUnread(), await anaUnread()]).toEqual([0, 1]);
    expect(mails('ana.u@primer.rs')).toBe(1);
    await call('POST', `/requests/${id}/messages`, { text: 'Opet zid B.' }, ana.accessToken);
    expect(mails('vlasnik.u@radionica.rs')).toBe(2); // opened since the last e-mail
    expect(await anaUnread()).toBe(0); // writing marks her side read
  });
});

describe('Saradnja (messages, proposals)', () => {
  it('both sides write on a request; the customer decides every proposal and approval changes the customer kitchen', async () => {
    const shop = await signUp('vlasnik.h@radionica.rs');
    const rival = await signUp('vlasnik.i@radionica.rs');
    const org = (await call('POST', '/organizations', { name: 'Radionica H' }, shop.accessToken)).body;
    await call('PUT', `/organizations/${org.id}/profile`, { city: 'Novi Sad' }, shop.accessToken);
    await call('POST', '/organizations', { name: 'Radionica I' }, rival.accessToken);
    const ana = await linkIn('ana.s@primer.rs');
    const other = await linkIn('marko.s@primer.rs');
    const sent = { id: 'ks', elements: [{ id: 'D1', wallId: 'A', offset: 0, width: 600 }, { id: 'D2', wallId: 'A', offset: 600, width: 800 }] };
    const k = (await call('POST', '/me/projects', { name: 'Moja kuhinja — Prava', data: sent }, ana.accessToken)).body;
    await call('POST', '/me/requests', { projectId: k.id, workshops: [org.id] }, ana.accessToken);
    const req = (await call('GET', `/organizations/${org.id}/requests`, undefined, shop.accessToken)).body[0];

    expect((await call('POST', `/requests/${req.id}/messages`, { text: 'Zid B nije ravan.' }, ana.accessToken)).status).toBe(201);
    expect((await call('POST', `/requests/${req.id}/messages`, { text: '  ' }, ana.accessToken)).body).toEqual({ error: 'missing_text' });
    expect((await call('POST', `/requests/${req.id}/messages`, { text: 'Dodaćemo lajsnu.' }, shop.accessToken)).status).toBe(201);
    for (const t of [rival.accessToken, other.accessToken]) {
      expect((await call('GET', `/requests/${req.id}/thread`, undefined, t)).body).toEqual({ error: 'not_found' });
      expect((await call('POST', `/requests/${req.id}/messages`, { text: 'x' }, t)).body).toEqual({ error: 'not_found' });
    }
    const t1 = (await call('GET', `/requests/${req.id}/thread`, undefined, ana.accessToken)).body;
    expect(t1).toMatchObject({ side: 'cust', workshop: 'Radionica H', customer: 'ana.s', proposal: null });
    expect(t1.messages.map((m: { side: string; text: string }) => `${m.side}:${m.text}`)).toEqual(['cust:Zid B nije ravan.', 'shop:Dodaćemo lajsnu.']);
    expect(t1.workshopProjectId).toBeUndefined();

    const work = { ...sent, elements: [{ id: 'D1', wallId: 'A', offset: 0, width: 300 }, { id: 'D2', wallId: 'A', offset: 800, width: 800 }, { id: 'F1', wallId: 'B', offset: 0, width: 50 }] };
    const items = [{ id: 'D1', title: 'Fioke 60 → 30', why: 'mesto za ploču' }, { id: 'D2', title: 'Sudopera pomerena 20 cm', why: 'odvod je na 145 cm' }, { id: 'F1', title: 'Dodata lajsna', why: 'zid nije ravan', price: '+1.900 RSD' }];
    expect((await call('POST', `/requests/${req.id}/proposals`, { data: work, items }, shop.accessToken)).body).toEqual({ error: 'request_not_taken' });
    await call('POST', `/requests/${req.id}/take`, {}, shop.accessToken);
    expect((await call('POST', `/requests/${req.id}/proposals`, { data: work, items: [] }, shop.accessToken)).body).toEqual({ error: 'missing_items' });
    expect((await call('POST', `/requests/${req.id}/proposals`, { data: work, items }, ana.accessToken)).body).toEqual({ error: 'not_found' });
    const first = (await call('POST', `/requests/${req.id}/proposals`, { data: work, items }, shop.accessToken)).body;
    const p = (await call('POST', `/requests/${req.id}/proposals`, { data: work, items }, shop.accessToken)).body;
    expect(p).toMatchObject({ version: 2, status: 'open' });
    expect((await call('POST', `/proposals/${first.id}/decide`, { decisions: { D1: 'acc', D2: 'acc', F1: 'acc' } }, ana.accessToken)).body).toEqual({ error: 'proposal_closed' });

    const t2 = (await call('GET', `/requests/${req.id}/thread`, undefined, shop.accessToken)).body;
    expect(t2).toMatchObject({ side: 'shop', proposal: { id: p.id, version: 2, status: 'open' } });
    expect(t2.workshopProjectId).toBeTruthy();
    expect((await call('POST', `/proposals/${p.id}/decide`, { decisions: { D1: 'acc', D2: 'rej' } }, ana.accessToken)).body).toEqual({ error: 'undecided' });
    for (const t of [shop.accessToken, other.accessToken]) {
      expect((await call('POST', `/proposals/${p.id}/decide`, { decisions: { D1: 'acc', D2: 'rej', F1: 'acc' } }, t)).body).toEqual({ error: 'not_found' });
    }
    expect((await call('POST', `/proposals/${p.id}/decide`, { decisions: { D1: 'acc', D2: 'rej', F1: 'acc' } }, ana.accessToken)).body).toMatchObject({ status: 'approved' });
    // Accepted: D1 narrower, F1 added; declined: D2 stays where the customer had it.
    expect((await call('GET', `/projects/${k.id}`, undefined, ana.accessToken)).body.data.elements).toEqual([
      { id: 'D1', wallId: 'A', offset: 0, width: 300 }, { id: 'D2', wallId: 'A', offset: 600, width: 800 }, { id: 'F1', wallId: 'B', offset: 0, width: 50 }]);
    expect((await call('POST', `/proposals/${p.id}/decide`, { decisions: { D1: 'acc', D2: 'acc', F1: 'acc' } }, ana.accessToken)).body).toEqual({ error: 'proposal_closed' });

    // A grouped item (a change + the units it pushed) is applied whole: accepting D1 also moves D2.
    const work2 = { ...sent, elements: [{ id: 'D1', wallId: 'A', offset: 0, width: 200 }, { id: 'D2', wallId: 'A', offset: 200, width: 800 }, { id: 'F1', wallId: 'B', offset: 0, width: 50 }] };
    const g = (await call('POST', `/requests/${req.id}/proposals`, { data: work2, items: [{ id: 'D1', ids: ['D1', 'D2', 7], title: 'Fioke 30 → 20 (pomera D2)', why: '' }] }, shop.accessToken)).body;
    expect((await call('POST', `/proposals/${g.id}/decide`, { decisions: { D1: 'acc' } }, ana.accessToken)).body).toMatchObject({ status: 'approved' });
    expect((await call('GET', `/projects/${k.id}`, undefined, ana.accessToken)).body.data.elements.slice(0, 2)).toEqual(work2.elements.slice(0, 2));
  });
});
