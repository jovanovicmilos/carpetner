// Saw shops / suppliers in Poređenje ("+ Dodaj firmu i cenovnik"), starting with the design's example firms.
// shortcut: stored in this browser only; moves to suppliers / supplier price lists (MVP 8).
import { EXAMPLE_SUPPLIERS, type ImportedPrices, type Supplier, type SupplierPrices } from 'engine';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useSuppliers = create<{ list: Supplier[]; save: (s: Supplier) => void; remove: (id: string) => void }>()(persist(
  set => ({
    list: EXAMPLE_SUPPLIERS,
    save: s => set(st => ({ list: st.list.some(x => x.id === s.id) ? st.list.map(x => (x.id === s.id ? s : x)) : [...st.list, s] })),
    remove: id => set(st => ({ list: st.list.filter(x => x.id !== id) })),
  }),
  { name: 'kroj-suppliers' },
));

/** An imported price list as a supplier's prices (what the list lacks stays undefined → shown as missing). */
export const supplierPrices = (r: ImportedPrices): SupplierPrices => ({
  sheets: r.sheets, edgingPerM: r.edgingPerM,
  ...(r.items.worktopPiece !== undefined && { worktopPiece: r.items.worktopPiece }),
  ...(r.items.cuttingPerM !== undefined && { cuttingPerM: r.items.cuttingPerM }),
  ...(r.items.delivery !== undefined && { delivery: r.items.delivery }),
});
