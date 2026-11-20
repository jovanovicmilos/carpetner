// Quick start screen (design/screens/BrziStart.html): four questions → auto-laid-out kitchen (docs/BRZI_START.md).
import {
  autoLayout, DEFAULT_ELEMENT_MATERIALS, DEFAULT_MATERIALS, DEFAULT_RULES, PRESETS,
  quickStartRoom, type Element, type Project, type QuickStartInput, type Shape,
} from 'engine';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { ALERT, APP_FIXED, SegmentedControl } from './ui';
import { Header } from './Header';
import { Tip } from './help';
import { num } from './labels';
import { useProject } from './store';
import { useWorkshop } from './workshop';
import { newProjectId } from './projects';

const SHAPES: { id: Shape; label: string }[] = [
  { id: 'I', label: 'Ravna' }, { id: 'L', label: 'Ugaona (L)' }, { id: 'U', label: 'U oblik' },
];
// shortcut: "last project" uses the workshop preset until projects and workshop settings are stored (Supabase step).
const PRESET_OPTIONS = [
  { id: 'last', preset: 'workshop', label: 'Kao u poslednjem projektu (bela + siva U708)' },
  { id: 'workshop', preset: 'workshop', label: 'Šablon radionice: Standard' },
  { id: 'en1116', preset: 'en1116', label: 'EN 1116 podrazumevano' },
] as const;
// Preview per the design: names and colours of the boxes and chips.
const NAME: Record<Element['kind'], string> = {
  'corner-blind': 'ugaoni', base: 'donji', drawer: 'fiokar', sink: 'sudopera', 'appliance-front': 'MSP', oven: 'rerna', filler: 'filer', tall: 'frižider', wall: 'gornji',
};
const FILL: Partial<Record<Element['kind'], string>> = { sink: '#C9DAF2', oven: '#3A3936', filler: '#D6CDBC', tall: '#C9BEA9' };


const SECTION = 'flex flex-col gap-2.5';
const FIELD = 'flex flex-col gap-1 text-[13px] text-muted-foreground';
const INPUT = 'h-auto p-2.5 font-mono text-[18px]';
const CHIP = 'rounded-md border border-solid border-border bg-background px-2.5 py-1.5 font-mono text-[13px]';

export function QuickStart() {
  const navigate = useNavigate();
  const setProject = useProject(s => s.setProject);
  const [shape, setShape] = useState<Shape>('L');
  const [f, setF] = useState({ a: '3200', b: '2400', c: '2000', water: '1500', p400: '900', winFrom: '1100', winW: '1000' });
  const [opts, setOpts] = useState({ dishwasher: true, fridge: true, wallUnits: true });
  const walls = shape === 'I' ? ['A'] : shape === 'L' ? ['A', 'B'] : ['A', 'B', 'C'];
  const [source, setSource] = useState<(typeof PRESET_OPTIONS)[number]['id']>('last');
  const presetId = PRESET_OPTIONS.find(o => o.id === source)!.preset;

  const input: QuickStartInput = {
    shape, a: num(f.a), b: num(f.b), c: num(f.c), water: num(f.water), power400: num(f.p400),
    window: num(f.winW) ? { offset: num(f.winFrom), width: num(f.winW) } : undefined, ...opts,
  };
  const layout = autoLayout(input, PRESETS[presetId], DEFAULT_ELEMENT_MATERIALS);
  const project: Project = {
    id: 'quick-start', name: 'Brzi start', unit: 'mm', presetId,
    room: quickStartRoom(input), elements: layout.elements, rules: DEFAULT_RULES, materials: DEFAULT_MATERIALS,
    opening: { kind: useWorkshop.getState().opening },
  };
  const open = (path: string) => {
    setProject({ ...project, id: newProjectId(), name: `Kuhinja ${shape === 'I' ? 'ravna' : shape === 'L' ? 'ugaona (L)' : 'U'}` });
    navigate(path);
  };
  const floor = layout.elements.filter(e => e.kind !== 'wall');
  const uppers = layout.elements.filter(e => e.kind === 'wall');
  const talls = floor.filter(e => e.kind === 'tall');
  const lowers = floor.filter(e => e.kind !== 'tall' && e.kind !== 'filler');
  const { a, b, c } = input as Required<Pick<QuickStartInput, 'a' | 'b' | 'c'>>;
  const bRun = Math.max(0, (opts.fridge ? b - 600 : b) - 600);
  const worktop = shape === 'I' ? `${a}` : shape === 'L' ? `${a} + ${bRun}` : `${a} + ${bRun} + ${c - 600}`;

  // Preview room per the design: plan in pixels, walls measured from the corner with A (wall B is stored flipped).
  const H = shape === 'I' ? 600 : Math.max(b, shape === 'U' ? c : 0);
  const k = a > 0 ? Math.min(560 / a, 340 / Math.max(H, 600)) : 0.1;
  const px = (v: number) => Math.round(v * k), D = px(600);
  const box = (e: Element) => {
    const x = e.wallId === 'B' ? H - e.offset - e.width : e.offset;
    return e.wallId === 'A' ? { left: px(x), top: 0, width: px(e.width), height: D }
      : { left: e.wallId === 'B' ? 0 : px(a) - D, top: px(x), width: D, height: px(e.width) };
  };
  const mark = (left: number, top: number, bg: string, fg: string, t: string) => (
    <div key={t} className="absolute box-border flex size-[18px] items-center justify-center rounded-full border border-solid border-white font-mono text-[10px] font-bold" style={{ left: left - 9, top: top - 9, background: bg, color: fg }}>{t}</div>
  );

  const field = (key: keyof typeof f, label: React.ReactNode, placeholder?: string) => (
    <label className={FIELD}>
      {label}
      <Input className={INPUT} type="text" inputMode="numeric" value={f[key]} placeholder={placeholder}
        onChange={e => setF({ ...f, [key]: e.target.value })} />
    </label>
  );
  const check = (key: keyof typeof opts, label: string) => (
    <label className="flex min-h-10 cursor-pointer items-center gap-2 text-[14px]">
      <Checkbox className="size-5" checked={opts[key]} onCheckedChange={v => setOpts({ ...opts, [key]: v === true })} />
      {label}
    </label>
  );
  const h2 = (n: number, text: React.ReactNode) => <h2 className="m-0 text-[15px]"><span className="font-mono text-primary">{n}</span> {text}</h2>;
  const ACT = 'min-h-[52px] flex-[1_1_220px] text-[16px]';

  return (
    <div className={APP_FIXED}>
      <Header kind="new" />

      <div className="flex min-h-0 flex-1 flex-nowrap overflow-hidden">
        <main className="flex min-w-0 flex-[0_0_440px] flex-col gap-[22px] overflow-y-auto border-0 border-r border-solid border-border bg-white p-6">
          <div>
            <h1 className="m-0 text-[26px]">Kuhinja za 2 minuta</h1>
            <p className="mt-1 mb-0 text-[15px] text-muted-foreground">Četiri pitanja — Kroj složi elemente po pravilima radionice. Sve posle možeš da menjaš.</p>
          </div>

          <section className={SECTION}>
            {h2(1, <>Oblik<Tip k="quick.shape" /></>)}
            <SegmentedControl label="Oblik kuhinje" className="grid grid-cols-3 gap-2.5" value={shape} onChange={setShape}
              itemClass="flex min-h-[84px] flex-col items-center gap-2 rounded-lg border border-solid border-border bg-white px-2 py-3 text-[14px] text-foreground data-[state=on]:border-2 data-[state=on]:border-primary data-[state=on]:bg-accent-soft data-[state=on]:font-semibold"
              options={SHAPES.map(s => [s.id, <>
                <span className={cn('block h-8 w-11 border-0 border-t-[6px] border-solid border-foreground', s.id !== 'I' && 'border-l-[6px]', s.id === 'U' && 'border-r-[6px]')} />
                <span>{s.label}</span></>] as const)} />
          </section>

          <section className={SECTION}>
            {h2(2, <>Dužine zidova (mm)<Tip k="quick.walls" /></>)}
            <div className="grid grid-cols-3 gap-2.5">
              {field('a', 'Zid A')}
              {shape !== 'I' && field('b', 'Zid B')}
              {shape === 'U' && field('c', 'Zid C')}
            </div>
          </section>

          <section className={SECTION}>
            {h2(3, <>Gde su voda i struja (mm od ugla)<Tip k="quick.install" /></>)}
            <div className="grid grid-cols-2 gap-2.5">
              {field('water', <span><span className="mr-1.5 inline-block size-2.5 rounded-full bg-water" />Voda i odvod · zid A</span>)}
              {field('p400', <span><span className="mr-1.5 inline-block size-2.5 rounded-full border border-solid border-foreground bg-power" />Trofazna (rerna/ploča) · {shape === 'I' ? 'zid A' : 'zid B'}</span>)}
              {field('winFrom', 'Prozor na zidu A · od ugla', 'nema')}
              {field('winW', 'Širina prozora', 'nema')}
            </div>
          </section>

          <section className={SECTION}>
            {h2(4, <>Šta ide u kuhinju<Tip k="quick.options" /></>)}
            {check('dishwasher', 'Ugradna mašina za sudove')}
            {check('fridge', 'Visoki element za ugradni frižider')}
            {check('wallUnits', 'Gornji elementi (zaobilaze prozor)')}
            <label className={FIELD}>
              Materijali i mere
              <Select value={source} onValueChange={v => setSource(v as typeof source)}>
                <SelectTrigger aria-label="Materijali i mere" className="h-auto w-full border-line-strong p-2.5 text-[15px]"><SelectValue /></SelectTrigger>
                <SelectContent>{PRESET_OPTIONS.map(o => <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>)}</SelectContent>
              </Select>
            </label>
          </section>

        </main>

        <section aria-label="Rezultat" className="flex min-h-0 min-w-0 flex-[999_1_560px] flex-col gap-4 overflow-y-auto p-6">
          <div className="flex flex-wrap items-baseline gap-3">
            <h2 className="m-0 text-[20px]">Složeno automatski<Tip k="quick.preview" /></h2>
            {!layout.error && <span className="text-[14px] text-muted-foreground">{lowers.length} donjih · {uppers.length} gornjih · {talls.length} visoki · radna ploča {worktop} mm</span>}
          </div>

          {layout.error && <div className={ALERT} role="alert">{layout.error}</div>}
          <div className="box-border flex min-h-[360px] items-start justify-center rounded-xl border border-solid border-border bg-white bg-[size:20px_20px] p-7 [background-image:linear-gradient(var(--line-soft)_1px,transparent_1px),linear-gradient(90deg,var(--line-soft)_1px,transparent_1px)]">
            {!layout.error && (
              <div className={cn('relative mt-2.5 border-0 border-t-[6px] border-solid border-foreground', shape !== 'I' && 'border-l-[6px]', shape === 'U' && 'border-r-[6px]')} style={{ width: px(a), height: shape === 'I' ? D + 20 : px(H) }}>
                {floor.map(e => {
                  const st = box(e);
                  return (
                    <div key={e.id} title={`${e.label} · ${NAME[e.kind]} ${e.width}`} className="absolute box-border flex items-center justify-center border border-solid border-foreground font-mono text-[11px]"
                      style={{ ...st, background: FILL[e.kind] ?? '#E7E1D5', color: e.kind === 'oven' ? '#FFFFFF' : '#1C1B19' }}>
                      {st.width >= 26 && st.height >= 18 ? e.label : ''}
                    </div>
                  );
                })}
                {/* shortcut: the design marks the three-phase outlet with a yellow S here (T in the plan). */}
                {!!input.water && mark(px(input.water), -6, '#1E50C8', '#FFFFFF', 'V')}
                {!!input.power400 && (shape === 'I' ? mark(px(input.power400), -6, '#F2B630', '#1C1B19', 'S') : mark(-6, px(input.power400), '#F2B630', '#1C1B19', 'S'))}
                {input.window && <div className="absolute -top-[9px] h-1.5 border border-solid border-foreground bg-el-sink" style={{ left: px(input.window.offset), width: px(input.window.width) }} />}
              </div>
            )}
          </div>
          {layout.warnings.map(w => <div key={w} className={ALERT}>{w}</div>)}

          {!layout.error && (
            <div className="flex flex-wrap gap-2 rounded-xl border border-solid border-border bg-white px-4 py-3.5">
              {floor.map(e => <span key={e.id} className={cn(CHIP, e.kind === 'sink' && 'bg-[#E3EBF7]')}>{e.label} {NAME[e.kind]} {e.width}</span>)}
              {uppers.length > 0 && <span className={cn(CHIP, 'border-dashed border-muted-foreground bg-white')}>{uppers.length} gornjih ({uppers.map(u => u.width).join(', ')})</span>}
            </div>
          )}

          <div className="flex flex-wrap gap-2.5">
            <Button size="none" className={ACT} disabled={!!layout.error} onClick={() => open('/projekat')}>Napravi projekat i doteraj</Button>
            <Button variant="dark" size="none" className={cn(ACT, 'bg-transparent')} disabled={!!layout.error} onClick={() => open('/krojna-lista')}>Odmah krojna lista</Button>
            <Button variant="dark" size="none" className={cn(ACT, 'bg-transparent')} disabled={!!layout.error} onClick={() => open('/ponuda')}>Odmah cena za kupca</Button>
          </div>
        </section>
      </div>
    </div>
  );
}
