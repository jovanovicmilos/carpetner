// Shared form fields: length input (mm/cm at the UI edge) and the element construction fields.
import { DOOR_KINDS, hingeOf, hingePatch, type Element, type Hinge, type Unit } from 'engine';

const HINGES: [Hinge, string][] = [['L', 'Levo'], ['R', 'Desno'], ['LR', '2 krila'], ['none', 'Bez']];
import { useEffect, useId, useState } from 'react';
import { Tip, type HelpKey } from './help';
import { fmt, num, parseLength } from './labels';

export function LenField({ label, value, unit, onCommit, placeholder, tip }: {
  label: string; value: number | undefined; unit: Unit; onCommit: (mm: number) => void; placeholder?: string; tip?: HelpKey;
}) {
  const id = useId();
  const shown = value === undefined ? '' : fmt(value, unit);
  const [text, setText] = useState(shown);
  useEffect(() => setText(shown), [shown]);
  const commit = () => { const v = parseLength(text, unit); if (v !== null && v !== value) onCommit(v); else setText(shown); };
  return (
    <div className="field">
      <span className="field-label"><label htmlFor={id}>{label}</label>{tip && <Tip k={tip} />}</span>
      <input id={id} type="text" inputMode="decimal" value={text} placeholder={placeholder} onChange={e => setText(e.target.value)}
        onBlur={commit} onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} />
    </div>
  );
}

/** Height, depth, legs/elevation, shelves, door opening side, drawer fronts. Used by the editor panel and the element page. */
export function ElementFields({ el, unit, onChange }: { el: Element; unit: Unit; onChange: (p: Partial<Element>) => void }) {
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
      {DOOR_KINDS.includes(el.kind) && (
        <div className="field" role="group" aria-label="Otvaranje">
          <span className="field-label">Otvaranje (gledano spreda)<Tip k="editor.hinge" /></span>
          <div className="hinge-row">
            {HINGES.filter(([h]) => el.kind !== 'tall' || h === 'L' || h === 'R').map(([h, text]) => (
              <button key={h} type="button" className="chip-btn" aria-pressed={hingeOf(el) === h} onClick={() => onChange(hingePatch(el, h))}>{text}</button>
            ))}
          </div>
        </div>
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
