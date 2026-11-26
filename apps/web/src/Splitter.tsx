// Draggable divider between two columns (user 2026-11-26: Element page, Konfigurator left and right). Drag, ← / → step,
// double click = default; the size is kept in this browser (per-viewer convenience). Hidden under 900 px, where columns stack.
import { useState } from 'react';

/** A size clamped to [min, max], remembered in localStorage under `key`. */
export function useStoredSize(key: string, def: number, min: number, max: number) {
  const clamp = (v: number) => Math.min(max, Math.max(min, v));
  const [size, setState] = useState(() => { try { return clamp(Number(localStorage.getItem(key)) || def); } catch { return def; } });
  const set = (v: number) => { const c = clamp(v); setState(c); try { localStorage.setItem(key, String(Math.round(c))); } catch { /* private mode */ } };
  return [size, set, { min, max, def }] as const;
}

/**
 * `toSize(clientX)` turns the pointer position into the new size; `step` is what one arrow key press adds (→ positive).
 */
export function Splitter({ label, size, set, range, toSize, step }: {
  label: string; size: number; set: (v: number) => void; range: { min: number; max: number; def: number };
  toSize: (clientX: number) => number; step: number;
}) {
  return (
    <div role="separator" aria-orientation="vertical" aria-label={label} aria-valuemin={range.min} aria-valuemax={range.max} aria-valuenow={Math.round(size)} tabIndex={0}
      className="group relative z-10 -mx-1.5 w-3 flex-none cursor-col-resize touch-none outline-none max-[900px]:hidden print:hidden"
      onPointerDown={e => e.currentTarget.setPointerCapture(e.pointerId)}
      onPointerMove={e => { if (e.currentTarget.hasPointerCapture(e.pointerId)) set(toSize(e.clientX)); }}
      onDoubleClick={() => set(range.def)}
      onKeyDown={e => { if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); set(size + (e.key === 'ArrowRight' ? step : -step)); } }}>
      <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-border transition-colors group-hover:w-[3px] group-hover:bg-primary/50 group-focus-visible:w-[3px] group-focus-visible:bg-primary" />
    </div>
  );
}
