// Shared session state (design SesijaKupac / SesijaStolar / SesijaStanja): one poll of the request thread every 3 s while a
// session screen is open. It tells the server this side is here (screen, typing), brings the other side's presence, the
// messages and the edit log (apps/api live.ts), and notes what arrived from the other side since the last poll.
// shortcut: polling (no websocket server to run); 3 s is the delay both sides feel.
import type { Element, Project } from 'engine';
import { useEffect } from 'react';
import { create } from 'zustand';
import { nameOf } from './Planner';
import { api } from './session';

export type Side = 'shop' | 'cust';
export type Edit = { id: string; before?: Element | null; after?: Element | null };
export type LiveMsg = { id: string; side: Side; kind: 'msg' | 'edit'; text: string; pin?: string; edit?: Edit; by: string; createdAt: string; at: string };
export type Here = { at: string; since: string; typing: boolean; screen: string; name: string };
export type Offer = { id: string; version: number; status: string; total: number; validUntil: string; note: string; hasPdf: boolean; createdAt: string; decidedAt?: string; undoUntil?: string };
export type Thread = { id: string; side: Side; name: string; status: string; workshop: string; customer: string; kitchenId?: string; here: Here | null; unread: number; messages: LiveMsg[];
  createdAt: string; takenAt?: string; sent: Project; photos: number; offers: Offer[] };

interface LiveState {
  requestId?: string;
  thread?: Thread;
  offline: boolean;
  /** The messages tab is open: polls mark them read. */
  reading: boolean;
  typing: boolean;
  /** Right panel tab in Prostor (the presence card's "Poruke" opens it). */
  tab: 'el' | 'msg';
  /** What the other side did since the previous poll (edits light up on the plan, messages pop up). */
  fresh: LiveMsg[];
}
export const useLive = create<LiveState>()(() => ({ offline: false, reading: false, typing: false, tab: 'msg', fresh: [] }));

const SCREENS: [RegExp, string][] = [[/prostor|projekat|planer/, 'Prostor'], [/zid/, 'Zid'], [/3d|izgled/, '3D'], [/nacrti/, 'Nacrte'], [/element|prilagodjeni/, 'Elemente'],
  [/krojna/, 'Krojnu listu'], [/ponud/, 'Ponudu'], [/pregled/, 'Pregled'], [/saradnja/, 'Saradnju']];
const screenName = () => SCREENS.find(([re]) => re.test(location.pathname))?.[1] ?? '';

export async function pollLive() {
  const s = useLive.getState(), id = s.requestId;
  if (!id) return;
  try {
    const t = await api<Thread>('GET', `/requests/${id}/thread?live=1&read=${s.reading ? 1 : 0}&typing=${s.typing ? 1 : 0}&screen=${encodeURIComponent(screenName())}`);
    if (useLive.getState().requestId !== id) return;
    const prev = useLive.getState().thread;
    const fresh = prev ? t.messages.filter(m => m.side !== t.side && !prev.messages.some(p => p.id === m.id && p.at === m.at)) : [];
    useLive.setState({ thread: t, offline: false, ...(fresh.length && { fresh }) });
  } catch {
    useLive.setState({ offline: true });
  }
}

let users = 0, timer: number | undefined;
/** Keeps the session of `requestId` live while the calling component is mounted (presence chip, Prostor, Saradnja). */
export function useLiveSession(requestId?: string) {
  useEffect(() => {
    if (!requestId) return;
    if (useLive.getState().requestId !== requestId) useLive.setState({ requestId, thread: undefined, fresh: [], offline: false });
    if (++users === 1) {
      void pollLive();
      timer = window.setInterval(() => { if (document.visibilityState === 'visible') void pollLive(); }, 3000);
    } else if (!useLive.getState().thread) void pollLive();
    return () => { if (--users === 0) clearInterval(timer); };
  }, [requestId]);
}

export async function sendMessage(text: string, pin?: string) {
  const id = useLive.getState().requestId;
  if (!id) return;
  await api('POST', `/requests/${id}/messages`, { text, pin });
  await pollLive();
}

/** Here now = a sign of life within the last 15 s (the other side polls every 3 s). */
export const isHere = (h: Here | null | undefined) => !!h && Date.now() - Date.parse(h.at) < 15_000;

/** "pre 3 s", "pre 5 min", "pre 2 h", "juče", "21. 11." */
export function ago(iso: string) {
  const s = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 1000));
  if (s < 60) return `pre ${s} s`;
  if (s < 3600) return `pre ${Math.round(s / 60)} min`;
  if (s < 86400) return `pre ${Math.round(s / 3600)} h`;
  if (s < 172800) return 'juče';
  const d = new Date(iso);
  return `${d.getDate()}. ${d.getMonth() + 1}.`;
}
export const clock = (iso: string) => new Date(iso).toLocaleTimeString('sr-Latn', { hour: '2-digit', minute: '2-digit' });
export const firstName = (n: string) => n.trim().split(/\s+/)[0] ?? n;
export const initials = (n: string) => n.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('') || '?';
/** Person colours (design): customer green, workshop walnut. */
export const SIDE_COLOR: Record<Side, string> = { cust: '#2E6B4E', shop: '#6B4A33' };

const unitName = (e: Element) => `${e.label} ${nameOf(e)}`;
const len = (mm: number, unit: 'mm' | 'cm') => (unit === 'cm' ? `${+(mm / 10).toFixed(1)} cm` : `${mm} mm`);
/** One edit in words, without a gendered verb: "D2 Sudopera · pomeren za 20 cm". */
export function editText(e: Edit, unit: 'mm' | 'cm') {
  if (e.id === 'room') return { unit: '', what: 'izmenjen prostor (zidovi, otvori, instalacije)' };
  const { before: b, after: a } = e, el = (a ?? b)!;
  const what = !b ? 'dodat' : !a ? 'uklonjen'
    : a.wallId !== b.wallId ? `premešten na zid ${a.wallId}`
    : a.width !== b.width ? `širina ${len(b.width, unit)} → ${len(a.width, unit)}`
    : a.offset !== b.offset ? `pomeren za ${len(Math.abs(a.offset - b.offset), unit)}`
    : a.kind !== b.kind || a.catalogKey !== b.catalogKey ? `zamenjen (${nameOf(b)} → ${nameOf(a)})`
    : 'izmenjen';
  return { unit: unitName(el), what };
}

/** Takes one's own edit back: the unit's changed fields return to before (added → removed, removed → back). */
export function revert(p: Project, e: Edit): Project {
  if (e.id === 'room') return p;
  if (!e.before) return { ...p, elements: p.elements.filter(x => x.id !== e.id) };
  if (!e.after) return p.elements.some(x => x.id === e.id) ? p : { ...p, elements: [...p.elements, e.before] };
  const b = e.before as unknown as Record<string, unknown>, a = e.after as unknown as Record<string, unknown>;
  const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])].filter(k => JSON.stringify(a[k]) !== JSON.stringify(b[k]));
  return { ...p, elements: p.elements.map(x => {
    if (x.id !== e.id) return x;
    const y = { ...x } as unknown as Record<string, unknown>;
    for (const k of keys) { if (k in b) y[k] = b[k]; else delete y[k]; }
    return y as unknown as Element;
  }) };
}
