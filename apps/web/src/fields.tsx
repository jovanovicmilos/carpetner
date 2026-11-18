// Shared form fields: length input (mm/cm at the UI edge) and the element construction fields.
import type { Element, Unit } from 'engine';
import { useEffect, useState } from 'react';
import { fmt, num, parseLength } from './labels';

export function LenField({ label, value, unit, onCommit, placeholder }: { label: string; value: number | undefined; unit: Unit; onCommit: (mm: number) => void; placeholder?: string }) {
  const shown = value === undefined ? '' : fmt(value, unit);
  const [text, setText] = useState(shown);
  useEffect(() => setText(shown), [shown]);
  const commit = () => { const v = parseLength(text, unit); if (v !== null && v !== value) onCommit(v); else setText(shown); };
  return (
    <label className="field">{label}
      <input type="text" inputMode="decimal" value={text} placeholder={placeholder} onChange={e => setText(e.target.value)}
        onBlur={commit} onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} />
    </label>
  );
}

/** Height, depth, legs/elevation, shelves, doors, drawer fronts. Used by the editor panel and the element page. */
export function ElementFields({ el, unit, onChange }: { el: Element; unit: Unit; onChange: (p: Partial<Element>) => void }) {
  const hasDoors = ['base', 'sink', 'corner-blind', 'wall'].includes(el.kind);
  const hasShelves = ['base', 'corner-blind', 'wall'].includes(el.kind);
  const hasDrawers = el.kind === 'drawer' || el.kind === 'oven';
  return (
    <>
      <div className="grid2">
        <LenField label="Visina korpusa" value={el.height} unit={unit} onCommit={v => onChange({ height: v })} />
        <LenField label="Dubina" value={el.depth} unit={unit} onCommit={v => onChange({ depth: v })} />
        {el.kind === 'wall'
          ? <LenField label="Od poda" value={el.elevation} unit={unit} onCommit={v => onChange({ elevation: v })} />
          : el.legs !== undefined && <LenField label="Nogice" value={el.legs} unit={unit} onCommit={v => onChange({ legs: v })} />}
        {hasShelves && (
          <label className="field">Police
            <input type="number" min={0} max={6} value={el.shelves ?? 0} onChange={e => onChange({ shelves: num(e.target.value) })} />
          </label>
        )}
      </div>
      {hasDoors && (
        <label className="field">Fronta
          <select value={el.doors ?? 0} onChange={e => onChange({ doors: Number(e.target.value) as 0 | 1 | 2 })}>
            <option value={1}>1 vrata</option><option value={2}>2 vrata</option><option value={0}>bez vrata</option>
          </select>
        </label>
      )}
      {hasDrawers && (
        <label className="field">Fronte fioka (mm, odvojeno zarezom)
          <input type="text" defaultValue={el.drawerFronts?.join(', ')}
            onBlur={e => onChange({ drawerFronts: e.target.value.split(',').map(num).filter(Boolean) })} />
        </label>
      )}
    </>
  );
}
