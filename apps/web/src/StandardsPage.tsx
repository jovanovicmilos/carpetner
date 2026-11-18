// Admin → Podrazumevane mere (design/screens/Standardi.html): dimension source, values with EN 1116 limits, checks, help defaults.
import { checkLimit, PRESETS, STANDARD_LIMITS } from 'engine';
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

export function StandardsPage() {
  const w = useWorkshop();
  const fixed = w.preset === 'en1116' || w.preset === 'iso3055';
  const dims = w.preset === 'none' ? null : w.preset === 'workshop' ? w.own : PRESETS[w.preset];
  return (
    <AdminLayout nav="short">
      <div className="st-head">
        <h1>Podrazumevane mere<Tip k="standards.title" align="right" /></h1>
        <p>Šta se upisuje u formu kada se doda novi element. Izabrani izvor važi za celu radionicu; svaki projekat ga može promeniti.</p>
      </div>
      <fieldset className="st-sources">
        <legend>Izvor mera<Tip k="standards.source" align="right" /></legend>
        {SOURCES.map(([id, t, d]) => (
          <label key={id} className={w.preset === id ? 'on' : undefined}>
            <span className="t"><input type="radio" name="izvor" checked={w.preset === id} onChange={() => w.set({ preset: id })} /><strong>{t}</strong></span>
            <span className="d">{d}</span>
          </label>
        ))}
      </fieldset>
      <section aria-label="Vrednosti" className="st-table">
        <table>
          <thead><tr><th className="f">Mera</th><th className="r">Podrazumevano (mm)</th><th>Granica iz EN 1116</th><th className="l">Provera</th></tr></thead>
          <tbody>
            {STANDARD_LIMITS.map(l => {
              const v = dims ? dims[l.key] : null, c = checkLimit(l.key, v);
              return (
                <tr key={l.key}>
                  <td className="f">{l.label}</td>
                  <td className="r"><input type="text" inputMode="numeric" aria-label={l.label} value={v ?? ''} placeholder="—" readOnly={fixed || !dims}
                    className={fixed ? 'ro' : undefined} onChange={e => w.set({ own: { ...w.own, [l.key]: num(e.target.value) } })} /></td>
                  <td className="lim">{l.text}</td>
                  <td className={`l chk ${c ?? ''}`}>{c === 'ok' ? 'u granicama' : c === 'out' ? 'van standarda' : '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
      <div className="st-cards">
        <section className="st-card">
          <h2>Kontrola po standardu<Tip k="standards.check" align="right" /></h2>
          <label><input type="checkbox" checked={w.warnOutside} onChange={e => w.set({ warnOutside: e.target.checked })} />Upozori kada mera izađe iz granica EN 1116</label>
          <label><input type="checkbox" checked={w.checkEmpty} onChange={e => w.set({ checkEmpty: e.target.checked })} />Proveravaj i kad su forme prazne</label>
          <p>Upozorenje nikad ne blokira unos — stolar radi po meri prostora.</p>
        </section>
        <section className="st-card warn">
          <h2>Napomena</h2>
          Granice su sažetak EN 1116:2018. Pre objavljivanja aplikacije vrednosti treba potvrditi iz zvaničnog teksta standarda (EN 1116 i ISO 3055 se kupuju).
        </section>
      </div>
      <section aria-label="Pomoć u aplikaciji" className="st-card">
        <h2>Pomoć i objašnjenja<Tip k="standards.help" align="right" /></h2>
        <fieldset className="st-row">
          <legend>Podrazumevano za radionicu</legend>
          {([['all', 'Uključena za sve'], ['new', 'Samo za nove korisnike (prvih 14 dana)'], ['off', 'Isključena']] as const).map(([id, t]) => (
            <label key={id}><input type="radio" name="pomoc" checked={w.help === id} onChange={() => w.set({ help: id })} />{t}</label>
          ))}
        </fieldset>
        <div className="st-row">
          <label><input type="checkbox" checked={w.hoverCard} onChange={e => w.set({ hoverCard: e.target.checked })} />Kartica sa podacima na planu</label>
          <label><input type="checkbox" checked={w.legend} onChange={e => w.set({ legend: e.target.checked })} />Legenda simbola</label>
          <label><input type="checkbox" checked={w.ownNotes} onChange={e => w.set({ ownNotes: e.target.checked })} />Vlastite napomene radionice u objašnjenjima</label>
        </div>
      </section>
    </AdminLayout>
  );
}
