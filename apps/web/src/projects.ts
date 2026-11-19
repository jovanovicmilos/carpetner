// Projects of the workshop and "Nastavi gde si stao" (docs/TOK_PROJEKTA.md, design/Projekti.dc.html).
// The open project lives in store.ts; every change of it is copied here with the time, so Projekti can list them all.
// Resume = the last project screen per project (route + label), saved on every screen change.
// shortcut: browser storage only (localStorage `kroj-projects`); moves to the `projects` table (resume / progress jsonb) with
// accounts (MVP 8). The selection / zoom / tab of TOK_PROJEKTA `ProjectResume` are not kept yet, only the route with its query.
import type { Project } from 'engine';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useProject } from './store';

export interface Resume { path: string; label: string; at: string }
export interface StoredProject { project: Project; updatedAt: string; resume?: Resume }

export const useProjects = create<{ list: Record<string, StoredProject>; remove: (id: string) => void }>()(persist(
  set => ({ list: {}, remove: id => set(s => { const { [id]: _, ...list } = s.list; return { list }; }) }),
  { name: 'kroj-projects' },
));

/** A new id for a project made now (Brzi start, empty room, AI). */
export const newProjectId = () => `p-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

function store(p: Project, resume?: Resume) {
  useProjects.setState(s => ({ list: { ...s.list, [p.id]: { project: p, updatedAt: new Date().toISOString(), resume: resume ?? s.list[p.id]?.resume } } }));
}
// Keep the list in step with the open project (also the one already open when the app starts).
useProject.subscribe((s, prev) => { if (s.project && s.project !== prev.project) store(s.project); });
const open = useProject.getState().project;
if (open && useProjects.getState().list[open.id]?.project !== open) store(open);

/** Screen of a project route, as the resume button names it ("Elementi · D2"). Null = not a project screen. */
export function resumeLabel(path: string): string | null {
  const [, a, b] = path.split('?')[0].split('/');
  switch (a) {
    case 'projekat': return 'Prostor';
    case 'zid': return b ? `Prostor · Zid ${decodeURIComponent(b)}` : 'Prostor';
    case 'nacrti': return 'Nacrti';
    case '3d': return '3D';
    case 'element': return `Elementi · ${decodeURIComponent(b ?? '')}`;
    case 'prilagodjeni': return 'Elementi · prilagođeni';
    case 'krojna-lista': return 'Krojna lista';
    case 'poredjenje': return 'Krojna lista · poređenje';
    case 'ponuda': return 'Ponuda';
    default: return null;
  }
}

/** Remembers the screen of the open project (called on every route change). */
export function saveResume(path: string) {
  const p = useProject.getState().project, label = resumeLabel(path);
  if (!p || !label) return;
  const cur = useProjects.getState().list[p.id];
  if (cur?.resume?.path === path) return;
  store(cur?.project ?? p, { path, label, at: new Date().toISOString() });
}

/** "danas, 21:48", "juče, 17:05", "pre 3 dana", "pre 1 nedelje", "12. 11." (design Projekti). */
export function editedText(iso: string, now = new Date()) {
  const d = new Date(iso), day = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((day(now) - day(d)) / 86400000), time = `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
  if (days <= 0) return `danas, ${time}`;
  if (days === 1) return `juče, ${time}`;
  if (days < 7) return `pre ${days} dana`;
  if (days < 28) return `pre ${Math.floor(days / 7)} nedelje`;
  return `${d.getDate()}. ${d.getMonth() + 1}.`;
}
