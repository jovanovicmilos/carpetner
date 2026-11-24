// Help system (docs/UI_PRAVILA.md): one on/off switch for all screens, "i" marks with explanations from i18n/sr.json.
// shortcut: the choice lives in localStorage ('kroj.help'); move to the user profile with accounts (MVP 8).
import { useSyncExternalStore } from 'react';
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

/** "i" mark (shadcn Popover, user 2026-11-24: easier to read than a tooltip): click / tap / Enter opens the explanation, it stays
 * while you read, Esc or a click outside closes it; hidden when help is off. Radix keeps it inside the viewport.
 * stopPropagation: the mark sits inside labels, table heads and tab rows, which must not react to it. `k-tip` = marker for old CSS. */
export function Tip({ k, align }: { k: HelpKey; align?: 'left' | 'right' | 'up' }) {
  const [on] = useHelp();
  if (!on) return null;
  const t = helpText(k);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant={null} size="none" aria-label="Objašnjenje" onClick={e => e.stopPropagation()}
          className="k-tip relative ml-1.5 inline-flex size-[18px] min-w-[18px] flex-none cursor-pointer items-center justify-center rounded-full border border-solid border-muted-2 bg-white p-0 align-middle font-sans text-[11px] leading-none font-semibold tracking-normal normal-case text-muted-foreground outline-none hover:border-foreground hover:bg-dark hover:text-white focus-visible:border-foreground focus-visible:bg-dark focus-visible:text-white data-[state=open]:border-foreground data-[state=open]:bg-dark data-[state=open]:text-white">
          <span aria-hidden="true">i</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent side={align === 'up' ? 'top' : 'bottom'} align={align === 'left' ? 'end' : align === 'right' ? 'start' : 'center'} sideOffset={8} collisionPadding={8}
        className="text-sm leading-relaxed font-normal tracking-normal normal-case" onClick={e => e.stopPropagation()}>{t}</PopoverContent>
    </Popover>
  );
}
