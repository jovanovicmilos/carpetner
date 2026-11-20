// Admin → Podrazumevane mere (design/screens/Standardi.html): dimension source, values with EN 1116 limits, checks, help defaults.
import { checkLimit, PRESETS, STANDARD_LIMITS } from 'engine';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { AdminLayout } from './AdminLayout';
import { Tip } from './help';
import { num } from './labels';
import { useWorkshop, type PresetId } from './workshop';

const SOURCES: [PresetId, string, string][] = [
  ['en1116', 'EN 1116:2018', 'Evropski standard za koordinacione mere kuhinjskog nameštaja i aparata.'],
  ['iso3055', 'ISO 3055:2021', 'Međunarodni standard za iste mere (visina, širina, dubina, niše za aparate).'],
  ['workshop', 'Mere moje radionice', 'Tvoje uobičajene mere — iz poslednjeg projekta ili ručno.'],
  ['none', 'Bez podrazumevanih', 'Forme ostaju prazne; svaka mera se unosi ručno.'],
];

const CARD = 'flex flex-col gap-2 rounded-xl border border-solid border-border bg-white p-[18px]';
const H2 = 'm-0 text-[16px]';
const ROW = 'flex min-h-10 cursor-pointer items-center text-[14px]';
const TH = 'border-0 bg-transparent px-2 py-3.5 text-[13px] font-medium text-muted-foreground';
const TD = 'border-0 border-t border-solid border-line-soft p-2 align-middle';

export function StandardsPage() {
  const w = useWorkshop();
  const fixed = w.preset === 'en1116' || w.preset === 'iso3055';
  const dims = w.preset === 'none' ? null : w.preset === 'workshop' ? w.own : PRESETS[w.preset];
  const check = (on: boolean, set: (v: boolean) => void, text: string) => (
    <label className={cn(ROW, 'gap-2.5')}><Checkbox checked={on} onCheckedChange={v => set(v === true)} />{text}</label>
  );
  return (
    <AdminLayout nav="short">
      <div>
        <h1 className="m-0 text-[28px]">Podrazumevane mere<Tip k="standards.title" align="right" /></h1>
        <p className="mt-1 mb-0 max-w-[760px] text-[15px] text-muted-foreground">Šta se upisuje u formu kada se doda novi element. Izabrani izvor važi za celu radionicu; svaki projekat ga može promeniti.</p>
      </div>
      <section aria-labelledby="st-src">
        <div id="st-src" className="mb-2.5 text-[14px] font-semibold">Izvor mera<Tip k="standards.source" align="right" /></div>
        <RadioGroup value={w.preset} onValueChange={v => w.set({ preset: v as PresetId })} aria-labelledby="st-src"
          className="grid grid-cols-[repeat(auto-fit,minmax(230px,1fr))] gap-3">
          {SOURCES.map(([id, t, d]) => (
            <label key={id} className={cn('flex cursor-pointer flex-col gap-1.5 rounded-xl border border-solid border-border bg-white p-3.5', w.preset === id && 'border-2 border-primary')}>
              <span className="flex items-center gap-2.5"><RadioGroupItem value={id} /><strong className="text-[15px]">{t}</strong></span>
              <span className="text-[13px] leading-[1.45] text-muted-foreground">{d}</span>
            </label>
          ))}
        </RadioGroup>
      </section>
      <section aria-label="Vrednosti" className="overflow-x-auto rounded-xl border border-solid border-border bg-white px-5 pt-2 pb-5">
        <Table className="min-w-[720px] text-[14px]">
          <TableHeader><TableRow>
            <TableHead className={cn(TH, 'pl-0')}>Mera</TableHead><TableHead className={cn(TH, 'text-right')}>Podrazumevano (mm)</TableHead>
            <TableHead className={TH}>Granica iz EN 1116</TableHead><TableHead className={cn(TH, 'pr-0')}>Provera</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {STANDARD_LIMITS.map(l => {
              const v = dims ? dims[l.key] : null, c = checkLimit(l.key, v);
              return (
                <TableRow key={l.key}>
                  <TableCell className={cn(TD, 'pl-0')}>{l.label}</TableCell>
                  <TableCell className={cn(TD, 'text-right')}><Input type="text" inputMode="numeric" aria-label={l.label} value={v ?? ''} placeholder="—" readOnly={fixed || !dims}
                    className={cn('h-auto w-[128px] border-border px-2 py-[7px] text-right font-mono text-[14px]', fixed && 'bg-background')} onChange={e => w.set({ own: { ...w.own, [l.key]: num(e.target.value) } })} /></TableCell>
                  <TableCell className={cn(TD, 'font-mono text-[13px] text-ink-2')}>{l.text}</TableCell>
                  <TableCell className={cn(TD, 'pr-0 text-[13px]', c === 'ok' ? 'text-ok' : c === 'out' ? 'text-warn-ink' : 'text-muted-foreground')}>{c === 'ok' ? 'u granicama' : c === 'out' ? 'van standarda' : '—'}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </section>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-4">
        <section className={CARD}>
          <h2 className={H2}>Kontrola po standardu<Tip k="standards.check" align="right" /></h2>
          {check(w.warnOutside, v => w.set({ warnOutside: v }), 'Upozori kada mera izađe iz granica EN 1116')}
          {check(w.checkEmpty, v => w.set({ checkEmpty: v }), 'Proveravaj i kad su forme prazne')}
          <p className="m-0 text-[13px] leading-normal text-muted-foreground">Upozorenje nikad ne blokira unos — stolar radi po meri prostora.</p>
        </section>
        <section className="block rounded-xl bg-accent-soft p-[18px] text-[14px] leading-normal text-accent-ink">
          <h2 className={cn(H2, 'mb-1.5 text-accent-ink')}>Napomena</h2>
          Granice su sažetak EN 1116:2018. Pre objavljivanja aplikacije vrednosti treba potvrditi iz zvaničnog teksta standarda (EN 1116 i ISO 3055 se kupuju).
        </section>
      </div>
      <section aria-label="Pomoć u aplikaciji" className={CARD}>
        <h2 className={H2}>Pomoć i objašnjenja<Tip k="standards.help" align="right" /></h2>
        <div>
          <div id="st-help" className="mb-1.5 text-[13px] text-muted-foreground">Podrazumevano za radionicu</div>
          <RadioGroup value={w.help} onValueChange={v => w.set({ help: v as typeof w.help })} aria-labelledby="st-help" className="flex flex-wrap gap-x-5 gap-y-2">
            {([['all', 'Uključena za sve'], ['new', 'Samo za nove korisnike (prvih 14 dana)'], ['off', 'Isključena']] as const).map(([id, t]) => (
              <label key={id} className={cn(ROW, 'gap-2')}><RadioGroupItem value={id} />{t}</label>
            ))}
          </RadioGroup>
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          {check(w.hoverCard, v => w.set({ hoverCard: v }), 'Kartica sa podacima na planu')}
          {check(w.legend, v => w.set({ legend: v }), 'Legenda simbola')}
          {check(w.ownNotes, v => w.set({ ownNotes: v }), 'Vlastite napomene radionice u objašnjenjima')}
        </div>
      </section>
    </AdminLayout>
  );
}
