// Public workshop directory from apps/api (GET /workshops, /workshops/:id): workshops with a city in their profile.
// Used by Radionice (site directory + profile) and Pošalji (customer sends a kitchen).
import { useEffect, useState } from 'react';
import { api } from './session';

export interface DirShop { id: string; name: string; city: string; about?: string; km?: number; services?: string[]; leadFrom?: number; leadTo?: number; open?: boolean; works?: { id: string; name: string }[] }

/** The directory: null while loading, [] when empty or the API is not reachable. */
export function useDirectory(): DirShop[] | null {
  const [dir, setDir] = useState<DirShop[] | null>(null);
  useEffect(() => { api<DirShop[]>('GET', '/workshops').then(setDir).catch(() => setDir([])); }, []);
  return dir;
}

/** One workshop: undefined while loading, null when not found / not listed. */
export function useWorkshop(id?: string): DirShop | null | undefined {
  const [w, setW] = useState<DirShop | null | undefined>(undefined);
  useEffect(() => { setW(undefined); if (id) api<DirShop>('GET', `/workshops/${id}`).then(setW).catch(() => setW(null)); }, [id]);
  return w;
}

/** The card's words for a directory workshop. */
export const dirWords = (w: DirShop) => ({
  where: `${w.city} · do ${w.km ?? 30} km`,
  lead: w.leadFrom && w.leadTo ? `${w.leadFrom}–${w.leadTo} nedelja` : 'po dogovoru',
  extra: w.services?.includes('mo') ? (w.services.includes('m') ? 'Merenje i montaža' : 'Montaža') : w.services?.includes('m') ? 'Merenje' : 'Bez montaže',
  mount: !!w.services?.includes('mo'),
  fast: !!w.leadTo && w.leadTo <= 5,
  initials: w.name.split(/\s+/).filter(Boolean).slice(0, 2).map(s => s[0].toUpperCase()).join(''),
});
