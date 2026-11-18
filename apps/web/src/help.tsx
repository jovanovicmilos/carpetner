// Help system (docs/UI_PRAVILA.md): one on/off switch for all screens, "i" marks with explanations from i18n/sr.json.
// shortcut: the choice lives in localStorage ('kroj.help'); move to the user profile with accounts (MVP 8).
import { useSyncExternalStore } from 'react';
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

/** "i" mark: explanation on hover or keyboard focus; hidden when help is off. `align` keeps the popup inside panels. */
export function Tip({ k, align }: { k: HelpKey; align?: 'left' | 'right' | 'up' }) {
  const [on] = useHelp();
  if (!on) return null;
  const t = texts[k];
  return (
    <button type="button" className={`k-tip${align ? ` k-${align}` : ''}`} aria-label={t} onClick={e => e.preventDefault()}>
      <span aria-hidden="true">i</span><span className="k-pop" aria-hidden="true">{t}</span>
    </button>
  );
}
