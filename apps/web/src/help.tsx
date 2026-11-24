// Help system (docs/UI_PRAVILA.md): one on/off switch for all screens, "i" marks with explanations from i18n/sr.json.
// shortcut: the choice lives in localStorage ('kroj.help'); move to the user profile with accounts (MVP 8).
import { useId, useSyncExternalStore } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import texts from './i18n/sr.json';
import { Button } from '@/components/ui/button';
import { BRAND } from './brand';

const KEY = 'kroj.help';
const listeners = new Set<() => void>();
const read = () => { try { return localStorage.getItem(KEY) !== 'off'; } catch { return true; } };

export function useHelp(): [boolean, () => void] {
  const on = useSyncExternalStore(cb => { listeners.add(cb); return () => listeners.delete(cb); }, read, () => true);
  const toggle = () => { try { localStorage.setItem(KEY, on ? 'off' : 'on'); } catch { /* private mode: stays on */ } listeners.forEach(l => l()); };
  return [on, toggle];
}

export type HelpKey = keyof typeof texts;
export const helpText = (k: HelpKey) => texts[k].replaceAll('{ime}', BRAND.name);

// One explanation open at a time (user 2026-11-24): the open mark's id lives here, every Tip reads it.
let openTip: string | null = null, closeTimer: ReturnType<typeof setTimeout> | undefined;
const tipSubs = new Set<() => void>();
const setOpenTip = (id: string | null) => { clearTimeout(closeTimer); openTip = id; tipSubs.forEach(f => f()); };
const closeSoon = (id: string) => { clearTimeout(closeTimer); closeTimer = setTimeout(() => { if (openTip === id) setOpenTip(null); }, 150); };
const useOpenTip = () => useSyncExternalStore(f => { tipSubs.add(f); return () => { tipSubs.delete(f); }; }, () => openTip);

/** "i" mark (shadcn Popover, user 2026-11-24): with a mouse it opens on hover (and stays while the pointer is on the mark or
 * the text), on touch it opens on tap; opening one closes the other; Esc or a click outside closes. Hidden when help is off.
 * stopPropagation: the mark sits inside labels, table heads and tab rows, which must not react to it. `k-tip` = marker for old CSS. */
export function Tip({ k, align }: { k: HelpKey; align?: 'left' | 'right' | 'up' }) {
  const [on] = useHelp();
  const id = useId();
  const open = useOpenTip() === id;
  if (!on) return null;
  const t = helpText(k);
  const hover = { onPointerEnter: (e: React.PointerEvent) => { if (e.pointerType === 'mouse') setOpenTip(id); },
    onPointerLeave: (e: React.PointerEvent) => { if (e.pointerType === 'mouse') closeSoon(id); } };
  return (
    <Popover open={open} onOpenChange={o => setOpenTip(o ? id : openTip === id ? null : openTip)}>
      <PopoverTrigger asChild>
        <Button variant={null} size="none" aria-label="Objašnjenje" {...hover}
          // a mouse click keeps it open (hover already opened it); touch / keyboard toggle as usual
          onClick={e => { e.stopPropagation(); if ((e.nativeEvent as PointerEvent).pointerType === 'mouse') { e.preventDefault(); setOpenTip(id); } }}
          className="k-tip relative ml-1.5 inline-flex size-[18px] min-w-[18px] flex-none cursor-pointer items-center justify-center rounded-full border border-solid border-muted-2 bg-white p-0 align-middle font-sans text-[11px] leading-none font-semibold tracking-normal normal-case text-muted-foreground outline-none hover:border-foreground hover:bg-dark hover:text-white focus-visible:border-foreground focus-visible:bg-dark focus-visible:text-white data-[state=open]:border-foreground data-[state=open]:bg-dark data-[state=open]:text-white">
          <span aria-hidden="true">i</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent side={align === 'up' ? 'top' : 'bottom'} align={align === 'left' ? 'end' : align === 'right' ? 'start' : 'center'} sideOffset={8} collisionPadding={8}
        // no focus moves: returning focus to the previous mark would count as "outside" for the newly opened one and close it
        onOpenAutoFocus={e => e.preventDefault()} onCloseAutoFocus={e => e.preventDefault()} {...hover}
        className="text-sm leading-relaxed font-normal tracking-normal normal-case" onClick={e => e.stopPropagation()}>{t}</PopoverContent>
    </Popover>
  );
}
