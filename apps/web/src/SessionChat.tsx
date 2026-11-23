// Messages of the shared session right on the Prostor drawing (the same request thread Saradnja shows), for both roles.
// Closed: the request list is polled for the unread count (opening the thread would mark it read). Open: the thread is
// polled every 5 s. `pin` = the unit the message is about (the selected one).
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { usePoll, type Partner } from './partner';
import { api, useSession } from './session';

type Msg = { id: string; side: 'shop' | 'cust'; text: string; pin?: string };

export function SessionChat({ partner, pin }: { partner: Partner; pin?: string }) {
  const shopId = useSession(s => (s.session?.user.kind !== 'customer' ? s.workshops[0]?.id : undefined));
  const [open, setOpen] = useState(false);
  const [t, setT] = useState<{ side: 'shop' | 'cust'; messages: Msg[] } | null>(null);
  const [unread, setUnread] = useState(0);
  const [draft, setDraft] = useState('');
  const loadThread = () => api<{ side: 'shop' | 'cust'; messages: Msg[] }>('GET', `/requests/${partner.requestId}/thread`).then(x => { setT(x); setUnread(0); });
  const loadUnread = () => api<{ id: string; unread?: number }[]>('GET', shopId ? `/organizations/${shopId}/requests` : '/me/requests')
    .then(l => setUnread(l.find(r => r.id === partner.requestId)?.unread ?? 0));
  useEffect(() => { void (open ? loadThread() : loadUnread()).catch(() => {}); }, [open, partner.requestId]); // eslint-disable-line react-hooks/exhaustive-deps
  usePoll(open ? loadThread : loadUnread, true, open ? 5000 : 10000);
  const send = () => {
    const text = draft.trim();
    if (!text) return;
    setDraft('');
    void api('POST', `/requests/${partner.requestId}/messages`, { text, pin }).then(loadThread).catch(() => setDraft(text));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant={null} size="none" aria-label={`Poruke sa: ${partner.name}${unread ? ` (${unread} nove)` : ''}`} title={`Poruke sa: ${partner.name}`}
          className="h-[46px] gap-2 rounded-[10px] border border-solid border-[#A9D6BA] bg-accent-soft pr-3.5 pl-3 text-[13px] font-semibold text-accent-ink shadow-[0_4px_14px_rgba(28,27,25,0.10)]">
          Poruke
          {unread > 0 && <span className="rounded-full bg-primary px-1.5 text-[12px] text-white">{unread}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={6} className="flex w-[340px] flex-col gap-2.5 p-3">
        <div className="text-[13px] text-muted-foreground">Oboje menjate ovu kuhinju; izmene se vide za nekoliko sekundi.</div>
        <ol aria-label="Poruke" className="m-0 flex max-h-[300px] list-none flex-col gap-2 overflow-y-auto p-0">
          {t && !t.messages.length && <li className="text-[13.5px] text-muted-foreground">Još nema poruka.</li>}
          {t?.messages.map(m => {
            const me = m.side === t.side;
            return (
              <li key={m.id} className={cn('flex max-w-[88%] flex-col gap-0.5', me ? 'items-end self-end' : 'self-start')}>
                <span className={cn('rounded-[10px] px-2.5 py-1.5 text-[13.5px] leading-[1.4] whitespace-pre-wrap', me ? 'bg-accent-soft' : 'bg-background')}>{m.text}</span>
                {m.pin && <span className="text-[11.5px] text-accent-ink">Komentar na: {m.pin}</span>}
              </li>
            );
          })}
        </ol>
        <form onSubmit={e => { e.preventDefault(); send(); }} className="flex flex-col gap-1.5">
          <Textarea rows={2} value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            aria-label={`Poruka za ${partner.name}`} placeholder={pin ? `Komentar na ${pin}` : 'Napiši poruku'} className="min-h-0 resize-none p-2 text-[13.5px]" />
          <div className="flex items-center gap-2">
            <Link to={`/saradnja/${partner.requestId}`} className="text-[13px]">Saradnja i ponuda</Link>
            <Button type="submit" size="none" disabled={!draft.trim()} className="ml-auto min-h-9 rounded-md px-3.5 text-[13px] font-semibold">Pošalji</Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}
