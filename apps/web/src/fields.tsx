// Shared form fields: length input (mm/cm at the UI edge) and the element construction fields.
import { DOOR_KINDS, hingeOf, hingePatch, type Element, type Hinge, type Unit } from 'engine';

const HINGES: [Hinge, string][] = [['L', 'Levo'], ['R', 'Desno'], ['LR', '2 krila'], ['none', 'Bez']];
import { useEffect, useId, useState } from 'react';
import { Tip, type HelpKey } from './help';
import { SegmentedControl } from './ui';
import { fmt, parseLength } from './labels';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';

// Tailwind classes (docs/UI_KOMPONENTE.md); the input look is the Prostor panel's, other screens pass their own via inputClass.
export const FIELD = 'flex flex-col gap-1 text-[13px] text-muted-foreground';
export const FIELD_INPUT = 'h-auto min-w-0 border-border px-2.5 py-[9px] font-mono text-[18px] placeholder:text-[#757575]';

export function LenField({ label, value, unit, onCommit, placeholder, tip, primary, className, inputClass }: {
  label: string; value: number | undefined; unit: Unit; onCommit: (mm: number) => void; placeholder?: string; tip?: HelpKey; primary?: boolean; className?: string; inputClass?: string;
}) {
  const id = useId();
  const shown = value === undefined ? '' : fmt(value, unit);
  const [text, setText] = useState(shown);
  useEffect(() => setText(shown), [shown]);
  const commit = () => { const v = parseLength(text, unit); if (v !== null && v !== value) onCommit(v); else setText(shown); };
  return (
    <div className={cn(FIELD, className)}>
      <span className="inline-flex items-center"><label htmlFor={id}>{label}</label>{tip && <Tip k={tip} />}</span>
      <Input id={id} type="text" inputMode="decimal" className={cn(FIELD_INPUT, primary && 'border-primary', inputClass)} value={text} placeholder={placeholder} onChange={e => setText(e.target.value)}
        onBlur={commit} onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} />
    </div>
  );
}

/** Door opening side (design/Main.dc.html): Levo / Desno / 2 krila / Bez; tall units only L/R. */
export function HingeField({ el, onChange }: { el: Element; onChange: (p: Partial<Element>) => void }) {
  if (!DOOR_KINDS.includes(el.kind)) return null;
  return (
    <div className={FIELD} role="group" aria-label="Strana otvaranja">
      <span className="inline-flex items-center">Otvaranje (gledano spreda)<Tip k="editor.hinge" align="left" /></span>
      <SegmentedControl className="grid grid-cols-4 gap-1"
        itemClass="min-h-9 rounded-md border border-solid border-border bg-white font-sans text-[12px] text-foreground data-[state=on]:border-primary data-[state=on]:bg-accent-soft data-[state=on]:font-semibold data-[state=on]:text-accent-ink" value={hingeOf(el)} onChange={h => onChange(hingePatch(el, h))}
        options={HINGES.filter(([h]) => el.kind !== 'tall' || h === 'L' || h === 'R')} />
    </div>
  );
}

/** Optional own name of an element; the label (D2) and kind stay, the name is added after them. */
export function NameField({ el, onChange, inputClass }: { el: Element; onChange: (p: Partial<Element>) => void; inputClass?: string }) {
  return (
    <label className={FIELD}>Naziv (opciono)
      <Input key={el.id} type="text" className={cn(FIELD_INPUT, inputClass)} defaultValue={el.name ?? ''} placeholder="npr. Kod prozora" maxLength={40}
        onBlur={e => { const name = e.target.value.trim() || undefined; if (name !== el.name) onChange({ name }); }}
        onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }} />
    </label>
  );
}
