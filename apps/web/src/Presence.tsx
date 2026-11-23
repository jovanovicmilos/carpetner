// Presence chip of the shared session (design SesijaStanja §1): customer header (dark) and the workshop's project bar (light).
// Green = the other side is here now, grey = away (last seen), orange = this side lost the connection. Click: who, since when,
// which screen, and the way to the messages.
import { Link, useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { ago, clock, firstName, initials, isHere, SIDE_COLOR, useLive, useLiveSession } from './live';
import type { Partner } from './partner';

export function Avatar({ name, side, size = 22, className }: { name: string; side: 'shop' | 'cust'; size?: number; className?: string }) {
  return <span aria-hidden="true" className={cn('inline-flex flex-none items-center justify-center rounded-full font-bold text-white', className)}
    style={{ width: size, height: size, background: SIDE_COLOR[side], fontSize: Math.round(size * 0.42) }}>{initials(name)}</span>;
}

/** `customer` = the viewer is the customer (the other side is the workshop). No partner: the customer sees "Nije poslato stolaru". */
export function PresenceChip({ partner, customer, dark = false, compact = false }: { partner: Partner | null; customer: boolean; dark?: boolean; compact?: boolean }) {
  useLiveSession(partner?.requestId);
  const t = useLive(s => (partner && s.requestId === partner.requestId ? s.thread : undefined));
  const offline = useLive(s => s.offline);
  const navigate = useNavigate();
  const chip = cn('inline-flex min-h-[34px] cursor-pointer items-center gap-2 rounded-[17px] border border-solid pr-3 pl-2 font-sans text-[13px] font-semibold whitespace-nowrap no-underline',
    dark ? 'border-dark-line bg-[#26352C] text-background hover:text-background' : 'border-border bg-white text-foreground hover:text-foreground');
  if (!partner) {
    if (!customer) return null;
    return <Link to="/kupac/posalji" className={chip} title="Kuhinja još nije kod stolara. Pošalji je u koraku Stolar.">
      <span aria-hidden="true" className="size-2 rounded-full bg-muted-2" />{compact ? 'Nije poslato' : 'Nije poslato stolaru'}</Link>;
  }
  const other = customer ? 'shop' : 'cust';
  const here = t?.here, live = isHere(here);
  const who = here?.name || partner.name, short = firstName(who);
  const text = offline ? 'Povezujem se…' : compact ? (live ? 'Uživo' : 'Nije tu')
    : live ? (customer ? `Uživo · ${short} (${partner.name})` : `Uživo · ${short} · od ${clock(here!.since)}`)
    : `${short} nije tu${here ? ` · ${ago(here.at)}` : ''}`;
  const dot = offline ? 'bg-[#E2804D]' : live ? 'bg-[#3FB06A]' : 'bg-muted-2';
  const where = customer ? '/kupac/prostor' : '/projekat';
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant={null} size="none" className={chip} aria-label={`Zajednička sesija: ${text}. Detalji i poruke.`}>
          <span aria-hidden="true" className={cn('size-2 rounded-full', dot)} />
          <Avatar name={who} side={other} className={cn(!live && 'opacity-60')} /><span className="max-w-[240px] truncate">{text}</span>
          {!!t?.unread && <span className="min-w-5 rounded-[10px] bg-primary px-1.5 text-[12px] text-white">{t.unread}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={6} className="flex w-[300px] flex-col gap-3 p-4">
        <div className="flex items-center gap-2.5">
          <Avatar name={who} side={other} size={36} />
          <div className="min-w-0 leading-[1.35]">
            <strong className="block truncate text-[14.5px]">{who}{customer && here ? ` · ${partner.name}` : ''}</strong>
            <span className="text-[13px] text-muted-foreground">
              {offline ? 'Veza je prekinuta, povezujem se…' : live ? `U kuhinji od ${clock(here!.since)}${here!.screen ? ` · gleda ${here!.screen}` : ''}` : here ? `Nije tu · poslednji put ${ago(here.at)}` : 'Još nije bilo posete kuhinji'}
            </span>
          </div>
        </div>
        <p className="m-0 text-[13px] leading-[1.45] text-ink-2">Oboje menjate istu kuhinju; izmene druge strane stižu za nekoliko sekundi i vide se na planu.</p>
        <div className="flex items-center gap-2">
          <Button size="none" className="min-h-9 rounded-md px-3.5 text-[13px] font-semibold" onClick={() => { useLive.setState({ tab: 'msg' }); navigate(where); }}>
            Poruke{t?.unread ? ` (${t.unread})` : ''}</Button>
          <Link to={`/saradnja/${partner.requestId}`} className="ml-auto text-[13px] font-semibold">Saradnja i ponuda →</Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
