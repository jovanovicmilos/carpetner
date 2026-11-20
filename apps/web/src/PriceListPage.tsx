// Admin → Cenovnik (design/screens/Cenovnik.html): sheet prices, saw-shop services, hardware, labour, margin and VAT.
import { importPrices, type Material, type PriceList } from 'engine';
import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { AdminLayout } from './AdminLayout';
import { Tip } from './help';
import { num } from './labels';
import { usePrices, workshopMaterials, type PriceSettings } from './prices';
import { readSheetRows } from './sheetFile';

type Tab = 'sheets' | 'saw' | 'hw' | 'labour' | 'tax';
const TABS: [Tab, string][] = [['sheets', 'Ploče'], ['saw', 'Kant i usluge pilane'], ['hw', 'Okov i repro'], ['labour', 'Rad i montaža'], ['tax', 'Marža i PDV']];
const rsd = (p: number) => Math.round(p / 100).toLocaleString('sr-Latn');
const toPara = (t: string) => num(t) * 100;
// "Iverica 18 bela W980" → name "Iverica bela", code "W980".
const split = (name: string) => {
  const w = name.split(' ').filter(x => !/^\d+$/.test(x));
  const code = /^[A-Z]+\d+$/.test(w.at(-1) ?? '') ? w.pop()! : '—';
  return [w.join(' '), code];
};
const NUM_FIELDS: Record<Exclude<Tab, 'sheets' | 'tax'>, [keyof PriceList, string, string][]> = {
  saw: [['cuttingPerM', 'Sečenje', 'po m reza']],
  hw: [['hingeSet', 'Šarka sa usporivačem + pločica', 'po kompletu'], ['drawerKit', 'Fioka komplet 500 mm', 'po kompletu'], ['leg', 'Nogica 100 mm', 'po komadu'],
    ['plinthClip', 'Klipsa za soklu', 'po komadu'], ['handle', 'Ručka 128 mm', 'po komadu'], ['hanger', 'Vešaljka za gornji (par)', 'po paru'], ['shelfPin', 'Nosač faha', 'po komadu'],
    ['plinthPerM', 'Sokla', 'po m'], ['wallStripPerM', 'Zidna lajsna', 'po m'], ['fastenersLump', 'Tiplovi, konfirmati, šrafovi, klamerice', 'paušal'],
    ['worktopFittingsLump', 'Spojnice radne ploče, silikon', 'paušal'], ['sinkPad', 'Aluminijumska podloga za sudoperu', 'po komadu'],
    ['profilePerM', 'Alu profil na vrhu fronte', 'po m'], ['pusher', 'Potiskivač za krilo', 'po komadu'], ['liftKit', 'Mehanizam za kip krilo', 'po kompletu'],
    ['glassFrame', 'Alu ram sa staklom', 'po komadu']],
  labour: [['perElement', 'Izrada po elementu', 'po elementu'], ['installDay', 'Montaža kod kupca', 'po danu']],
};

const BOX = 'rounded-xl border border-solid border-border bg-white px-5 pt-2 pb-5';
const TABLE = 'w-full min-w-[820px] border-collapse text-[14px]';
const TH = 'border-0 bg-transparent px-2 py-3 text-left text-[13px] font-medium text-muted-foreground';
const TD = 'border-0 border-t border-solid border-line-soft p-2 align-middle';
const PRICE = 'h-auto w-[90px] border-border px-2 py-[7px] text-right font-mono text-[14px]';
const HBTN = 'min-h-11 px-3.5 py-2.5 text-[14px]';
const CARD = 'flex flex-col gap-2.5 rounded-xl border border-solid border-border bg-white p-[18px]';
const LABEL = 'flex flex-col gap-1 text-[13px] text-muted-foreground';
const NUM = 'h-auto border-border px-2.5 py-[9px] font-mono text-[15px]';
const FIELD = 'h-auto min-h-10 min-w-20 border-border p-2 text-[14px]';

export function PriceListPage() {
  const stored = usePrices();
  const [draft, setDraft] = useState<PriceSettings>({ prices: stored.prices, marginPct: stored.marginPct, vatPct: stored.vatPct, wastePct: stored.wastePct, rounding: stored.rounding, materials: stored.materials, suppliers: stored.suppliers });
  const [msg, setMsg] = useState<{ text: string; unknown: string[] } | null>(null);
  const [adding, setAdding] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<Tab>('sheets');
  const [saved, setSaved] = useState(false);
  const p = draft.prices;
  const setP = (patch: Partial<PriceList>) => { setSaved(false); setDraft({ ...draft, prices: { ...p, ...patch } }); };
  const mats = Object.values(workshopMaterials(draft)).sort((a, b) => (a.kind === 'hdf' ? 1 : 0) - (b.kind === 'hdf' ? 1 : 0) || b.thickness - a.thickness);
  /** Supplier price list (CSV / Excel) into the draft; saved only with "Sačuvaj izmene". */
  const importFile = async (f: File) => {
    try {
      const r = importPrices(await readSheetRows(f), workshopMaterials(draft));
      const supplier = f.name.replace(/\.[^.]+$/, '');
      const n = Object.keys(r.sheets).length + Object.keys(r.edgingPerM).length + Object.keys(r.items).filter(k => k !== 'delivery').length;
      const { delivery: _d, ...items } = r.items; // delivery belongs to a supplier (Poređenje), not to the workshop price list
      setSaved(false);
      setDraft({ ...draft, prices: { ...p, ...items, sheets: { ...p.sheets, ...r.sheets }, edgingPerM: { ...p.edgingPerM, ...r.edgingPerM } },
        suppliers: { ...draft.suppliers, ...Object.fromEntries(Object.keys(r.sheets).map(id => [id, supplier])) } });
      setMsg({ text: n ? `Uvezeno ${n} cena iz „${f.name}“. Proveri ih i klikni „Sačuvaj izmene“.` : `U „${f.name}“ nije prepoznata nijedna cena.`, unknown: r.unknown });
    } catch (e) {
      console.error(e);
      setMsg({ text: `„${f.name}“ nije moguće pročitati. Uvozi se Excel (.xlsx, .xls) ili CSV.`, unknown: [] });
    }
  };
  const priceInput = (label: string, value: number, on: (v: number) => void) => (
    <Input type="text" inputMode="numeric" aria-label={`Cena ${label}`} className={PRICE} value={rsd(value)} onChange={e => on(toPara(e.target.value))} />
  );

  return (
    <AdminLayout>
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <h1 className="m-0 text-[28px]">Cenovnik<Tip k="prices.title" align="right" /></h1>
          <p className="mt-1 mb-0 text-[15px] text-muted-foreground">Cene koje se koriste u svakom obračunu · RSD bez PDV-a · primer vrednosti</p>
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          <Button variant="outline" size="none" className={HBTN} onClick={() => fileRef.current?.click()}>Uvezi cenovnik dobavljača (Excel/CSV)</Button>
          <input ref={fileRef} type="file" hidden accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
            onChange={ev => { const f = ev.target.files?.[0]; ev.target.value = ''; if (f) importFile(f); }} />
          <Button size="none" className={HBTN} onClick={() => { stored.save(draft); setSaved(true); }}>{saved ? 'Sačuvano' : 'Sačuvaj izmene'}</Button>
        </div>
      </div>
      {msg && (
        <div role="status" className={cn('relative mb-3 flex flex-wrap items-start gap-x-3.5 gap-y-2 rounded-lg py-2.5 pr-11 pl-3.5 text-[14px]', msg.unknown.length ? 'bg-[#FBE3D3] text-accent-ink' : 'bg-ok-soft text-ok')}>
          <span className="flex-[1_1_300px]">{msg.text}</span>
          {msg.unknown.length > 0 && <details className="flex-[1_1_100%]"><summary>Nije prepoznato ({msg.unknown.length}) — unesi ručno ili dodaj materijal</summary><ul className="mt-1.5 mb-0 pl-5">{msg.unknown.map(u => <li key={u}>{u}</li>)}</ul></details>}
          <Button variant="ghost" size="none" aria-label="Zatvori" className="absolute top-1 right-1.5 min-h-8 min-w-8 text-[18px] leading-none text-inherit hover:bg-transparent" onClick={() => setMsg(null)}>×</Button>
        </div>
      )}
      <Tabs value={tab} onValueChange={v => setTab(v as typeof tab)}>
        <TabsList aria-label="Kategorije cena" className="flex flex-wrap gap-1 border-0 border-b border-solid border-border">
          {TABS.map(([t, l]) => <TabsTrigger key={t} value={t} className="min-h-11 border-0 border-b-[3px] border-solid border-transparent bg-transparent px-3.5 py-2.5 text-[14px] text-muted-foreground data-[state=active]:border-primary data-[state=active]:font-semibold data-[state=active]:text-foreground">{l}</TabsTrigger>)}
        </TabsList>
      </Tabs>
      {tab === 'sheets' && (
        <section aria-label="Cene ploča" className={BOX}>
          <div className="overflow-x-auto">
            <table className={TABLE}>
              <thead><tr><th className={cn(TH, 'pl-0')}>Materijal</th><th className={TH}>Šifra / dekor</th><th className={cn(TH, 'text-right')}>Deb.</th><th className={cn(TH, 'text-right')}>Format ploče</th><th className={TH}>Obračun</th><th className={cn(TH, 'text-right')}>Cena</th><th className={cn(TH, 'pr-0')}>Dobavljač</th></tr></thead>
              <tbody>
                {mats.map(m => {
                  const [name, code] = split(m.name);
                  return (
                    <tr key={m.id}>
                      <td className={cn(TD, 'pl-0')}>{name}</td><td className={cn(TD, 'font-mono')}>{code}</td><td className={cn(TD, 'text-right font-mono')}>{m.thickness}</td><td className={cn(TD, 'text-right font-mono')}>{m.sheet ? `${m.sheet.l}×${m.sheet.w}` : '—'}</td><td className={TD}>po ploči</td>
                      <td className={cn(TD, 'text-right')}>{priceInput(`${name} ${m.thickness}`, p.sheets[m.id] ?? 0, v => setP({ sheets: { ...p.sheets, [m.id]: v } }))}</td>
                      <td className={cn(TD, 'pr-0', !draft.suppliers?.[m.id] && 'text-muted-foreground')}>{draft.suppliers?.[m.id] ?? (draft.materials?.[m.id] ? '—' : '[DOBAVLJAČ 1]')}
                        {draft.materials?.[m.id] && <Button variant="ghost" size="none" className="ml-2 min-h-7 min-w-7 text-muted-foreground hover:bg-transparent" aria-label={`Ukloni ${m.name}`} onClick={() => {
                          const { [m.id]: _m, ...rest } = draft.materials!;
                          setSaved(false); setDraft({ ...draft, materials: rest });
                        }}>×</Button>}
                      </td>
                    </tr>
                  );
                })}
                {/* shortcut: lacquered MDF fronts have no material/price in the model yet (design row). */}
                <tr><td className={cn(TD, 'pl-0')}>MDF lakirani (fronta)</td><td className={cn(TD, 'font-mono')}>RAL po izboru</td><td className={cn(TD, 'text-right font-mono')}>18</td><td className={cn(TD, 'text-right font-mono')}>—</td><td className={TD}>po m²</td>
                  <td className={cn(TD, 'text-right')}><Input type="text" aria-label="Cena MDF" className={PRICE} value="[CENA]" readOnly /></td><td className={cn(TD, 'pr-0 text-muted-foreground')}>[LAKIRNICA]</td></tr>
                <tr><td className={cn(TD, 'pl-0')}>Radna ploča hrast</td><td className={cn(TD, 'font-mono')}>dekor</td><td className={cn(TD, 'text-right font-mono')}>38</td><td className={cn(TD, 'text-right font-mono')}>4100×600</td><td className={TD}>po komadu</td>
                  <td className={cn(TD, 'text-right')}>{priceInput('radna ploča', p.worktopPiece, v => setP({ worktopPiece: v }))}</td><td className={cn(TD, 'pr-0 text-muted-foreground')}>[DOBAVLJAČ 2]</td></tr>
              </tbody>
            </table>
          </div>
          {adding
            ? <AddMaterial taken={workshopMaterials(draft)} onCancel={() => setAdding(false)} onAdd={(m, price) => {
              setSaved(false); setAdding(false);
              setDraft({ ...draft, materials: { ...draft.materials, [m.id]: m }, prices: { ...p, sheets: { ...p.sheets, [m.id]: price } } });
            }} />
            : <Button variant="outline" size="none" className="mt-3 min-h-10 border-dashed border-muted-foreground px-3 py-2 text-[14px] font-normal" onClick={() => setAdding(true)}>+ Dodaj materijal</Button>}
        </section>
      )}
      {(tab === 'saw' || tab === 'hw' || tab === 'labour') && (
        <section aria-label={TABS.find(t => t[0] === tab)![1]} className={BOX}>
          <div className="overflow-x-auto">
            <table className={TABLE}>
              <thead><tr><th className={cn(TH, 'pl-0')}>Stavka</th><th className={TH}>Obračun</th><th className={cn(TH, 'text-right')}>Cena</th></tr></thead>
              <tbody>
                {tab === 'saw' && Object.entries(p.edgingPerM).map(([t, v]) => (
                  <tr key={t}><td className={cn(TD, 'pl-0')}>Kantovanje {t === '0.8' ? '' : 'ABS '}{t.replace('.', ',')} mm (sa kantom)</td><td className={TD}>po m</td>
                    <td className={cn(TD, 'text-right')}>{priceInput(`kant ${t}`, v, nv => setP({ edgingPerM: { ...p.edgingPerM, [t]: nv } }))}</td></tr>
                ))}
                {NUM_FIELDS[tab].map(([k, l, u]) => (
                  <tr key={k}><td className={cn(TD, 'pl-0')}>{l}</td><td className={TD}>{u}</td><td className={cn(TD, 'text-right')}>{priceInput(l, p[k] as number, v => setP({ [k]: v } as Partial<PriceList>))}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-4">
        <section className={CARD}>
          <h2 className="m-0 text-[16px]">Pravila obračuna ploča<Tip k="prices.waste" align="right" /></h2>
          <label className={LABEL}>Dodatak na otpad (%)<Input className={NUM} type="text" inputMode="numeric" value={draft.wastePct} onChange={e => setDraft({ ...draft, wastePct: num(e.target.value) })} /></label>
          <label className={LABEL}>Zaokruživanje
            <Select value={draft.rounding} onValueChange={v => setDraft({ ...draft, rounding: v as PriceSettings['rounding'] })}>
              <SelectTrigger aria-label="Zaokruživanje" className="h-auto min-h-10 w-full py-[9px] text-foreground"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="sheet">Na celu ploču</SelectItem><SelectItem value="half">Na pola ploče</SelectItem><SelectItem value="m2">Po m² (bez zaokruživanja)</SelectItem></SelectContent>
            </Select>
          </label>
        </section>
        <section className={CARD}>
          <h2 className="m-0 text-[16px]">Marža i porez<Tip k="prices.tax" align="right" /></h2>
          <label className={LABEL}>Podrazumevana marža (%)<Input className={NUM} type="text" inputMode="numeric" value={draft.marginPct} onChange={e => setDraft({ ...draft, marginPct: num(e.target.value) })} /></label>
          <label className={LABEL}>PDV (%)<Input className={NUM} type="text" inputMode="numeric" value={draft.vatPct} onChange={e => setDraft({ ...draft, vatPct: num(e.target.value) })} /></label>
        </section>
        <section className="block rounded-xl bg-accent-soft p-[18px] text-[14px] leading-normal text-accent-ink">
          <h2 className="mt-0 mb-1.5 text-[16px] text-accent-ink">Kada se cena promeni</h2>
          Otvorene ponude se ne menjaju same — pri otvaranju projekta app pokazuje razliku i nudi „Preračunaj po novim cenama".
        </section>
      </div>
    </AdminLayout>
  );
}

const KINDS: [Material['kind'], string][] = [['chipboard', 'Iverica'], ['mdf', 'MDF'], ['hdf', 'HDF']];
/** "+ Dodaj materijal": name with decor code, kind, thickness, sheet size, grain, price per sheet. */
function AddMaterial({ taken, onAdd, onCancel }: { taken: Record<string, Material>; onAdd: (m: Material, price: number) => void; onCancel: () => void }) {
  const [f, setF] = useState({ name: '', kind: 'chipboard' as Material['kind'], thickness: '18', l: '2800', w: '2070', grain: false, price: '' });
  const t = num(f.thickness), l = num(f.l), w = num(f.w), price = toPara(f.price);
  const id = `own-${f.name.toLowerCase().normalize('NFD').replace(/[^\w]+/g, '-').replace(/^-|-$/g, '')}-${t}`;
  const err = !f.name.trim() ? 'Upiši naziv (sa šifrom dekora, npr. „Iverica 18 hrast H1145“).'
    : t <= 0 || l <= 0 || w <= 0 ? 'Debljina i format ploče moraju biti veći od 0.'
    : taken[id] ? 'Materijal sa tim nazivom i debljinom već postoji.' : null;
  return (
    <form className="mt-3 flex flex-wrap items-end gap-x-3 gap-y-2.5 rounded-lg border border-dashed border-muted-foreground p-3" aria-label="Novi materijal" onSubmit={e => {
      e.preventDefault();
      if (!err) onAdd({ id, name: f.name.trim(), kind: f.kind, thickness: t, sheet: { l, w }, grain: f.grain }, price);
    }}>
      <label className={cn(LABEL, 'flex-[1_1_240px]')}>Naziv<Input className={FIELD} value={f.name} placeholder="Iverica 18 hrast H1145" onChange={e => setF({ ...f, name: e.target.value })} /></label>
      <label className={LABEL}>Vrsta
        <Select value={f.kind} onValueChange={v => setF({ ...f, kind: v as Material['kind'] })}>
          <SelectTrigger aria-label="Vrsta" className="min-w-20"><SelectValue /></SelectTrigger>
          <SelectContent>{KINDS.map(([k, n]) => <SelectItem key={k} value={k}>{n}</SelectItem>)}</SelectContent>
        </Select></label>
      <label className={LABEL}>Debljina (mm)<Input className={FIELD} inputMode="numeric" value={f.thickness} onChange={e => setF({ ...f, thickness: e.target.value })} /></label>
      <label className={LABEL}>Format (mm)<span className="flex items-center gap-1"><Input className={cn(FIELD, 'w-20')} inputMode="numeric" aria-label="Dužina ploče" value={f.l} onChange={e => setF({ ...f, l: e.target.value })} />×<Input className={cn(FIELD, 'w-20')} inputMode="numeric" aria-label="Širina ploče" value={f.w} onChange={e => setF({ ...f, w: e.target.value })} /></span></label>
      <label className={LABEL}>Cena po ploči<Input className={FIELD} inputMode="numeric" value={f.price} placeholder="0" onChange={e => setF({ ...f, price: e.target.value })} /></label>
      <label className="flex min-h-10 cursor-pointer items-center gap-1.5 text-[13px] text-foreground"><Checkbox checked={f.grain} onCheckedChange={v => setF({ ...f, grain: v === true })} />Dekor sa šarom</label>
      {err && f.name && <p className="m-0 flex-[1_1_100%] text-[13px] text-[#A3261F]" role="alert">{err}</p>}
      <div className="flex gap-2"><Button type="submit" size="none" className="min-h-10 px-3.5 text-[14px]" disabled={!!err}>Dodaj</Button><Button variant="outline" size="none" className="min-h-10 px-3.5 text-[14px] font-normal" onClick={onCancel}>Otkaži</Button></div>
    </form>
  );
}
