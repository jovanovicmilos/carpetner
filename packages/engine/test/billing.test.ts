import { describe, expect, it } from 'vitest';
import { addDays, allows, can, entitlements, limit, plusPass, workshopSignup, type Grant } from '../src';

describe('entitlements', () => {
  const signup = workshopSignup('2026-11-20');

  it('trial gives Pro for 30 days, then the workshop drops to Start', () => {
    const day = (d: string) => entitlements(signup, d);
    expect(can(day('2026-12-19'), 'cutlist')).toBe(true);
    expect(limit(day('2026-12-19'), 'users')).toBe(3);
    expect(addDays('2026-11-20', 30)).toBe('2026-12-20');
    expect(can(day('2026-12-20'), 'cutlist')).toBe(false);
    expect(limit(day('2026-12-20'), 'requests.per_month')).toBe(3);
    expect(allows(day('2026-12-20'), 'requests.per_month', 3)).toBe(false);
  });

  it('add-ons add on top of the plan; unlimited stays unlimited', () => {
    const start: Grant[] = [{ product: 'start', from: '2026-01-01' }, { product: 'addon.requests10', from: '2026-01-01' }, { product: 'addon.user', from: '2026-01-01', quantity: 2 }];
    const e = entitlements(start, '2026-06-01');
    expect(limit(e, 'requests.per_month')).toBe(13);
    expect(limit(e, 'users')).toBe(3);
    const pro = entitlements([{ product: 'pro', from: '2026-01-01' }, { product: 'addon.requests10', from: '2026-01-01' }, { product: 'addon.cnc', from: '2026-01-01' }], '2026-06-01');
    expect(limit(pro, 'requests.per_month')).toBeNull();
    expect(allows(pro, 'requests.per_month', 999)).toBe(true);
    expect(can(pro, 'export.cnc')).toBe(true);
    expect(can(entitlements([{ product: 'premium', from: '2026-01-01' }], '2026-06-01'), 'export.cnc')).toBe(false);
  });

  it('Plus counts only for its project and for 90 days', () => {
    const g = [{ product: 'customer.free', from: '2026-11-01' }, plusPass('p1', '2026-11-20')];
    expect(can(entitlements(g, '2026-11-21', { project: 'p1' }), 'request.send')).toBe(true);
    expect(limit(entitlements(g, '2026-11-21', { project: 'p1' }), 'request.workshops')).toBe(3);
    expect(can(entitlements(g, '2026-11-21', { project: 'p2' }), 'request.send')).toBe(false);
    expect(can(entitlements(g, '2027-02-18', { project: 'p1' }), 'request.send')).toBe(false);
  });

  it('unknown products and future grants give nothing', () => {
    const e = entitlements([{ product: 'gone', from: '2026-01-01' }, { product: 'pro', from: '2027-01-01' }], '2026-06-01');
    expect(e.features.size).toBe(0);
    expect(limit(e, 'users')).toBe(0);
  });
});
