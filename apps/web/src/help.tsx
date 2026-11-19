// Help system (docs/UI_PRAVILA.md): one on/off switch for all screens, "i" marks with explanations from i18n/sr.json.
// shortcut: the choice lives in localStorage ('kroj.help'); move to the user profile with accounts (MVP 8).
import { useSyncExternalStore } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import texts from './i18n/sr.json';

const KEY = 'kroj.help';
const listeners = new Set<() => void>();
const read = () => { try { return localStorage.getItem(KEY) !== 'off'; } catch { return true; } };

export function useHelp(): [boolean, () => void] {
  const on = useSyncExternalStore(cb => { listeners.add(cb); return () => listeners.delete(cb); }, read, () => true);
  const toggle = () => { try { localStorage.setItem(KEY, on ? 'off' : 'on'); } catch { /* private mode: stays on */ } listeners.forEach(l => l()); };
  return [on, toggle];
}

export type HelpKey = keyof typeof texts;
export const helpText = (k: HelpKey) => texts[k];

/** "i" mark (shadcn Tooltip): explanation on hover or keyboard focus; hidden when help is off. Radix puts it in a portal and
 * keeps it inside the viewport, so scrolling panels cannot clip it. `k-tip` stays as a marker for old CSS (.zoom-ctl). */
export function Tip({ k, align }: { k: HelpKey; align?: 'left' | 'right' | 'up' }) {
  const [on] = useHelp();
  if (!on) return null;
  const t = texts[k];
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button type="button" aria-label={t} onClick={e => e.preventDefault()}
          className="k-tip relative ml-1.5 inline-flex size-[18px] min-w-[18px] flex-none cursor-help items-center justify-center rounded-full border border-solid border-muted-2 bg-white p-0 align-middle font-sans text-[11px] leading-none font-semibold tracking-normal normal-case text-muted-foreground outline-none hover:border-foreground hover:bg-foreground hover:text-white focus-visible:border-foreground focus-visible:bg-foreground focus-visible:text-white">
          <span aria-hidden="true">i</span>
        </button>
      </TooltipTrigger>
      <TooltipContent side={align === 'up' ? 'top' : 'bottom'} sideOffset={8} collisionPadding={8} aria-hidden="true">{t}</TooltipContent>
    </Tooltip>
  );
}
