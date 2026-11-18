// Workshop element templates ("Sačuvaj kao šablon" on the Element screen → library group "Moji šabloni").
// shortcut: stored in this browser only; move to the element_templates table (docs/DATA_MODEL.md) with accounts (MVP 8).
import type { ConstructionRules, Element } from 'engine';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** An element without its position. `materials` / `rules` only when the user chose to save them. */
export interface ElementTemplate {
  key: string; name: string;
  element: Omit<Element, 'id' | 'label' | 'wallId' | 'offset' | 'side' | 'materials'> & { materials?: Element['materials'] };
  rules?: ConstructionRules;
}

// The example template every reference screen shows (design/screens/Main.html).
const EXAMPLE: ElementTemplate = { key: 'tpl-sink', name: 'Sudopera 800 (moja)', element: { kind: 'sink', width: 800, height: 720, depth: 560, legs: 100, shelves: 0, doors: 2, hinge: 'LR' } };

export const useTemplates = create<{ list: ElementTemplate[]; add: (t: Omit<ElementTemplate, 'key'>) => void }>()(persist(
  set => ({ list: [EXAMPLE], add: t => set(s => ({ list: [...s.list, { ...t, key: `tpl-${s.list.length + 1}-${t.name}` }] })) }),
  { name: 'kroj-templates' },
));
