// Keeps the browser's project list (projects.ts) and the server in step while signed in: a workshop member syncs with the
// workshop's projects, a customer (no workshop) with their own kitchens (/me/projects).
// Push: a project changed here is sent 1.5 s after the last change (new → POST, known → PUT; removed → DELETE).
// Pull: on sign-in / app start, projects that are new or changed on the server are fetched; the open project is polled
// every 2 s (shared session: customer and workshop edit the same kitchen, user 2026-11-23).
// Edits from two places: a save carries `base` (the server version it started from); if someone saved since, the server
// answers 409 and this side merges (engine merge3: base = last server data seen here, mine, theirs) and sends again.
// shortcut: the merge base lives in memory — after a reload with unsent edits, this side's version wins those fields.
import { merge3, type Project } from 'engine';
import { api, ApiError, loadWorkshops, useSession } from './session';
import { useProjects, type StoredProject } from './projects';
import { useProject } from './store';

interface ListItem { id: string; clientId?: string; name: string; customer: string; updatedAt: string; resume?: StoredProject['resume'] }

/** Where this user's projects live on the server (null = signed out). */
const target = () => {
  const { session, workshops } = useSession.getState();
  if (!session) return null;
  return workshops[0] ? `/organizations/${workshops[0].id}/projects` : '/me/projects';
};
const dirty = (e: StoredProject) => !e.serverId || !e.pushedAt || e.updatedAt > e.pushedAt;
/** serverId → the server's data as last seen here (merge base). */
const bases = new Map<string, Project>();

/** Takes a server version: merged with this side's unsent edits, into the list and the open project (undo kept). */
function apply(full: ListItem & { data: Project }) {
  const id = full.data.id, cur = useProjects.getState().list[id];
  const mine = cur && cur.serverId && dirty(cur) ? cur.project : null;
  const base = bases.get(full.id);
  const project = mine ? (base ? merge3(base, mine, full.data) : mine) : full.data;
  bases.set(full.id, full.data);
  if (useProject.getState().project?.id === id) useProject.setState({ project }); // projects.ts copies it into the list
  const now = new Date().toISOString();
  useProjects.setState(s => ({ list: { ...s.list, [id]: { ...s.list[id], project, resume: s.list[id]?.resume ?? full.resume, serverId: full.id, serverUpdatedAt: full.updatedAt,
    ...(mine ? { updatedAt: new Date(Math.max(Date.parse(s.list[id]?.updatedAt ?? now), Date.now())).toISOString() } : { updatedAt: now, pushedAt: now }) } } }));
}

/** Fetches one project if it changed on the server since `since` (204 = unchanged). */
async function refresh(serverId: string, since?: string) {
  const full = await api<(ListItem & { data: Project }) | null>('GET', `/projects/${serverId}${since ? `?since=${encodeURIComponent(since)}` : ''}`);
  if (full) apply(full);
}

let timer: number | undefined, running = false, again = false;
async function push() {
  const t = target();
  if (!t) return;
  if (running) { again = true; return; }
  running = true;
  try {
    for (const [id, e] of Object.entries(useProjects.getState().list).filter(([, e]) => dirty(e))) {
      const sent = e.updatedAt;
      const body = { data: e.project, name: e.project.name, customer: e.project.customer ?? '', resume: e.resume, ...(e.serverUpdatedAt && { base: e.serverUpdatedAt }) };
      let r: ListItem;
      try {
        r = e.serverId ? await api<ListItem>('PUT', `/projects/${e.serverId}`, body) : await api<ListItem>('POST', t, body);
      } catch (err) {
        if (!(err instanceof ApiError && err.status === 409 && e.serverId)) throw err;
        await refresh(e.serverId); again = true; continue; // someone saved since: merged, sent on the next round
      }
      bases.set(r.id, e.project);
      useProjects.setState(s => s.list[id] ? { list: { ...s.list, [id]: { ...s.list[id], serverId: r.id, serverUpdatedAt: r.updatedAt, pushedAt: sent } } } : s);
    }
  } catch { /* offline or signed out: tried again on the next change */ }
  finally { running = false; if (again) { again = false; void push(); } }
}

export async function pull() {
  const t = target();
  if (!t) return;
  const before = useProjects.getState().list; // synced before the fetch (a project sent meanwhile is not dropped below)
  const items = await api<ListItem[]>('GET', t);
  // Synced projects this account's list does not have belong to another account (or were deleted): not shown here.
  const gone = new Set(Object.entries(before).filter(([, e]) => e.serverId && !items.some(it => it.id === e.serverId)).map(([id]) => id));
  if (gone.size) dropLocal(id => gone.has(id));
  const list = useProjects.getState().list;
  for (const it of items) {
    const local = Object.entries(list).find(([id, e]) => e.serverId === it.id || id === it.clientId);
    if (local && local[1].serverUpdatedAt === it.updatedAt) continue;
    await refresh(it.id); // edited here since: merged with this side's edits
  }
  void push(); // projects made here before signing in go to the workshop (or the customer's account)
}

/** Removes projects from this browser only (not a delete: the server keeps them); closes the open one if it went. */
function dropLocal(drop: (id: string) => boolean) {
  const ids = Object.keys(useProjects.getState().list).filter(drop);
  for (const id of ids) bases.delete(useProjects.getState().list[id].serverId ?? '');
  skipDelete = true; // startSync's list listener must not DELETE them on the server
  useProjects.setState(st => ({ list: Object.fromEntries(Object.entries(st.list).filter(([id]) => !ids.includes(id))) }));
  skipDelete = false;
  const open = useProject.getState().project;
  if (open && !useProjects.getState().list[open.id]) useProject.setState({ project: null, past: [], future: [] });
}
let skipDelete = false;

/** Starts syncing (once, from main.tsx). */
export function startSync() {
  const removed = new Set<string>();
  useProjects.subscribe((s, prev) => {
    if (!target() || skipDelete) return;
    for (const [id, e] of Object.entries(prev.list)) if (!s.list[id] && e.serverId) removed.add(e.serverId);
    for (const sid of removed) { removed.delete(sid); void api('DELETE', `/projects/${sid}`).catch(() => {}); }
    clearTimeout(timer);
    timer = window.setTimeout(push, 1500);
  });
  // Signed out or another account signed in: synced projects leave this browser (they stay on the server).
  useSession.subscribe((s, prev) => {
    if (prev.session && s.session?.user._id !== prev.session.user._id) dropLocal(id => !!useProjects.getState().list[id].serverId);
  });
  if (useSession.getState().session) void loadWorkshops().then(pull).catch(() => {});
  // Live: the open project follows edits made elsewhere (the other side of a shared session, another device).
  window.setInterval(() => {
    const open = useProject.getState().project, e = open && useProjects.getState().list[open.id];
    if (document.visibilityState !== 'visible' || running || !target() || !e?.serverId) return;
    void refresh(e.serverId, e.serverUpdatedAt).catch(() => {});
  }, 2000);
}
