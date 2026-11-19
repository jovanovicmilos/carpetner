// Shared form fields: length input (mm/cm at the UI edge) and the element construction fields.
import { DOOR_KINDS, hingeOf, hingePatch, type Element, type Hinge, type Unit } from 'engine';

const HINGES: [Hinge, string][] = [['L', 'Levo'], ['R', 'Desno'], ['LR', '2 krila'], ['none', 'Bez']];
import { useEffect, useId, useState } from 'react';
import { Tip, type HelpKey } from './help';
import { SegmentedControl } from './ui';
import { fmt, num, parseLength } from './labels';

export function LenField({ label, value, unit, onCommit, placeholder, tip, primary }: {
  label: string; value: number | undefined; unit: Unit; onCommit: (mm: number) => void; placeholder?: string; tip?: HelpKey; primary?: boolean;
}) {
  const id = useId();
  const shown = value === undefined ? '' : fmt(value, unit);
  const [text, setText] = useState(shown);
  useEffect(() => setText(shown), [shown]);
  const commit = () => { const v = parseLength(text, unit); if (v !== null && v !== value) onCommit(v); else setText(shown); };
  return (
    <div className={primary ? 'field primary' : 'field'}>
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
          <label className="field">Fahovi
            <input type="number" min={0} max={6} value={el.shelves ?? 0} onChange={e => onChange({ shelves: num(e.target.value) })} />
          </label>
        )}
      </div>
      <HingeField el={el} onChange={onChange} />
      {hasDrawers && (
        <label className="field">Fronte fioka (mm, odvojeno zarezom)
          <input type="text" defaultValue={el.drawerFronts?.join(', ')}
            onBlur={e => onChange({ drawerFronts: e.target.value.split(',').map(num).filter(Boolean) })} />
        </label>
      )}
    </>
  );
}

/** Door opening side (design/Main.dc.html): Levo / Desno / 2 krila / Bez; tall units only L/R. */
export function HingeField({ el, onChange }: { el: Element; onChange: (p: Partial<Element>) => void }) {
  if (!DOOR_KINDS.includes(el.kind)) return null;
  return (
    <div className="field" role="group" aria-label="Strana otvaranja">
      <span className="field-label">Otvaranje (gledano spreda)<Tip k="editor.hinge" align="left" /></span>
      <SegmentedControl className="hinge-row" itemClass="hinge-btn" value={hingeOf(el)} onChange={h => onChange(hingePatch(el, h))}
        options={HINGES.filter(([h]) => el.kind !== 'tall' || h === 'L' || h === 'R')} />
    </div>
  );
}

/** Optional own name of an element; the label (D2) and kind stay, the name is added after them. */
export function NameField({ el, onChange }: { el: Element; onChange: (p: Partial<Element>) => void }) {
  return (
    <label className="field">Naziv (opciono)
      <input key={el.id} type="text" defaultValue={el.name ?? ''} placeholder="npr. Kod prozora" maxLength={40}
        onBlur={e => { const name = e.target.value.trim() || undefined; if (name !== el.name) onChange({ name }); }}
        onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }} />
    </label>
  );
}
