// Help system (docs/UI_PRAVILA.md): one on/off switch for all screens, "i" marks with explanations from i18n/sr.json.
// shortcut: the choice lives in localStorage ('kroj.help'); move to the user profile with accounts (MVP 8).
import { useState, useSyncExternalStore } from 'react';
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

/** "i" mark: explanation on hover or keyboard focus; hidden when help is off.
 * The popup is `position: fixed` at the mark, so scrolling panels (overflow) cannot clip it; it stays inside the viewport. */
export function Tip({ k, align }: { k: HelpKey; align?: 'left' | 'right' | 'up' }) {
  const [on] = useHelp();
  const [pos, setPos] = useState<{ x: number; y: number; up: boolean } | null>(null);
  if (!on) return null;
  const t = texts[k];
  const show = (el: HTMLElement) => {
    const r = el.getBoundingClientRect(), half = 130; // half of max popup width + margin
    const up = align === 'up' || r.bottom > window.innerHeight - 160;
    setPos({ x: Math.min(Math.max(r.left + r.width / 2, half), window.innerWidth - half), y: up ? r.top - 8 : r.bottom + 8, up });
  };
  return (
    <button type="button" className="k-tip" aria-label={t} onClick={e => e.preventDefault()}
      onMouseEnter={e => show(e.currentTarget)} onFocus={e => show(e.currentTarget)} onMouseLeave={() => setPos(null)} onBlur={() => setPos(null)}>
      <span aria-hidden="true">i</span>
      {pos && <span className="k-pop" aria-hidden="true" style={{ left: pos.x, top: pos.y, transform: `translate(-50%, ${pos.up ? '-100%' : '0'})` }}>{t}</span>}
    </button>
  );
}
