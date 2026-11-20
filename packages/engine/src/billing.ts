// Entitlements (docs/MARKETPLACE.md → Workshop business model): code asks `can` / `limit`, never plan names. Plans, add-ons and
// passes are data (later the `products` / `product_entitlements` tables edited in the platform admin); DEFAULT_PRODUCTS holds the
// decided defaults of 2026-11-20. Pure and deterministic: "today" is passed in as an ISO date.

/** Features that are not in the free Start plan. Everything else in the app is open to every account. */
export type Feature =
  | 'drawings.export'      // Nacrti: PDF / DXF / GLB / OBJ
  | 'cutlist'              // Krojna lista, kant, okov + CSV / XLSX
  | 'quote.full'           // full offer with own logo and terms (Start: simple offer with Kroj branding)
  | 'quote.image'          // "Slika za ponudu"
  | 'images.clean'         // 3D images without watermark
  | 'pilana'               // Poređenje pilana, order to the pilana
  | 'admin.full'           // materials / handles / appliances / catalog (Start: Cenovnik basic, Standardi)
  | 'export.cnc'           // Delovi pojedinačno (CNC) — add-on only
  | 'whitelabel'           // white-label link with Kroj branding
  | 'whitelabel.own'       // white-label link with own branding
  | 'directory.featured'
  | 'stats'
  | 'stats.full'
  | 'users.roles'
  | 'request.send';        // customer: „Pošalji stolaru" (Plus, per project)

export type Limit = 'requests.per_month' | 'users' | 'invites.active' | 'request.workshops';

export interface Product {
  id: string;
  /** plan / pass: limits are a base (the largest wins); add-on: limits are added per quantity. */
  kind: 'plan' | 'addon' | 'pass';
  features: Feature[];
  /** null = unlimited. */
  limits: Partial<Record<Limit, number | null>>;
}

/** An active or past subscription, purchase, trial or manual override (gift, partner deal). Dates are ISO `YYYY-MM-DD`, `to` exclusive. */
export interface Grant {
  product: string;
  from: string;
  to?: string;
  quantity?: number;
  /** Customer passes (Plus) count only for this project. */
  project?: string;
  trial?: boolean;
}

export interface Entitlements {
  features: Set<Feature>;
  limits: Partial<Record<Limit, number | null>>;
}

const WORKSHOP_PAID: Feature[] = ['drawings.export', 'cutlist', 'quote.full', 'quote.image', 'images.clean', 'pilana', 'admin.full', 'whitelabel', 'stats'];

export const DEFAULT_PRODUCTS: Product[] = [
  { id: 'start', kind: 'plan', features: [], limits: { 'requests.per_month': 3, users: 1, 'invites.active': 1 } },
  { id: 'pro', kind: 'plan', features: WORKSHOP_PAID, limits: { 'requests.per_month': null, users: 3, 'invites.active': null } },
  { id: 'premium', kind: 'plan', features: [...WORKSHOP_PAID, 'whitelabel.own', 'directory.featured', 'stats.full', 'users.roles'],
    limits: { 'requests.per_month': null, users: null, 'invites.active': null } },
  { id: 'addon.user', kind: 'addon', features: [], limits: { users: 1 } },
  { id: 'addon.cnc', kind: 'addon', features: ['export.cnc'], limits: {} },
  { id: 'addon.requests10', kind: 'addon', features: [], limits: { 'requests.per_month': 10 } },
  { id: 'addon.featured', kind: 'addon', features: ['directory.featured'], limits: {} },
  { id: 'customer.free', kind: 'plan', features: [], limits: {} },
  { id: 'customer.plus', kind: 'pass', features: ['request.send'], limits: { 'request.workshops': 3 } },
];

export const TRIAL_DAYS = 30;
export const PLUS_DAYS = 90;

export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** A new workshop: Start for good, plus Pro for the trial period (no card). */
export const workshopSignup = (today: string, trialDays = TRIAL_DAYS): Grant[] =>
  [{ product: 'start', from: today }, { product: 'pro', from: today, to: addDays(today, trialDays), trial: true }];

/** Plus bought at „Pošalji stolaru" for one project. */
export const plusPass = (project: string, today: string): Grant => ({ product: 'customer.plus', from: today, to: addDays(today, PLUS_DAYS), project });

/** Effective entitlements = union of the grants active today (for `project`, passes of that project only). */
export function entitlements(grants: Grant[], today: string, opts: { project?: string; products?: Product[] } = {}): Entitlements {
  const products = new Map((opts.products ?? DEFAULT_PRODUCTS).map(p => [p.id, p]));
  const features = new Set<Feature>();
  const base: Partial<Record<Limit, number | null>> = {}, extra: Partial<Record<Limit, number>> = {};
  for (const g of grants) {
    const p = products.get(g.product);
    // ISO dates compare as strings
    if (!p || g.from > today || (g.to !== undefined && today >= g.to) || (g.project !== undefined && g.project !== opts.project)) continue;
    p.features.forEach(f => features.add(f));
    for (const [k, v] of Object.entries(p.limits) as [Limit, number | null][]) {
      if (p.kind === 'addon') extra[k] = (extra[k] ?? 0) + (v ?? 0) * (g.quantity ?? 1);
      else base[k] = base[k] === null || v === null ? null : Math.max(base[k] ?? 0, v);
    }
  }
  const limits: Partial<Record<Limit, number | null>> = { ...base };
  for (const [k, v] of Object.entries(extra) as [Limit, number][]) limits[k] = limits[k] === null ? null : (limits[k] ?? 0) + v;
  return { features, limits };
}

export const can = (e: Entitlements, f: Feature) => e.features.has(f);
/** 0 when the account has no such limit at all; null = unlimited. */
export const limit = (e: Entitlements, l: Limit): number | null => (l in e.limits ? e.limits[l]! : 0);
/** Whether one more use fits, given the usage counter (e.g. requests this month). */
export const allows = (e: Entitlements, l: Limit, used: number) => { const n = limit(e, l); return n === null || used < n; };
