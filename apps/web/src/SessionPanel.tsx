// Right panel of Prostor in a shared session (design SesijaKupac / SesijaStolar): tab "Element" (what the plan's selection
// panel shows outside a session) and tab "Poruke i izmene" = one feed of the request's messages and the kitchen's edits,
// with "Poništi" on one's own edits and "Prikaži" on the other side's. It never covers the plan (UI_PRAVILA).
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { clock, editText, firstName, isHere, pollLive, sendMessage, SIDE_COLOR, useLive, type Edit, type LiveMsg } from './live';
import type { Partner } from './partner';

export const dayOf = (iso: string) => {
  const d = new Date(iso), today = new Date(), y = new Date(Date.now() - 86400000);
  return d.toDateString() === today.toDateString() ? 'Danas' : d.toDateString() === y.toDateString() ? 'Juče' : `${d.getDate()}. ${d.getMonth() + 1}.`;
};

export function SessionPanel({ partner, unit, element, selected, onShow, onUndo, className }: {
  partner: Partner; unit: 'mm' | 'cm';
  /** Tab "Element": the selection's measurements (the Editor's panel), or a hint when nothing is selected. */
  element: ReactNode;
  /** The selected unit, for "Komentar". */
  selected?: { id: string; name: string };
  /** Selects a unit on the plan, by id or label ("D4"). */
  onShow: (id: string) => void; onUndo: (e: Edit) => void; className?: string;
}) {
  const tab = useLive(s => s.tab), t = useLive(s => (s.requestId === partner.requestId ? s.thread : undefined));
  const [all, setAll] = useState(true);
  const [draft, setDraft] = useState('');
  const [pin, setPin] = useState<{ id: string; name: string } | null>(null);
  // Phone (design SesijaTelefon): a bottom sheet — only the tabs until one is tapped, so the plan keeps the screen.
  const [sheet, setSheet] = useState(false);
  const pick = (k: 'el' | 'msg') => { setSheet(o => (k === tab ? !o : true)); useLive.setState({ tab: k }); };
  const shut = cn(!sheet && 'max-[900px]:hidden');
  const feed = useRef<HTMLOListElement>(null);
  const reading = tab === 'msg';
  useEffect(() => { useLive.setState({ reading }); if (reading) void pollLive(); return () => useLive.setState({ reading: false }); }, [reading]);
  useEffect(() => { useLive.setState({ typing: !!draft.trim() }); }, [draft]);
  useEffect(() => () => useLive.setState({ typing: false }), []);
  const items = (t?.messages ?? []).filter(m => all || m.kind !== 'edit');
  useEffect(() => { feed.current?.scrollTo({ top: feed.current.scrollHeight }); }, [items.length, reading]);
  const unread = reading ? 0 : t?.unread ?? 0;
  const otherShort = firstName(t?.here?.name || partner.name);

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    setDraft(''); setPin(null);
    void sendMessage(text, pin ? `${pin.name}` : undefined).catch(() => setDraft(text));
  };
  const comment = () => { if (selected) { setPin(selected); setSheet(true); useLive.setState({ tab: 'msg' }); } };
  const tabCls = 'flex-1 min-h-[46px] cursor-pointer border-0 border-b-2 border-solid border-transparent bg-transparent font-sans text-[14px] font-medium text-ink-2 aria-selected:border-primary aria-selected:font-semibold aria-selected:text-foreground';

  return (
    <aside aria-label="Desni panel" className={cn('box-border flex min-h-0 flex-[0_0_340px] flex-col border-0 border-l border-solid border-border bg-white', className)}>
      <div role="tablist" aria-label="Panel" className="flex flex-none border-0 border-b border-solid border-border">
        <button type="button" role="tab" aria-selected={tab === 'el'} className={tabCls} aria-expanded={sheet} onClick={() => pick('el')}>Element</button>
        <button type="button" role="tab" aria-selected={tab === 'msg'} className={tabCls} aria-expanded={sheet} onClick={() => pick('msg')}>
          Poruke i izmene{unread > 0 && <span aria-label={`${unread} nove`} className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-[10px] bg-primary px-1.5 text-[12px] font-semibold text-white">{unread}</span>}
        </button>
      </div>

      {tab === 'el' ? (
        <section className={cn('flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-3.5', shut)}>
          {element}
          {selected && <Button variant="outline" size="none" className="min-h-[38px] rounded-md border-primary text-[13px] font-semibold text-accent-ink" onClick={comment}>Komentar na {selected.name}</Button>}
        </section>
      ) : (<>
        <div className={cn('flex flex-none items-center gap-2 border-0 border-b border-solid border-[#EEEAE2] px-4 py-2.5', shut)}>
          <span role="radiogroup" aria-label="Prikaži" className="inline-flex rounded-md bg-background p-0.5">
            {([[true, 'Sve'], [false, 'Samo poruke']] as const).map(([v, l]) => (
              <button key={l} type="button" role="radio" aria-checked={all === v} onClick={() => setAll(v)}
                className="min-h-[30px] cursor-pointer rounded-[5px] border-0 bg-transparent px-2.5 font-sans text-[13px] font-medium text-ink-2 aria-checked:bg-white aria-checked:font-semibold aria-checked:text-foreground aria-checked:shadow-[0_1px_3px_rgba(0,0,0,0.12)]">{l}</button>
            ))}
          </span>
          <Link to={`/saradnja/${partner.requestId}`} className="ml-auto text-[13px] font-semibold">Saradnja i ponuda →</Link>
        </div>
        <ol ref={feed} aria-label="Poruke i izmene" className={cn('m-0 flex min-h-0 flex-1 list-none flex-col gap-2.5 overflow-y-auto px-4 py-3', shut)}>
          {t && !items.length && <li className="text-[13.5px] text-muted-foreground">Još nema poruka. Pitaj nešto ili ostavi komentar na element.</li>}
          {items.map((m, i) => <FeedItem key={m.id} m={m} mine={m.side === t!.side} unit={unit} day={i === 0 || dayOf(items[i - 1].createdAt) !== dayOf(m.createdAt) ? dayOf(m.createdAt) : null}
            onShow={onShow} onUndo={onUndo} />)}
          {isHere(t?.here) && t?.here?.typing && (
            <li className="flex items-center gap-1.5 text-[12.5px] text-muted-foreground"><span aria-hidden="true" className="inline-flex gap-[3px]">{[0, 1, 2].map(k => <span key={k} className="size-[5px] rounded-full bg-muted-2" />)}</span>{otherShort} piše…</li>
          )}
        </ol>
        <form onSubmit={e => { e.preventDefault(); send(); }} className={cn('flex flex-none flex-col gap-1.5 border-0 border-t border-solid border-[#EEEAE2] px-4 pt-2.5 pb-3', shut)}>
          {pin && <span className="inline-flex items-center gap-1.5 self-start rounded-xl bg-accent-soft py-[3px] pr-1 pl-2.5 text-[12px] text-accent-ink">Komentar na: {pin.name}
            <button type="button" aria-label="Ukloni vezu sa elementom" onClick={() => setPin(null)} className="size-[22px] cursor-pointer rounded-full border-0 bg-transparent text-accent-ink">×</button></span>}
          <div className="flex items-end gap-1.5">
            <Textarea rows={2} value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
              aria-label={pin ? `Komentar na ${pin.name}` : `Poruka za ${partner.name}`} placeholder={pin ? `Komentar na ${pin.name.split(' ')[0]}…` : `Poruka za ${otherShort}…`}
              className="min-h-0 flex-1 resize-none rounded-lg px-2.5 py-2 text-[14px] leading-[1.4]" />
            <Button type="submit" size="none" disabled={!draft.trim()} className="min-h-10 rounded-lg px-3.5 text-[13.5px] font-semibold">Pošalji</Button>
          </div>
          <span className="text-[11.5px] text-muted-2">Enter šalje · Shift+Enter novi red</span>
        </form>
      </>)}
    </aside>
  );
}

/** One feed row (also in Saradnja): a day line, an edit with Poništi / Prikaži when given, or a message bubble. */
export function FeedItem({ m, mine, unit, day, onShow, onUndo }: { m: LiveMsg; mine: boolean; unit: 'mm' | 'cm'; day: string | null; onShow?: (id: string) => void; onUndo?: (e: Edit) => void }) {
  const who = mine ? 'Ti' : firstName(m.by);
  const dayRow = day && <li className="self-center text-[12px] text-muted-foreground">{day}</li>;
  if (m.kind === 'edit' && m.edit) {
    const { unit: u, what } = editText(m.edit, unit), unitEdit = m.edit.id !== 'room';
    return (<>{dayRow}
      <li className="flex items-center gap-2 text-[12.5px] text-ink-2">
        <span aria-hidden="true" className="size-2 flex-none rounded-[2px]" style={{ background: SIDE_COLOR[m.side] }} />
        <span className="flex-1 leading-[1.35]"><strong className="font-semibold">{who}</strong> · {u && `${u} — `}{what}<span className="ml-1 text-muted-2">· {clock(m.at)}</span></span>
        {unitEdit && (mine
          ? onUndo && <button type="button" onClick={() => onUndo(m.edit!)} className="min-h-[26px] cursor-pointer border-0 bg-transparent font-sans text-[12px] font-semibold text-primary">Poništi</button>
          : m.edit.after && onShow && <button type="button" onClick={() => onShow(m.edit!.id)} className="min-h-[26px] cursor-pointer border-0 bg-transparent font-sans text-[12px] font-semibold text-primary">Prikaži</button>)}
      </li>
    </>);
  }
  return (<>{dayRow}
    <li className={cn('flex max-w-[86%] flex-col gap-[3px]', mine ? 'items-end self-end' : 'self-start')}>
      <span className="text-[11.5px] text-muted-foreground">{who} · {clock(m.createdAt)}</span>
      <span className={cn('rounded-[10px] px-[11px] py-2 text-[14px] leading-[1.4] whitespace-pre-wrap', mine ? 'bg-accent-soft' : 'bg-background')}>{m.text}</span>
      {m.pin && <button type="button" onClick={() => onShow?.(m.pin!.split(' ')[0])} className="cursor-pointer border-0 bg-transparent p-0 font-sans text-[11.5px] text-accent-ink underline">Komentar na: {m.pin}</button>}
    </li>
  </>);
}
