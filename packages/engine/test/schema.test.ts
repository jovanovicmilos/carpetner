// Runs supabase/migrations in PGlite (Postgres in WASM) with a minimal stand-in for Supabase's auth schema and roles, then checks
// RLS from each user's side and that the products seed equals engine DEFAULT_PRODUCTS.
import { PGlite } from '@electric-sql/pglite';
import { readdirSync, readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { can, DEFAULT_PRODUCTS, entitlements, limit, type Grant } from '../src';

const DIR = new URL('../../../supabase/migrations/', import.meta.url);
const SUPABASE_STANDIN = `
  create role anon nologin; create role authenticated nologin;
  create schema auth;
  create table auth.users (id uuid primary key, raw_user_meta_data jsonb default '{}');
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema public, auth to anon, authenticated;
  alter default privileges in schema public grant all on tables to anon, authenticated;
`;
const A = '00000000-0000-0000-0000-00000000000a', B = '00000000-0000-0000-0000-00000000000b', C = '00000000-0000-0000-0000-00000000000c';

let db: PGlite;
const as = async <T = Record<string, unknown>>(user: string, sql: string, params: unknown[] = []) => {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${user}', false); set role authenticated;`);
  try { return (await db.query<T>(sql, params)).rows; } finally { await db.exec('reset role;'); }
};
const fails = (user: string, sql: string, params: unknown[] = []) => expect(as(user, sql, params)).rejects.toThrow();

beforeAll(async () => {
  db = new PGlite();
  await db.exec(SUPABASE_STANDIN);
  for (const f of readdirSync(DIR).filter(f => f.endsWith('.sql')).sort()) await db.exec(readFileSync(new URL(f, DIR), 'utf8'));
  await db.exec(`insert into auth.users (id, raw_user_meta_data) values ('${A}', '{"full_name":"Ana"}'), ('${B}', '{}'), ('${C}', '{}');`);
});

describe('database schema and RLS', () => {
  it('products seed equals engine DEFAULT_PRODUCTS', async () => {
    const rows = await as<{ id: string; kind: string; features: string[]; limits: object }>(A, 'select * from products order by id');
    const want = [...DEFAULT_PRODUCTS].sort((x, y) => (x.id < y.id ? -1 : 1));
    expect(rows.map(r => ({ id: r.id, kind: r.kind, features: [...r.features].sort(), limits: r.limits })))
      .toEqual(want.map(p => ({ id: p.id, kind: p.kind, features: [...p.features].sort(), limits: p.limits })));
  });

  it('sign-up makes a profile; the user cannot change own kind', async () => {
    expect(await as(A, 'select full_name, kind from profiles')).toEqual([{ full_name: 'Ana', kind: 'workshop_member' }]);
    await fails(A, `update profiles set kind = 'customer'`);
  });

  it('a new workshop gets its owner and Start + Pro trial; outsiders see nothing', async () => {
    const [{ org }] = await as<{ org: string }>(A, `select create_organization('Kuhinje Petrović') as org`);
    const grants = await as<{ product_id: string; valid_from: string; valid_to: string | null; trial: boolean }>(A,
      `select product_id, valid_from::text, valid_to::text, trial from grants where organization_id = $1`, [org]);
    const g: Grant[] = grants.map(r => ({ product: r.product_id, from: r.valid_from, to: r.valid_to ?? undefined, trial: r.trial }));
    const today = grants[0].valid_from;
    expect(can(entitlements(g, today), 'cutlist')).toBe(true);
    expect(limit(entitlements(g, '2999-01-01'), 'requests.per_month')).toBe(3);

    await as(A, `insert into projects (organization_id, name, data) values ($1, 'Kuhinja', '{}')`, [org]);
    expect(await as(B, 'select * from organizations')).toEqual([]);
    expect(await as(B, 'select * from projects')).toEqual([]);
    expect(await as(B, 'select * from grants')).toEqual([]);
    await fails(B, `insert into projects (organization_id, data) values ($1, '{}')`, [org]);
    await fails(B, `insert into memberships (user_id, organization_id, role) values ($1, $2, 'owner')`, [B, org]);
    await fails(A, `insert into grants (organization_id, product_id, valid_from) values ($1, 'premium', current_date)`, [org]);

    await as(A, `insert into memberships (user_id, organization_id) values ($1, $2)`, [B, org]);
    expect(await as(B, 'select name from projects')).toEqual([{ name: 'Kuhinja' }]);
    expect(await as(B, `update organizations set name = 'X' where id = $1 returning id`, [org])).toEqual([]);
  });

  it('customer projects are private to the customer', async () => {
    await as(C, `insert into projects (owner_user_id, name, data) values ($1, 'Moja kuhinja', '{}')`, [C]);
    expect(await as(C, 'select name from projects')).toEqual([{ name: 'Moja kuhinja' }]);
    expect((await as(A, 'select name from projects')).map(r => r.name)).not.toContain('Moja kuhinja');
    await fails(C, `insert into projects (owner_user_id, data) values ($1, '{}')`, [A]);
    await fails(C, `insert into projects (data) values ('{}')`);
  });
});
