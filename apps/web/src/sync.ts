// Keeps the browser's project list (projects.ts) and the workshop's projects on the server in step while signed in.
// Push: a project changed here is sent 1.5 s after the last change (new → POST, known → PUT; removed → DELETE).
// Pull: on sign-in / app start, projects that are new or changed on the server are fetched.
// shortcut: last write wins — two people editing the same project at once overwrite each other (MARKETPLACE: one editor).
import type { Project } from 'engine';
import { api, loadWorkshops, useSession } from './session';
import { useProjects, type StoredProject } from './projects';
import { useProject } from './store';

interface ListItem { id: string; clientId?: string; name: string; customer: string; updatedAt: string; resume?: StoredProject['resume'] }

const workshop = () => useSession.getState().session && useSession.getState().workshops[0];
const dirty = (e: StoredProject) => !e.serverId || !e.pushedAt || e.updatedAt > e.pushedAt;

let timer: number | undefined, running = false, again = false;
async function push() {
  const w = workshop();
  if (!w) return;
  if (running) { again = true; return; }
  running = true;
  try {
    for (const [id, e] of Object.entries(useProjects.getState().list).filter(([, e]) => dirty(e))) {
      const sent = e.updatedAt;
      const body = { data: e.project, name: e.project.name, customer: e.project.customer ?? '', resume: e.resume };
      const r = e.serverId
        ? await api<ListItem>('PUT', `/projects/${e.serverId}`, body)
        : await api<ListItem>('POST', `/organizations/${w.id}/projects`, body);
      useProjects.setState(s => s.list[id] ? { list: { ...s.list, [id]: { ...s.list[id], serverId: r.id, serverUpdatedAt: r.updatedAt, pushedAt: sent } } } : s);
    }
  } catch { /* offline or signed out: tried again on the next change */ }
  finally { running = false; if (again) { again = false; void push(); } }
}

export async function pull() {
  const w = workshop();
  if (!w) return;
  const items = await api<ListItem[]>('GET', `/organizations/${w.id}/projects`);
  const list = useProjects.getState().list;
  for (const it of items) {
    const local = Object.entries(list).find(([id, e]) => e.serverId === it.id || id === it.clientId);
    if (local && local[1].serverUpdatedAt === it.updatedAt) continue;
    if (local && dirty(local[1]) && local[1].serverId) continue; // edited here since: this browser's copy is sent instead
    const full = await api<ListItem & { data: Project }>('GET', `/projects/${it.id}`);
    const now = new Date().toISOString();
    useProjects.setState(s => ({ list: { ...s.list, [full.data.id]: { project: full.data, resume: full.resume, updatedAt: now, pushedAt: now, serverId: it.id, serverUpdatedAt: full.updatedAt } } }));
    if (useProject.getState().project?.id === full.data.id) useProject.getState().setProject(full.data);
  }
  void push(); // projects made here before signing in go to the workshop
}

/** Starts syncing (once, from main.tsx). */
export function startSync() {
  const removed = new Set<string>();
  useProjects.subscribe((s, prev) => {
    if (!workshop()) return;
    for (const [id, e] of Object.entries(prev.list)) if (!s.list[id] && e.serverId) removed.add(e.serverId);
    for (const sid of removed) { removed.delete(sid); void api('DELETE', `/projects/${sid}`).catch(() => {}); }
    clearTimeout(timer);
    timer = window.setTimeout(push, 1500);
  });
  // Signed out: workshop projects leave this browser (they stay on the server); the next user starts clean.
  useSession.subscribe((s, prev) => {
    if (prev.session && !s.session) {
      useProjects.setState(st => ({ list: Object.fromEntries(Object.entries(st.list).filter(([, e]) => !e.serverId)) }));
      const open = useProject.getState().project;
      if (open && !useProjects.getState().list[open.id]) useProject.setState({ project: null, past: [], future: [] });
    }
  });
  if (useSession.getState().session) void loadWorkshops().then(pull).catch(() => {});
}
