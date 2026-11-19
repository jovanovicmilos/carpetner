// Admin → Cenovnik (design/screens/Cenovnik.html): sheet prices, saw-shop services, hardware, labour, margin and VAT.
import { DEFAULT_MATERIALS, type PriceList } from 'engine';
import { useState } from 'react';
import { AdminLayout } from './AdminLayout';
import { Tip } from './help';
import { num } from './labels';
import { usePrices, type PriceSettings } from './prices';

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
    ['plinthClip', 'Klipsa za soklu', 'po komadu'], ['handle', 'Ručka 128 mm', 'po komadu'], ['hanger', 'Vešaljka za gornji (par)', 'po paru'], ['shelfPin', 'Nosač police', 'po komadu'],
    ['plinthPerM', 'Sokla', 'po m'], ['wallStripPerM', 'Zidna lajsna', 'po m'], ['fastenersLump', 'Tiplovi, konfirmati, šrafovi, klamerice', 'paušal'],
    ['worktopFittingsLump', 'Spojnice radne ploče, silikon', 'paušal'], ['sinkPad', 'Aluminijumska podloga za sudoperu', 'po komadu']],
  labour: [['perElement', 'Izrada po elementu', 'po elementu'], ['installDay', 'Montaža kod kupca', 'po danu']],
};

export function PriceListPage() {
  const stored = usePrices();
  const [draft, setDraft] = useState<PriceSettings>({ prices: stored.prices, marginPct: stored.marginPct, vatPct: stored.vatPct, wastePct: stored.wastePct, rounding: stored.rounding });
  const [tab, setTab] = useState<Tab>('sheets');
  const [saved, setSaved] = useState(false);
  const p = draft.prices;
  const setP = (patch: Partial<PriceList>) => { setSaved(false); setDraft({ ...draft, prices: { ...p, ...patch } }); };
  const mats = Object.values(DEFAULT_MATERIALS).sort((a, b) => (a.kind === 'hdf' ? 1 : 0) - (b.kind === 'hdf' ? 1 : 0) || b.thickness - a.thickness);
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
          {/* shortcut: supplier price-list import comes with suppliers (MVP 8) */}
          <button type="button" aria-disabled="true" title="Uskoro">Uvezi cenovnik dobavljača (Excel/CSV)</button>
          <button type="button" className="accent" onClick={() => { stored.save(draft); setSaved(true); }}>{saved ? 'Sačuvano' : 'Sačuvaj izmene'}</button>
        </div>
      </div>
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
                      <td className="l muted">[DOBAVLJAČ 1]</td>
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
          <button type="button" className="pl-add" aria-disabled="true" title="Uskoro">+ Dodaj materijal</button>
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
