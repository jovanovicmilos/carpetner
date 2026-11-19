// Admin → Cenovnik (design/screens/Cenovnik.html): sheet prices, saw-shop services, hardware, labour, margin and VAT.
import { importPrices, type Material, type PriceList } from 'engine';
import { useRef, useState } from 'react';
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
    <input type="text" inputMode="numeric" aria-label={`Cena ${label}`} className="pl-price" value={rsd(value)} onChange={e => on(toPara(e.target.value))} />
  );

  return (
    <AdminLayout>
      <div className="pl-head">
        <div>
          <h1>Cenovnik<Tip k="prices.title" align="right" /></h1>
          <p>Cene koje se koriste u svakom obračunu · RSD bez PDV-a · primer vrednosti</p>
        </div>
        <div className="pl-actions">
          <button type="button" onClick={() => fileRef.current?.click()}>Uvezi cenovnik dobavljača (Excel/CSV)</button>
          <input ref={fileRef} type="file" hidden accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
            onChange={ev => { const f = ev.target.files?.[0]; ev.target.value = ''; if (f) importFile(f); }} />
          <button type="button" className="accent" onClick={() => { stored.save(draft); setSaved(true); }}>{saved ? 'Sačuvano' : 'Sačuvaj izmene'}</button>
        </div>
      </div>
      {msg && (
        <div className={msg.unknown.length ? 'pl-msg warn' : 'pl-msg'} role="status">
          <span>{msg.text}</span>
          {msg.unknown.length > 0 && <details><summary>Nije prepoznato ({msg.unknown.length}) — unesi ručno ili dodaj materijal</summary><ul>{msg.unknown.map(u => <li key={u}>{u}</li>)}</ul></details>}
          <button type="button" aria-label="Zatvori" onClick={() => setMsg(null)}>×</button>
        </div>
      )}
      <div role="tablist" aria-label="Kategorije cena" className="pl-tabs">
        {TABS.map(([t, l]) => <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)}>{l}</button>)}
      </div>
      {tab === 'sheets' && (
        <section aria-label="Cene ploča" className="pl-box">
          <div className="pl-scroll">
            <table>
              <thead><tr><th className="f">Materijal</th><th>Šifra / dekor</th><th className="r">Deb.</th><th className="r">Format ploče</th><th>Obračun</th><th className="r">Cena</th><th className="l">Dobavljač</th></tr></thead>
              <tbody>
                {mats.map(m => {
                  const [name, code] = split(m.name);
                  return (
                    <tr key={m.id}>
                      <td className="f">{name}</td><td className="m">{code}</td><td className="r m">{m.thickness}</td><td className="r m">{m.sheet ? `${m.sheet.l}×${m.sheet.w}` : '—'}</td><td>po ploči</td>
                      <td className="r">{priceInput(`${name} ${m.thickness}`, p.sheets[m.id] ?? 0, v => setP({ sheets: { ...p.sheets, [m.id]: v } }))}</td>
                      <td className={draft.suppliers?.[m.id] ? 'l' : 'l muted'}>{draft.suppliers?.[m.id] ?? (draft.materials?.[m.id] ? '—' : '[DOBAVLJAČ 1]')}
                        {draft.materials?.[m.id] && <button type="button" className="pl-del" aria-label={`Ukloni ${m.name}`} onClick={() => {
                          const { [m.id]: _m, ...rest } = draft.materials!;
                          setSaved(false); setDraft({ ...draft, materials: rest });
                        }}>×</button>}
                      </td>
                    </tr>
                  );
                })}
                {/* shortcut: lacquered MDF fronts have no material/price in the model yet (design row). */}
                <tr><td className="f">MDF lakirani (fronta)</td><td className="m">RAL po izboru</td><td className="r m">18</td><td className="r m">—</td><td>po m²</td>
                  <td className="r"><input type="text" aria-label="Cena MDF" className="pl-price" value="[CENA]" readOnly /></td><td className="l muted">[LAKIRNICA]</td></tr>
                <tr><td className="f">Radna ploča hrast</td><td className="m">dekor</td><td className="r m">38</td><td className="r m">4100×600</td><td>po komadu</td>
                  <td className="r">{priceInput('radna ploča', p.worktopPiece, v => setP({ worktopPiece: v }))}</td><td className="l muted">[DOBAVLJAČ 2]</td></tr>
              </tbody>
            </table>
          </div>
          {adding
            ? <AddMaterial taken={workshopMaterials(draft)} onCancel={() => setAdding(false)} onAdd={(m, price) => {
              setSaved(false); setAdding(false);
              setDraft({ ...draft, materials: { ...draft.materials, [m.id]: m }, prices: { ...p, sheets: { ...p.sheets, [m.id]: price } } });
            }} />
            : <button type="button" className="pl-add" onClick={() => setAdding(true)}>+ Dodaj materijal</button>}
        </section>
      )}
      {(tab === 'saw' || tab === 'hw' || tab === 'labour') && (
        <section aria-label={TABS.find(t => t[0] === tab)![1]} className="pl-box">
          <div className="pl-scroll">
            <table>
              <thead><tr><th className="f">Stavka</th><th>Obračun</th><th className="r">Cena</th></tr></thead>
              <tbody>
                {tab === 'saw' && Object.entries(p.edgingPerM).map(([t, v]) => (
                  <tr key={t}><td className="f">Kantovanje ABS {t.replace('.', ',')} mm (sa kantom)</td><td>po m</td>
                    <td className="r">{priceInput(`kant ${t}`, v, nv => setP({ edgingPerM: { ...p.edgingPerM, [t]: nv } }))}</td></tr>
                ))}
                {NUM_FIELDS[tab].map(([k, l, u]) => (
                  <tr key={k}><td className="f">{l}</td><td>{u}</td><td className="r">{priceInput(l, p[k] as number, v => setP({ [k]: v } as Partial<PriceList>))}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
      <div className="pl-cards">
        <section className="pl-card">
          <h2>Pravila obračuna ploča<Tip k="prices.waste" align="right" /></h2>
          <label>Dodatak na otpad (%)<input type="text" inputMode="numeric" value={draft.wastePct} onChange={e => setDraft({ ...draft, wastePct: num(e.target.value) })} /></label>
          <label>Zaokruživanje
            <select value={draft.rounding} onChange={e => setDraft({ ...draft, rounding: e.target.value as PriceSettings['rounding'] })}>
              <option value="sheet">Na celu ploču</option><option value="half">Na pola ploče</option><option value="m2">Po m² (bez zaokruživanja)</option>
            </select>
          </label>
        </section>
        <section className="pl-card">
          <h2>Marža i porez<Tip k="prices.tax" align="right" /></h2>
          <label>Podrazumevana marža (%)<input type="text" inputMode="numeric" value={draft.marginPct} onChange={e => setDraft({ ...draft, marginPct: num(e.target.value) })} /></label>
          <label>PDV (%)<input type="text" inputMode="numeric" value={draft.vatPct} onChange={e => setDraft({ ...draft, vatPct: num(e.target.value) })} /></label>
        </section>
        <section className="pl-card warn">
          <h2>Kada se cena promeni</h2>
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
    <form className="pl-addform" aria-label="Novi materijal" onSubmit={e => {
      e.preventDefault();
      if (!err) onAdd({ id, name: f.name.trim(), kind: f.kind, thickness: t, sheet: { l, w }, grain: f.grain }, price);
    }}>
      <label className="wide">Naziv<input value={f.name} placeholder="Iverica 18 hrast H1145" onChange={e => setF({ ...f, name: e.target.value })} /></label>
      <label>Vrsta<select value={f.kind} onChange={e => setF({ ...f, kind: e.target.value as Material['kind'] })}>{KINDS.map(([k, n]) => <option key={k} value={k}>{n}</option>)}</select></label>
      <label>Debljina (mm)<input inputMode="numeric" value={f.thickness} onChange={e => setF({ ...f, thickness: e.target.value })} /></label>
      <label>Format (mm)<span className="pl-fmt"><input inputMode="numeric" aria-label="Dužina ploče" value={f.l} onChange={e => setF({ ...f, l: e.target.value })} />×<input inputMode="numeric" aria-label="Širina ploče" value={f.w} onChange={e => setF({ ...f, w: e.target.value })} /></span></label>
      <label>Cena po ploči<input inputMode="numeric" value={f.price} placeholder="0" onChange={e => setF({ ...f, price: e.target.value })} /></label>
      <label className="chk"><input type="checkbox" checked={f.grain} onChange={e => setF({ ...f, grain: e.target.checked })} />Dekor sa šarom</label>
      {err && f.name && <p className="pl-err" role="alert">{err}</p>}
      <div className="pl-addbtns"><button type="submit" className="accent" disabled={!!err}>Dodaj</button><button type="button" onClick={onCancel}>Otkaži</button></div>
    </form>
  );
}
