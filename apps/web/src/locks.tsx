// Workshop plan and the locked-feature pattern (design/screens/Pretplata.html, bottom: "Zaključana opcija").
// Code asks `useCan(feature)` (engine billing.ts), never plan names. Never a dead button: a locked control says what is locked,
// in which plan, and the cheapest way to unlock it; data stays visible (blurred) where possible.
// shortcut: grants live in this browser and "Aktiviraj" switches the plan locally without payment; real grants come from the
// accounts backend + billing provider (MVP 8).
import { useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { can, entitlements, workshopSignup, type Feature, type Grant } from 'engine';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

/** Placeholder until prices are decided (the design shows [CENA] too). */
export const PRICE = '[CENA]';
export const today = () => new Date().toISOString().slice(0, 10);

export type PlanId = 'start' | 'pro' | 'premium';
export const usePlan = create<{ grants: Grant[]; setPlan: (p: PlanId) => void; addAddon: (id: string) => void; removeAddon: (id: string) => void }>()(persist(
  set => ({
    grants: workshopSignup(today()),
    // Keeps add-ons, replaces the plan (Start is always there as the base).
    setPlan: p => set(s => ({ grants: [{ product: 'start', from: today() }, ...(p === 'start' ? [] : [{ product: p, from: today() }]),
      ...s.grants.filter(g => g.product.startsWith('addon.'))] })),
    addAddon: id => set(s => ({ grants: [...s.grants, { product: id, from: today() }] })),
    removeAddon: id => set(s => ({ grants: s.grants.filter(g => g.product !== id) })),
  }),
  { name: 'kroj-plan' },
));

export const useCan = (f: Feature) => can(entitlements(usePlan(s => s.grants), today()), f);

/** What each locked feature says (title on the card / dialog, short text, tooltip on a locked button). */
const LOCKS: Partial<Record<Feature, { title: string; text: string; tip: string; addon?: string }>> = {
  cutlist: { title: 'Krojna lista je u paketu Pro', text: 'Delovi, kant i okov se računaju i dalje — vidiš ih kad aktiviraš Pro. Projekat, 2D i 3D rade i u Startu.',
    tip: 'Krojna lista i izvoz za pilanu su u paketu Pro.' },
  pilana: { title: 'Poređenje pilana je u paketu Pro', text: 'Cene pilana, najbolja kombinacija i porudžbina pilani rade u paketu Pro. Projekat, 2D i 3D rade i u Startu.',
    tip: 'Poređenje pilana i porudžbina su u paketu Pro.' },
  'drawings.export': { title: 'Izvoz nacrta je u paketu Pro', text: 'Nacrti ostaju na ekranu i u Startu. PDF, DXF, SVG, GLB i OBJ se preuzimaju u paketu Pro.',
    tip: 'Izvoz nacrta je u paketu Pro. Klik otvara kratko objašnjenje i dugme „Aktiviraj Pro“.' },
  'quote.image': { title: 'Slika za ponudu je u paketu Pro', text: 'Foto-kvalitetna slika na prvoj strani ponude je u paketu Pro. Snimak PNG radi i u Startu.',
    tip: '„Slika za ponudu“ je u paketu Pro.' },
  'quote.full': { title: 'Puna ponuda je u paketu Pro', text: 'U Startu ponuda prikazuje samo ukupnu cenu sa Kroj oznakom. Stavke, logo i uslovi su u paketu Pro.',
    tip: 'Ponuda sa stavkama je u paketu Pro. U Startu kupac vidi samo ukupnu cenu.' },
  'export.cnc': { title: 'CNC izvoz je dodatak', text: `CNC izvoz po delu je dodatak uz bilo koji paket — ${PRICE} mesečno.`,
    tip: `CNC izvoz je dodatak uz bilo koji paket — ${PRICE} mesečno.`, addon: 'addon.cnc' },
};

function Lock({ size = 14, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true" className={className}>
      <rect x="4" y="9" width="12" height="9" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M7 9V6.5a3 3 0 0 1 6 0V9" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

/** The card: what is locked, why, and the one button that unlocks it. */
function LockBody({ feature, onDone }: { feature: Feature; onDone?: () => void }) {
  const l = LOCKS[feature]!;
  const { setPlan, addAddon } = usePlan();
  return (
    <>
      <div className="flex items-center gap-2 text-accent-ink"><Lock size={20} /><strong className="text-[16px] text-foreground">{l.title}</strong></div>
      <p className="m-0 text-[14px] leading-[1.45] text-ink-2">{l.text}</p>
      <Button size="none" className="min-h-11 rounded-lg text-[15px] font-semibold"
        onClick={() => { if (l.addon) addAddon(l.addon); else setPlan('pro'); onDone?.(); }}>
        {l.addon ? `Dodaj — ${PRICE} / mes.` : `Aktiviraj Pro — ${PRICE} / mes.`}
      </Button>
      <Link to="/pretplata" className="inline-flex min-h-7 items-center justify-center text-[14px]">Uporedi pakete</Link>
    </>
  );
}

/** Locked section: the content blurred underneath, the card on top. Unlocked: just the content (`className` = the layout the
 *  children need from their wrapper, used only while locked). */
export function Locked({ feature, children, className }: { feature: Feature; children: ReactNode; className?: string }) {
  if (useCan(feature)) return <>{children}</>;
  return (
    <div className="relative min-h-[300px] overflow-hidden">
      <div aria-hidden="true" inert className={cn('pointer-events-none opacity-55 blur-[3px] select-none', className)}>{children}</div>
      <div role="region" aria-label={`Zaključano: ${LOCKS[feature]!.title}`}
        className="absolute top-[min(50%,240px)] left-1/2 box-border flex w-[min(380px,90%)] -translate-1/2 flex-col gap-2.5 rounded-xl border border-solid border-border bg-white p-[18px] shadow-[0_8px_30px_rgba(28,27,25,0.14)]">
        <LockBody feature={feature} />
      </div>
    </div>
  );
}

/** Gate for actions that are not a single button (e.g. the Nacrti export tiles): `allow(f)` runs the action when unlocked,
 *  otherwise opens the explanation; render `dialog` once. */
export function useGate() {
  const [asked, setAsked] = useState<Feature | null>(null);
  const e = entitlements(usePlan(s => s.grants), today());
  const allow = (f: Feature) => { if (can(e, f)) return true; setAsked(f); return false; };
  const l = asked && LOCKS[asked]!;
  const dialog = (
    <Dialog open={!!asked} onOpenChange={o => { if (!o) setAsked(null); }}>
      {l && <DialogContent className="flex w-[min(380px,calc(100%-32px))] flex-col gap-2.5 rounded-xl p-[18px]">
        <DialogTitle className="sr-only">{l.title}</DialogTitle>
        <DialogDescription className="sr-only">{l.tip}</DialogDescription>
        <LockBody feature={asked} onDone={() => setAsked(null)} />
      </DialogContent>}
    </Dialog>
  );
  return { allow, locked: (f: Feature) => !can(e, f), dialog };
}

/** "Pro" / "Dodatak" chip next to a locked control. */
export function LockBadge({ feature }: { feature: Feature }) {
  const add = !!LOCKS[feature]?.addon;
  return <span className={cn('rounded-lg px-1.5 py-px text-[11px] font-semibold', add ? 'bg-wood-birch text-wood-bark' : 'bg-accent-soft text-accent-ink')}>{add ? 'Dodatak' : 'Pro'}</span>;
}

/** A toolbar button: unlocked it is `children`; locked it shows the padlock + "Pro" / "Dodatak" chip, and a click explains. */
export function LockedButton({ feature, label, children }: { feature: Feature; label: ReactNode; children: ReactNode }) {
  const { allow, locked, dialog } = useGate();
  if (!locked(feature)) return <>{children}</>;
  return (
    <>
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <Button variant="outline" onClick={() => allow(feature)} className="bg-background text-ink-2">
            <Lock />{label}<LockBadge feature={feature} />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" sideOffset={8}>{LOCKS[feature]!.tip}</TooltipContent>
      </Tooltip>
      {dialog}
    </>
  );
}
