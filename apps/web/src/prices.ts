// Workshop price list and quote defaults (Admin → Cenovnik), used by Obračun.
// shortcut: stored in this browser only; moves to price_lists / price_items (docs/DATA_MODEL.md) with accounts (MVP 8).
import { DEFAULT_QUOTE, EXAMPLE_PRICES, type PriceList } from 'engine';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface PriceSettings { prices: PriceList; marginPct: number; vatPct: number; wastePct: number; rounding: 'sheet' | 'half' | 'm2' }

export const usePrices = create<PriceSettings & { save: (s: PriceSettings) => void }>()(persist(
  set => ({ prices: EXAMPLE_PRICES, marginPct: DEFAULT_QUOTE.marginPct, vatPct: DEFAULT_QUOTE.vatPct, wastePct: 15, rounding: 'sheet', save: s => set(s) }),
  { name: 'kroj-prices' },
));
