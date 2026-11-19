// Issued quotes (docs/DATA_MODEL.md `quotes`: frozen_prices, totals, created_at), one — the latest — per project.
// SPEC: prices are frozen in a quote; when the price list changes, Obračun offers "Preračunaj".
// shortcut: stored in this browser only, keyed by project id; moves to the quotes table with accounts (MVP 8).
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PriceSettings } from './prices';

export interface IssuedQuote {
  /** Cenovnik as it was when the PDF was made (prices, waste, rounding, VAT) and the quote's own margin / discount. */
  frozen: Omit<PriceSettings, 'marginPct'>; marginPct: number; discountPct: number;
  total: number; createdAt: string;
}

export const useQuotes = create<{ byProject: Record<string, IssuedQuote>; issue: (id: string, q: IssuedQuote) => void; drop: (id: string) => void }>()(persist(
  set => ({
    byProject: {},
    issue: (id, q) => set(s => ({ byProject: { ...s.byProject, [id]: q } })),
    drop: id => set(s => { const { [id]: _, ...rest } = s.byProject; return { byProject: rest }; }),
  }),
  { name: 'kroj-quotes' },
));

/** Price settings that change the money (margin is the quote's own, so it is not compared). */
export const sameCenovnik = (a: Omit<PriceSettings, 'marginPct'>, b: PriceSettings) =>
  stable([a.prices, a.vatPct, a.wastePct, a.rounding]) === stable([b.prices, b.vatPct, b.wastePct, b.rounding]);
/** JSON with sorted keys, so a re-saved price list with the same values compares equal. */
const stable = (v: unknown): string => JSON.stringify(v, (_, x) => (x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.entries(x).sort(([a], [b]) => a.localeCompare(b))) : x));
