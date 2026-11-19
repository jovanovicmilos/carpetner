// Workshop settings (Admin → Podrazumevane mere): default dimension source, own dimensions, standard checks, help defaults.
// shortcut: stored in this browser only (organizations.default_preset / help_default with accounts, MVP 8); new projects
// from Brzi start still pick their preset in the form.
import { PRESETS, type Dimensions, type OpeningKind } from 'engine';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type PresetId = 'en1116' | 'iso3055' | 'workshop' | 'none';
export interface WorkshopSettings {
  preset: PresetId; own: Dimensions;
  warnOutside: boolean; checkEmpty: boolean;
  help: 'all' | 'new' | 'off'; hoverCard: boolean; legend: boolean; ownNotes: boolean;
  /** Admin → Biblioteka: handles of new projects, handles the workshop does not offer, catalog units hidden from the
   *  Prostor library (catalog keys and template keys), appliance finish in the realistic 3D. */
  opening: OpeningKind; openingOff: OpeningKind[]; hiddenCatalog: string[]; applianceFinish: 'inox' | 'black' | 'white';
}
/** Opening kinds offered in a project: the workshop's own, plus the one already in use. */
export const openingUsable = (off: OpeningKind[], k: OpeningKind, current?: OpeningKind) => k === current || !off.includes(k);

export const useWorkshop = create<WorkshopSettings & { set: (p: Partial<WorkshopSettings>) => void }>()(persist(
  set => ({ preset: 'en1116', own: PRESETS.workshop, warnOutside: true, checkEmpty: true, help: 'all', hoverCard: true, legend: true, ownNotes: false,
    opening: 'bar', openingOff: [], hiddenCatalog: [], applianceFinish: 'inox', set: p => set(p) }),
  { name: 'kroj-workshop' },
));
