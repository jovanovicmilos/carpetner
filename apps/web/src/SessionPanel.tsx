// Prostor in a shared session (design SesijaKupac / SesijaStolar / SesijaTelefon, 2026-11-23 14:10: chat is the primary part).
// - SessionPanel: the right aside, only the Element panel (the selection's measurements + "Komentar").
// - ChatDock (wide screens): a dock fixed bottom-right like LinkedIn messaging; collapsed = a bar with the other person, the
//   last message and the unread count; open = 540 px with the feed of messages + edits and the composer. Open / collapsed is
//   remembered per user (customer default open, workshop default collapsed).
// - ChatHead (phone): a Messenger-style 56 px circle, draggable, snaps to the nearest side, peek of the newest message;
//   tap = full-screen modal with × ; dropping it on the × target hides it until the next new message.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { clock, editText, firstName, isHere, openChat, revert, sendMessage, SIDE_COLOR, useLive, WIDE, type Edit, type LiveMsg, type Thread } from './live';
import type { Partner } from './partner';
import { Avatar } from './Presence';
import { useSession } from './session';
import { useProject } from './store';

export const dayOf = (iso: string) => {
  const d = new Date(iso), today = new Date(), y = new Date(Date.now() - 86400000);
  return d.toDateString() === today.toDateString() ? 'Danas' : d.toDateString() === y.toDateString() ? 'Juče' : `${d.getDate()}. ${d.getMonth() + 1}.`;
};

/** Right aside: the Element panel (`head` = kind + name, then "Komentar", then `body`). On a phone it shows only while
 * something is selected (a bottom sheet). Wide: the bottom keeps room for the chat dock, so every field scrolls above it. */
export function SessionPanel({ head, body, selected, open, className }: { head: ReactNode; body: ReactNode; selected?: { id: string; name: string }; open: boolean; className?: string }) {
  const dock = useLive(s => s.dock);
  return (
    <aside aria-label="Izabrano" className={cn('box-border flex min-h-0 flex-[0_0_340px] flex-col gap-3 overflow-y-auto border-0 border-l border-solid border-border bg-white px-4 pt-3.5', dock ? 'pb-[560px]' : 'pb-20', 'max-[900px]:pb-4', !open && 'max-[900px]:hidden', className)}>
      {head}
      {selected && <Button variant="outline" size="none" className="min-h-[38px] flex-none rounded-md border-primary text-[13px] font-semibold text-accent-ink" onClick={() => openChat(selected)}>Komentar na {selected.name}</Button>}
      {body}
    </aside>
  );
}

type FeedProps = { partner: Partner; unit: 'mm' | 'cm'; onShow: (id: string) => void; onUndo: (e: Edit) => void };
const useThread = (partner: Partner) => useLive(s => (s.requestId === partner.requestId ? s.thread : undefined));
const otherOf = (t: Thread | undefined, partner: Partner) => ({ name: t?.here?.name || partner.name, side: (t?.side === 'shop' ? 'cust' : 'shop') as 'cust' | 'shop', here: isHere(t?.here) });
/** Marks the messages read while they are on screen. */
function useReading(on: boolean) {
  useEffect(() => { if (!on) return; useLive.setState({ reading: true }); return () => useLive.setState({ reading: false }); }, [on]);
}
function useWide() {
  const [wide, setWide] = useState(() => matchMedia(WIDE).matches);
  useEffect(() => { const m = matchMedia(WIDE), f = () => setWide(m.matches); m.addEventListener('change', f); return () => m.removeEventListener('change', f); }, []);
  return wide;
}

/** The feed (messages + edits, filter) and the composer; `phone` = the modal's look (edits as centred chips, round send). */
function Chat({ partner, unit, onShow, onUndo, phone = false }: FeedProps & { phone?: boolean }) {
  const t = useThread(partner), pin = useLive(s => s.pin);
  const [all, setAll] = useState(true);
  const [draft, setDraft] = useState('');
  const feed = useRef<HTMLOListElement>(null);
  const items = (t?.messages ?? []).filter(m => all || m.kind !== 'edit');
  useEffect(() => { feed.current?.scrollTo({ top: feed.current.scrollHeight }); }, [items.length]);
  useEffect(() => { useLive.setState({ typing: !!draft.trim() }); }, [draft]);
  useEffect(() => () => useLive.setState({ typing: false }), []);
  const other = otherOf(t, partner), short = firstName(other.name);
  const send = () => {
    const text = draft.trim();
    if (!text) return;
    setDraft(''); useLive.setState({ pin: null });
    void sendMessage(text, pin?.name).catch(() => setDraft(text));
  };
  return (<>
    {!phone && <div className="flex flex-none items-center gap-2 border-0 border-b border-solid border-[#EEEAE2] px-4 py-2.5">
      <span role="radiogroup" aria-label="Prikaži" className="inline-flex rounded-md bg-background p-0.5">
        {([[true, 'Sve'], [false, 'Samo poruke']] as const).map(([v, l]) => (
          <button key={l} type="button" role="radio" aria-checked={all === v} onClick={() => setAll(v)}
            className="min-h-[30px] cursor-pointer rounded-[5px] border-0 bg-transparent px-2.5 font-sans text-[13px] font-medium text-ink-2 aria-checked:bg-white aria-checked:font-semibold aria-checked:text-foreground aria-checked:shadow-[0_1px_3px_rgba(0,0,0,0.12)]">{l}</button>
        ))}
      </span>
      <Link to={`/saradnja/${partner.requestId}`} className="ml-auto text-[13px] font-semibold">Saradnja i ponuda →</Link>
    </div>}
    <ol ref={feed} aria-label="Poruke i izmene" className="m-0 flex min-h-0 flex-1 list-none flex-col gap-2.5 overflow-y-auto px-4 py-3">
      {t && !items.length && <li className="text-[13.5px] text-muted-foreground">Još nema poruka. Pitaj nešto ili ostavi komentar na element.</li>}
      {items.map((m, i) => <FeedItem key={m.id} m={m} mine={m.side === t!.side} unit={unit} chip={phone} day={i === 0 || dayOf(items[i - 1].createdAt) !== dayOf(m.createdAt) ? dayOf(m.createdAt) : null}
        onShow={id => { onShow(id); if (phone) useLive.setState({ modal: false }); }} onUndo={onUndo} />)}
      {other.here && t?.here?.typing && (
        <li className="flex items-center gap-1.5 text-[12.5px] text-muted-foreground"><span aria-hidden="true" className="inline-flex gap-[3px]">{[0, 1, 2].map(k => <span key={k} className="size-[5px] rounded-full bg-muted-2" />)}</span>{short} piše…</li>
      )}
    </ol>
    <form onSubmit={e => { e.preventDefault(); send(); }} className="flex flex-none flex-col gap-1.5 border-0 border-t border-solid border-[#EEEAE2] px-4 pt-2.5 pb-3">
      {pin && <span className="inline-flex items-center gap-1.5 self-start rounded-xl bg-accent-soft py-[3px] pr-1 pl-2.5 text-[12px] text-accent-ink">Komentar na: {pin.name}
        <button type="button" aria-label="Ukloni vezu sa elementom" onClick={() => useLive.setState({ pin: null })} className="size-[22px] cursor-pointer rounded-full border-0 bg-transparent text-accent-ink">×</button></span>}
      <div className="flex items-end gap-1.5">
        <Textarea rows={phone ? 1 : 2} value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          aria-label={pin ? `Komentar na ${pin.name}` : `Poruka za ${other.name}`} placeholder={pin ? `Komentar na ${pin.name.split(' ')[0]}…` : `Poruka za ${short}…`}
          className={cn('min-h-0 flex-1 resize-none text-[14px] leading-[1.4]', phone ? 'rounded-[22px] px-4 py-3' : 'rounded-lg px-2.5 py-2')} />
        {phone
          ? <Button type="submit" size="none" aria-label="Pošalji" disabled={!draft.trim()} className="size-11 flex-none rounded-full"><svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M3 9h11M10 4.5L14.5 9 10 13.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg></Button>
          : <Button type="submit" size="none" disabled={!draft.trim()} className="min-h-10 rounded-lg px-3.5 text-[13.5px] font-semibold">Pošalji</Button>}
      </div>
      {!phone && <span className="text-[11.5px] text-muted-2">Enter šalje · Shift+Enter novi red</span>}
    </form>
  </>);
}

const ExtIcon = () => <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M9 2.5h4.5V7M13.5 2.5L7.5 8.5M11.5 9.5v4h-9v-9h4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>;
const Chevron = ({ up }: { up: boolean }) => <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d={up ? 'M3 9l4-4 4 4' : 'M3 5l4 4 4-4'} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
/** Avatar with the presence dot. */
const Face = ({ name, side, here, size }: { name: string; side: 'cust' | 'shop'; here: boolean; size: number }) => (
  <span className="relative inline-flex flex-none"><Avatar name={name} side={side} size={size} />
    <span aria-hidden="true" className={cn('absolute right-0 bottom-0 box-border rounded-full border-2 border-solid border-white', here ? 'bg-[#3FB06A]' : 'bg-muted-2')} style={{ width: size * 0.3, height: size * 0.3 }} /></span>
);
const preview = (t: Thread | undefined) => {
  const m = t?.messages.filter(x => x.kind === 'msg').at(-1);
  return m ? `${m.side === t!.side ? 'Ti' : firstName(m.by)}: ${m.text}` : 'Još nema poruka';
};

/** Desktop dock, fixed bottom-right over the lower part of the right aside. */
export function ChatDock(props: FeedProps & { customer: boolean }) {
  const { partner, customer } = props;
  const t = useThread(partner), open = useLive(s => s.dock), wide = useWide();
  const uid = useSession(s => s.session?.user._id ?? '');
  const key = `kroj-chat-dock:${uid}`;
  useEffect(() => { // remembered per user; first time: customer open, workshop collapsed (design)
    let v: string | null = null;
    try { v = localStorage.getItem(key); } catch { /* private mode */ }
    useLive.setState({ dock: v === null ? customer : v === '1' });
  }, [key, customer]);
  const toggle = (o = !open) => { useLive.setState({ dock: o }); try { localStorage.setItem(key, o ? '1' : '0'); } catch { /* private mode */ } };
  useReading(open && wide);
  const other = otherOf(t, partner), unread = open ? 0 : t?.unread ?? 0;
  const sub = other.here ? 'u kuhinji je sada · vidite izmene jedno drugog' : t?.here ? 'nije u kuhinji' : 'poruke stižu i kad nije tu';
  // Drag the bar left / right (user 2026-11-24); a press without moving still opens / closes it.
  const right = useLive(s => s.dockRight), drag = useRef<{ x: number; right: number; moved: boolean } | null>(null);
  const clamp = (r: number) => Math.max(0, Math.min(innerWidth - 360, r));
  return (
    <section aria-label={`Poruke sa: ${other.name}`} style={{ right: clamp(right) }} className={cn('fixed bottom-0 z-40 flex w-[360px] flex-col overflow-hidden rounded-t-xl border border-b-0 border-solid border-border bg-white font-sans shadow-[0_-6px_24px_rgba(28,27,25,0.14)] max-[900px]:hidden', open && 'h-[540px] max-h-[calc(100dvh-120px)]')}>
      <div className="flex flex-none cursor-grab touch-none items-center gap-2.5 border-0 border-b border-solid border-[#EEEAE2] px-3 py-2.5 select-none" title="Prevuci levo ili desno"
        onPointerDown={e => { if ((e.target as HTMLElement).closest('a,button')) return; e.currentTarget.setPointerCapture(e.pointerId); drag.current = { x: e.clientX, right: clamp(right), moved: false }; }}
        onPointerMove={e => { const d = drag.current; if (!d) return; if (Math.abs(e.clientX - d.x) > 5) d.moved = true; if (d.moved) useLive.setState({ dockRight: clamp(d.right - (e.clientX - d.x)) }); }}
        onPointerUp={() => { const d = drag.current; drag.current = null; if (!d) return;
          if (d.moved) { try { localStorage.setItem('kroj-chat-dock-x', String(useLive.getState().dockRight)); } catch { /* private mode */ } } else toggle(); }}>
        <Face name={other.name} side={other.side} here={other.here} size={36} />
        <span className="flex min-w-0 flex-1 flex-col leading-[1.3]">
          <strong className="truncate text-[14px]">{other.name}{customer && t?.here ? ` (${partner.name})` : ''}</strong>
          <span className="truncate text-[12px] text-muted-foreground">{open ? sub : preview(t)}</span>
        </span>
        {unread > 0 && <span aria-label={`${unread} nove`} className="inline-flex h-5 min-w-5 flex-none items-center justify-center rounded-[10px] bg-primary px-1.5 text-[12px] font-semibold text-white">{unread}</span>}
        <Link to={`/saradnja/${partner.requestId}`} onClick={e => e.stopPropagation()} aria-label="Saradnja i ponuda" title="Saradnja i ponuda" className="inline-flex size-8 items-center justify-center rounded-md text-ink-2 hover:bg-background hover:text-foreground"><ExtIcon /></Link>
        <button type="button" aria-expanded={open} aria-label={open ? 'Spusti poruke' : `Otvori poruke${unread ? ` (${unread} nove)` : ''}`} onClick={e => { e.stopPropagation(); toggle(); }}
          className="inline-flex size-8 cursor-pointer items-center justify-center rounded-md border-0 bg-transparent text-ink-2 hover:bg-background"><Chevron up={!open} /></button>
      </div>
      {open && <Chat {...props} />}
    </section>
  );
}

/** Phone: the draggable chat head and the full-screen chat. */
export function ChatHead(props: FeedProps) {
  const { partner } = props;
  const t = useThread(partner), modal = useLive(s => s.modal), hidden = useLive(s => s.headHidden), wide = useWide();
  useReading(modal && !wide);
  const other = otherOf(t, partner), unread = t?.unread ?? 0;
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [drag, setDrag] = useState<{ dx: number; dy: number; moved: boolean } | null>(null);
  const [peek, setPeek] = useState('');
  const fresh = useLive(s => s.fresh);
  useEffect(() => { const m = fresh.filter(x => x.kind === 'msg').at(-1); if (m && !useLive.getState().modal) setPeek(m.text); }, [fresh]);
  useEffect(() => { if (!peek) return; const k = window.setTimeout(() => setPeek(''), 6000); return () => clearTimeout(k); }, [peek]);
  if (wide) return null;
  const S = 56, at = pos ?? { x: innerWidth - S - 12, y: innerHeight - 300 };
  const clampY = (y: number) => Math.max(72, Math.min(innerHeight - S - 90, y));
  const target = { x: innerWidth / 2, y: innerHeight - 80 };
  const overX = (p: { x: number; y: number }) => Math.hypot(p.x + S / 2 - target.x, p.y + S / 2 - target.y) < 56;
  return (<>
    {!hidden && <button type="button" aria-label={`Poruke sa: ${other.name}${unread ? ` (${unread} nove)` : ''}`}
      className="fixed z-40 flex size-14 cursor-pointer touch-none items-center justify-center rounded-full border-0 bg-transparent p-0 shadow-[0_6px_18px_rgba(28,27,25,0.3)] min-[901px]:hidden"
      style={{ left: at.x, top: at.y, transition: drag ? 'none' : 'left .2s ease, top .2s ease' }}
      onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); setDrag({ dx: e.clientX - at.x, dy: e.clientY - at.y, moved: false }); }}
      onPointerMove={e => { if (!drag) return; const p = { x: e.clientX - drag.dx, y: e.clientY - drag.dy };
        if (drag.moved || Math.hypot(p.x - at.x, p.y - at.y) > 6) { setDrag({ ...drag, moved: true }); setPos(p); } }}
      onPointerUp={() => {
        if (!drag) return;
        if (!drag.moved) { setPeek(''); useLive.setState({ modal: true }); }
        else if (overX(at)) { useLive.setState({ headHidden: true }); setPos(null); }
        else setPos({ x: at.x + S / 2 < innerWidth / 2 ? 12 : innerWidth - S - 12, y: clampY(at.y) }); // snap to the nearest side
        setDrag(null);
      }}>
      <Face name={other.name} side={other.side} here={other.here} size={S} />
      {unread > 0 && <span aria-hidden="true" className="absolute -top-1 -right-1 inline-flex h-[22px] min-w-[22px] items-center justify-center rounded-full border-2 border-solid border-white bg-[#C2410C] px-1 text-[12px] font-bold text-white">{unread}</span>}
      {peek && !drag && <span aria-hidden="true" className={cn('absolute top-1/2 w-max max-w-[220px] -translate-y-1/2 rounded-xl bg-white px-2.5 py-2 text-left font-sans text-[13px] leading-[1.35] text-foreground shadow-[0_4px_14px_rgba(28,27,25,0.18)]',
        at.x > innerWidth / 2 ? 'right-[66px]' : 'left-[66px]')}>{peek}</span>}
    </button>}
    {drag?.moved && <span aria-hidden="true" className={cn('fixed z-[39] flex size-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-solid border-foreground bg-white text-[20px] font-bold min-[901px]:hidden', overX(at) && 'scale-110 bg-background')}
      style={{ left: target.x, top: target.y }}>×</span>}
    <Dialog open={modal && !wide} onOpenChange={o => useLive.setState({ modal: o })}>
      <DialogContent aria-describedby="chat-sub" className="top-0 left-0 h-dvh w-full max-w-none translate-x-0 translate-y-0 gap-0 rounded-none p-0 sm:top-[5dvh] sm:left-1/2 sm:h-[90dvh] sm:w-[min(420px,calc(100%-32px))] sm:-translate-x-1/2 sm:rounded-2xl">
        <div className="flex flex-none items-center gap-3 border-0 border-b border-solid border-[#EEEAE2] px-4 py-3">
          <Face name={other.name} side={other.side} here={other.here} size={40} />
          <span className="flex min-w-0 flex-1 flex-col leading-[1.3]">
            <DialogTitle className="truncate text-[16px]">{other.name}</DialogTitle>
            <DialogDescription id="chat-sub" className="truncate text-[12.5px]">{other.side === 'shop' ? `${partner.name} · ` : ''}{other.here ? 'u kuhinji je' : 'nije u kuhinji'}</DialogDescription>
          </span>
          <Button variant={null} size="none" aria-label="Zatvori poruke" onClick={() => useLive.setState({ modal: false })} className="size-11 rounded-full bg-background text-[20px]">×</Button>
        </div>
        <Chat {...props} phone />
      </DialogContent>
    </Dialog>
  </>);
}

/** One feed row (also in Saradnja): a day line, an edit with Poništi / Prikaži when given (`chip` = centred, phone), or a message bubble. */
export function FeedItem({ m, mine, unit, day, onShow, onUndo, chip = false }: { m: LiveMsg; mine: boolean; unit: 'mm' | 'cm'; day: string | null; onShow?: (id: string) => void; onUndo?: (e: Edit) => void; chip?: boolean }) {
  const who = mine ? 'Ti' : firstName(m.by);
  const dayRow = day && <li className="self-center text-[12px] text-muted-foreground">{day}</li>;
  if (m.kind === 'edit' && m.edit) {
    const { unit: u, what } = editText(m.edit, unit), unitEdit = m.edit.id !== 'room';
    const act = unitEdit && (mine
      ? onUndo && <button type="button" onClick={() => onUndo(m.edit!)} className="min-h-[26px] cursor-pointer border-0 bg-transparent font-sans text-[12px] font-semibold text-primary">Poništi</button>
      : m.edit.after && onShow && <button type="button" onClick={() => onShow(m.edit!.id)} className="min-h-[26px] cursor-pointer border-0 bg-transparent font-sans text-[12px] font-semibold text-primary">Prikaži</button>);
    return (<>{dayRow}
      <li className={cn('flex items-center gap-2 text-[12.5px] text-ink-2', chip && 'max-w-[92%] gap-1.5 self-center rounded-xl bg-[#F6EEE2] py-0.5 pr-1.5 pl-2.5')}>
        <span aria-hidden="true" className="size-2 flex-none rounded-[2px]" style={{ background: SIDE_COLOR[m.side] }} />
        <span className={cn('leading-[1.35]', !chip && 'flex-1')}><strong className="font-semibold">{who}</strong> · {u && `${u} — `}{what}{!chip && <span className="ml-1 text-muted-2">· {clock(m.at)}</span>}</span>
        {act}
      </li>
    </>);
  }
  return (<>{dayRow}
    <li className={cn('flex max-w-[86%] flex-col gap-[3px]', mine ? 'items-end self-end' : 'self-start')}>
      {!chip && <span className="text-[11.5px] text-muted-foreground">{who} · {clock(m.createdAt)}</span>}
      {m.pin && chip && <span className="rounded-[10px] bg-accent-soft px-2 py-px text-[11.5px] text-accent-ink">Komentar na: {m.pin}</span>}
      <span className={cn('px-[11px] py-2 text-[14px] leading-[1.4] whitespace-pre-wrap', chip ? 'rounded-[18px]' : 'rounded-[10px]', mine ? (chip ? 'bg-primary text-white' : 'bg-accent-soft') : 'bg-background')}>{m.text}</span>
      {m.pin && !chip && <button type="button" onClick={() => onShow?.(m.pin!.split(' ')[0])} className="cursor-pointer border-0 bg-transparent p-0 font-sans text-[11.5px] text-accent-ink underline">Komentar na: {m.pin}</button>}
    </li>
  </>);
}

/** The chat on every screen of a kitchen shared with a customer (user 2026-11-24); Prostor shows its own, wired to the plan. */
export function ProjectChat({ partner, customer }: { partner: Partner | null; customer: boolean }) {
  const editor = useLive(s => s.editorChat), project = useProject(s => s.project), change = useProject(s => s.change), navigate = useNavigate();
  if (!partner || editor) return null;
  const props: FeedProps = { partner, unit: customer ? 'cm' : project?.unit === 'cm' ? 'cm' : 'mm',
    onShow: () => navigate(customer ? '/kupac/prostor' : '/projekat'), onUndo: e => change(p => revert(p, e)) };
  return <><ChatDock {...props} customer={customer} /><ChatHead {...props} /></>;
}
