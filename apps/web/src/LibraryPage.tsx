// Admin · Materijali, ručke, aparati (design/Biblioteka.dc.html, docs/3D.md "Materijali", docs/OTVARANJE.md, docs/KATALOG.md):
// - Materijali: how each board, worktop and floor looks in the realistic 3D (texture upload, real size, grain, finish, licence).
// - Ručke i otvaranje: handles of new projects and which ones the workshop offers (workshop.ts).
// - Aparati: the generic model list (fixtures/aparati.json) and the appliance finish used in the realistic 3D.
// - Katalog elemenata: which catalog units and own templates show in the Prostor library.
// Changes are a draft until "Sačuvaj izmene", like Cenovnik.
import type { OpeningKind } from 'engine';
import { useEffect, useState } from 'react';
import appliances from '../../../fixtures/aparati.json';
import { FrontThumb, thumbOf } from './Editor';
import { CATALOG_GROUPS, LIBRARY, type LibItem } from './library';
import { useTemplates } from './templates';
import { useWorkshop, type WorkshopSettings } from './workshop';
import { Link } from 'react-router';
import { AdminLayout } from './AdminLayout';
import { Tip } from './help';
import { FLOORS, FRONTS, materialColor, WTOPS } from './look';
import {
  FINISH_NAME, LICENSE_NOTE, LICENSES, lookOf, putTexture, textureUrl, useLooks, type Finish, type License, type MaterialLook,
} from './materialLooks';
import { useProject } from './store';
import { SegmentedControl, sx } from './ui';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Row { key: string; name: string; code: string; kind: string; color: string }
const licStyle = (k: License) => 'display: inline-block; font-size: 12px; padding: 3px 8px; border-radius: 10px; ' + (k === 'check' ? 'background: #FBE3D3; color: #7C2D0A' : k === 'none' ? 'background: #F3F1EC; color: #5F5A52' : 'background: #E4F1E6; color: #1F5A2A');
type Tab = 'mat' | 'open' | 'app' | 'cat';
type WsDraft = Pick<WorkshopSettings, 'opening' | 'openingOff' | 'hiddenCatalog' | 'applianceFinish'>;
// Design OCARDS: kind, title, sub, icon path, stroke, facts.
const OCARDS: [OpeningKind | 'gola', string, string, string, number, [string, string][]][] = [
  ['bar', 'Ručka – šipka', 'Najčešća; rupe idu u nacrte i CNC', 'M50 14v20', 2.6, [['Razmak rupa', '96 · 128 · 160 · 192 · 320 mm'], ['Boje', 'Inox · Crna mat · Mesing'], ['Bušenje', '2 × Ø5; krilo 40 mm od ivice otvaranja, fioka centrirano 50 mm od vrha'], ['Artikal u cenovniku', 'Okov i repro → Ručka šipka {razmak} {boja}']]],
  ['knob', 'Ručka – dugme', 'Klasične i rustične kuhinje', 'M51 24h.01', 6, [['Boje', 'Inox · Crna mat · Mesing'], ['Bušenje', '1 × Ø5, ista pozicija kao šipka'], ['Artikal u cenovniku', 'Okov i repro → Dugme {boja}']]],
  ['profile', 'Profil na vrhu fronte', 'Alu profil navučen na ivicu fronte', 'M5 7.5h54', 3.5, [['Visina profila', '20 mm — fronta je za toliko kraća'], ['Gornji elementi', 'profil na donjoj ivici'], ['Boje', 'Crna · Inox · Zlatna'], ['Obračun', 'po metru, zaokruženo na 0,1 m']]],
  ['push', 'Na pritisak (bez ručke)', 'Krilo i fioka se otvaraju pritiskom', 'M32 24h.01', 0, [['Krila', 'šarka bez opruge + potiskivač 1 kom/krilo'], ['Fioke', 'vođice sa potiskivanjem'], ['Zazor fronti', '3 mm (najmanje 2,5)']]],
  ['gola', 'Gola profil (kanal)', 'Druga verzija — menja konstrukciju korpusa', 'M4 14h56', 4, [['Status', 'planirano za v2'], ['Zašto kasnije', 'menja stranice, visine fronti i ugaone elemente']]],
];
const FINS: [WorkshopSettings['applianceFinish'], string, string][] = [['inox', 'Inox', '#C9CED3'], ['black', 'Crno staklo', '#1E1F21'], ['white', 'Belo', '#F2F2F0']];
const FIN_NAME: Record<string, string> = { inox: 'Inox', black: 'Crno', white: 'Belo', front: 'fronta elementa', 'granite-black': 'Granit crni', 'granite-beige': 'Granit bež', brass: 'Mesing' };
const CAT_NAME: Record<string, string> = { rerna: 'Rerne', 'ploča': 'Ploče', aspirator: 'Aspiratori', 'frižider': 'Frižideri', MSP: 'MSP', sudopera: 'Sudopere', slavina: 'Slavine' };
const CARD = 'background: #FFFFFF; border: 1px solid #DDD8CE; border-radius: 10px';
const SEL = 'min-h-10 w-full border-border px-2 text-[14px]';

export function LibraryPage() {
  const project = useProject(s => s.project);
  const { looks, save } = useLooks();
  const [draft, setDraft] = useState(looks);
  const [files, setFiles] = useState<Record<string, File>>({});
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [sel, setSel] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [tab, setTab] = useState<Tab>('mat');
  const workshop = useWorkshop();
  const [ws, setWs] = useState<WsDraft>({ opening: workshop.opening, openingOff: workshop.openingOff, hiddenCatalog: workshop.hiddenCatalog, applianceFinish: workshop.applianceFinish });
  const putWs = (p: Partial<WsDraft>) => { setWs(w => ({ ...w, ...p })); setSaved(false); };
  const templates = useTemplates(s => s.list);
  const catalog = [
    ...templates.map((t): LibItem => ({ key: t.key, group: 'Moji šabloni', name: t.name, type: 'el', kind: t.element.kind, width: t.element.width, hinge: t.element.hinge, template: t.element })),
    ...LIBRARY,
  ].filter((l): l is Extract<LibItem, { type: 'el' }> => l.type === 'el');
  const shown = catalog.filter(l => !ws.hiddenCatalog.includes(l.key)).length;

  // Boards of the project and the 3D palette, then worktops and floors.
  const mats = { ...Object.fromEntries(FRONTS.map(f => [f[2].id, f[2]])), ...project?.materials };
  const role = (id: string) => (project?.elements.some(e => e.materials.front === id) ? 'fronta' : project?.elements.some(e => e.materials.carcass === id) ? 'korpus' : 'fronta');
  const rows: Row[] = [
    ...Object.values(mats).filter(m => m.kind === 'chipboard' || m.kind === 'mdf').map(m => ({
      key: m.id, name: m.name, code: m.name.split(/\s+/).find(w => /^[A-Z]{1,3}\d{3,5}/.test(w)) ?? m.id, kind: `Ploča ${m.thickness} · ${role(m.id)}`, color: materialColor(m),
    })),
    ...WTOPS.map(([n, bg, label]) => ({ key: `wt:${n}`, name: `Radna ploča ${n.toLowerCase()}`, code: label, kind: 'Radna ploča', color: bg })),
    ...FLOORS.map(([n, bg]) => ({ key: `floor:${n}`, name: n, code: 'pod', kind: 'Pod (prikaz)', color: bg })),
  ];
  const cur = rows.find(r => r.key === sel) ?? rows[0];
  const look = lookOf(draft, cur.key);
  const put = (p: Partial<MaterialLook>) => { setDraft(d => ({ ...d, [cur.key]: { ...lookOf(d, cur.key), ...p } })); setSaved(false); };

  // Preview URLs: bundled files, uploaded files (IndexedDB) and files chosen now.
  useEffect(() => {
    let live = true;
    const made: string[] = [];
    Promise.all(rows.map(async r => {
      const f = files[r.key];
      const u = f ? URL.createObjectURL(f) : await textureUrl(r.key, { ...lookOf(draft, r.key), license: 'none' });
      if (u?.startsWith('blob:')) made.push(u);
      return [r.key, u] as const;
    })).then(list => { if (live) setUrls(Object.fromEntries(list.filter(([, u]) => u) as [string, string][])); });
    return () => { live = false; made.forEach(u => URL.revokeObjectURL(u)); };
  }, [draft, files]); // eslint-disable-line react-hooks/exhaustive-deps -- rows derive from the project

  if (!project) return null;
  const bg = (r: Row) => (urls[r.key] ? `url("${urls[r.key]}") center / cover` : r.color);
  const repeatText = look.repeat ? `${look.repeat.w} × ${look.repeat.h}` : '';
  async function commit() {
    for (const [k, f] of Object.entries(files)) await putTexture(k, f);
    save(draft); setFiles({}); workshop.set(ws); setSaved(true);
  }

  return (
    <AdminLayout>
      <div style={sx('display: flex; flex-direction: column; gap: 20px')}>
        <div style={sx('display: flex; flex-wrap: wrap; align-items: flex-end; gap: 12px')}>
          <div>
            <h1 style={sx('margin: 0; font-size: 28px; display: flex; align-items: center')}>Materijali, ručke i aparati<Tip k="library.title" align="right" /></h1>
            <p style={sx('margin: 4px 0 0; color: #5F5A52; font-size: 15px')}>Izgled u realnom prikazu · vezano za cenovnik radionice</p>
          </div>
          <div style={sx('margin-left: auto; display: flex; gap: 8px; flex-wrap: wrap; align-items: center')}>
            {saved && <span role="status" style={sx('font-size: 13px; color: #1F5A2A')}>Sačuvano</span>}
            <Button asChild variant="outline" size="none" className="min-h-11 px-3.5 text-[14px] font-normal"><Link to="/3d">Pogledaj u 3D</Link></Button>
            <Button size="none" className="min-h-11 px-3.5 py-2.5 text-[14px]" onClick={commit}>Sačuvaj izmene</Button>
          </div>
        </div>

        <Tabs value={tab} onValueChange={v => setTab(v as Tab)}><TabsList aria-label="Biblioteka izgleda" className="flex flex-wrap gap-1 border-0 border-b border-solid border-border">
          {([['mat', 'Materijali', String(rows.length)], ['open', 'Ručke i otvaranje', '4'], ['app', 'Aparati (3D modeli)', String(appliances.modeli.length)], ['cat', 'Katalog elemenata', `${shown}/${catalog.length}`]] as const).map(([k, t, n]) => (
            <TabsTrigger key={k} value={k} className="min-h-11 border-0 border-b-[3px] border-solid border-transparent bg-transparent px-3.5 py-2.5 text-[14px] text-muted-foreground data-[state=active]:border-primary data-[state=active]:font-semibold data-[state=active]:text-foreground">{t}<span className="ml-1.5 font-mono text-[12px] font-normal text-muted-2">{n}</span></TabsTrigger>
          ))}
        </TabsList></Tabs>

        {tab === 'open' && <OpeningTab ws={ws} put={putWs} />}
        {tab === 'app' && <ApplianceTab ws={ws} put={putWs} />}
        {tab === 'cat' && <CatalogTab ws={ws} put={putWs} items={catalog} opening={ws.opening} />}

        {tab === 'mat' && (
        <div style={sx('display: flex; flex-wrap: wrap; gap: 20px; align-items: flex-start')}>
          <section aria-label="Materijali" style={sx('flex: 999 1 560px; min-width: 0; background: #FFFFFF; border: 1px solid #DDD8CE; border-radius: 10px; padding: 8px 16px 16px')}>
            <div style={sx('overflow-x: auto')}>
              <table style={sx('width: 100%; border-collapse: collapse; font-size: 14px; min-width: 640px')}>
                <thead><tr style={sx('text-align: left; color: #5F5A52; font-size: 13px')}><th style={sx('padding: 12px 8px 12px 0; font-weight: 500')}>Materijal</th><th style={sx('padding: 12px 8px; font-weight: 500')}>Vrsta</th><th style={sx('padding: 12px 8px; font-weight: 500')}>Tekstura</th><th style={sx('padding: 12px 8px; font-weight: 500')}>Površina</th><th style={sx('padding: 12px 0 12px 8px; font-weight: 500')}>Izvor teksture</th></tr></thead>
                <tbody>
                  {rows.map(r => {
                    const on = r.key === cur.key, l = lookOf(draft, r.key);
                    return (
                      <tr key={r.key} style={sx('border-top: 1px solid #EEEAE2; ' + (on ? 'background: #FFF8F3; box-shadow: inset 3px 0 0 #B4440E' : ''))}>
                        <td style={sx('padding: 8px 8px 8px 0')}><button type="button" onClick={() => setSel(r.key)} aria-pressed={on} style={sx('font: inherit; display: flex; align-items: center; gap: 10px; border: 0; background: transparent; padding: 0; cursor: pointer; text-align: left; color: #1C1B19')}>
                          <span style={{ ...sx('width: 40px; height: 40px; border-radius: 6px; flex: none; border: 1px solid #BDB6AA'), background: bg(r) }} />
                          <span><span style={sx('display: block; font-weight: 600')}>{r.name}</span><span style={sx("font: 12px var(--font-mono); color: #5F5A52")}>{r.code}</span></span></button></td>
                        <td style={sx('padding: 8px; color: #3D3A35')}>{r.kind}</td>
                        <td style={sx('padding: 8px; color: #3D3A35')}>{files[r.key]?.name ?? l.file?.replace('/textures/', '') ?? 'jednobojna'}</td>
                        <td style={sx('padding: 8px; color: #3D3A35')}>{FINISH_NAME[l.finish]}</td>
                        <td style={sx('padding: 8px 0 8px 8px')}><span style={sx(licStyle(l.license))}>{LICENSES.find(x => x[0] === l.license)![1]}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Link to="/admin/cenovnik" style={sx('display: inline-flex; align-items: center; margin-top: 12px; font-size: 14px; min-height: 44px; padding: 0 14px; border-radius: 6px; border: 1px dashed #8A8378; background: #FFFFFF; color: #1C1B19; text-decoration: none')}>+ Dodaj materijal iz cenovnika</Link>
          </section>

          <aside aria-label="Izabrani materijal" style={sx('flex: 1 1 320px; background: #FFFFFF; border: 1px solid #DDD8CE; border-radius: 10px; padding: 18px; display: flex; flex-direction: column; gap: 12px')}>
            <div style={{ ...sx('height: 120px; border-radius: 8px; border: 1px solid #DDD8CE'), background: bg(cur) }} />
            <div><div style={sx('font-size: 12px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: #B4440E')}>Izgled u 3D</div><h2 style={sx('margin: 2px 0 0; font-size: 20px')}>{cur.name} · {cur.code}</h2><div style={sx('font-size: 13px; color: #5F5A52')}>{cur.kind}{cur.key.includes(':') ? '' : ' · cena iz cenovnika (Ploče)'}</div></div>
            <div style={sx('display: flex; flex-direction: column; gap: 4px; font-size: 13px; color: #5F5A52')}>Fajl teksture
              <span style={sx('display: flex; gap: 8px; align-items: center')}>
                <span style={sx("flex: 1; font: 13px var(--font-mono); color: #1C1B19; padding: 9px 10px; border: 1px solid #DDD8CE; border-radius: 6px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap")}>{files[cur.key]?.name ?? look.file?.replace('/textures/', '') ?? 'jednobojna (bez slike)'}</span>
                <label style={sx('font: inherit; font-size: 13px; min-height: 40px; padding: 0 12px; border-radius: 6px; border: 1px solid #1C1B19; background: #FFFFFF; color: #1C1B19; display: inline-flex; align-items: center; cursor: pointer')}>Otpremi
                  <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={e => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    setFiles(x => ({ ...x, [cur.key]: f }));
                    put({ file: f.name, ...(look.license === 'none' ? { license: 'check' as License } : {}), ...(look.repeat ? {} : { repeat: { w: 1400, h: 2800 } }), ...(look.grain === 'none' && !cur.key.includes(':') ? { grain: 'length' as const } : {}) });
                  }} /></label>
              </span>
            </div>
            <div style={sx('display: grid; grid-template-columns: 1fr 1fr; gap: 8px')}>
              <label style={sx('display: flex; flex-direction: column; gap: 4px; font-size: 13px; color: #5F5A52')}><span style={sx('display: flex; align-items: center')}>Uzorak (mm)<Tip k="library.repeat" align="right" /></span>
                <Input key={cur.key + repeatText} type="text" aria-label="Uzorak (mm)" defaultValue={repeatText} placeholder="1400 × 2800"
                  onBlur={e => { const [w, h] = e.target.value.split(/[x×*,\s]+/).map(Number).filter(n => n > 0); if (w && h) put({ repeat: { w, h } }); }}
                  className="h-auto border-border px-2.5 py-[9px] font-mono text-[14px]" /></label>
              <label style={sx('display: flex; flex-direction: column; gap: 4px; font-size: 13px; color: #5F5A52')}>Šara
                <Select value={look.grain} onValueChange={v => put({ grain: v as MaterialLook['grain'] })}>
                  <SelectTrigger aria-label="Šara" className={SEL}><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="length">Po dužini ploče</SelectItem><SelectItem value="none">Bez šare</SelectItem></SelectContent>
                </Select></label>
            </div>
            <div style={sx('display: flex; flex-direction: column; gap: 6px; font-size: 13px; color: #5F5A52')}>Površina
              <SegmentedControl label="Površina" className="grid grid-cols-3 gap-[3px] rounded-lg bg-background p-[3px]" value={look.finish} onChange={f => put({ finish: f })}
                itemClass="min-h-[34px] rounded-md border-0 bg-transparent text-[13px] text-muted-foreground data-[state=on]:bg-white data-[state=on]:font-semibold data-[state=on]:text-foreground data-[state=on]:shadow-[0_1px_3px_rgba(0,0,0,0.12)]"
                options={(['matte', 'satin', 'gloss'] as Finish[]).map(f => [f, FINISH_NAME[f]] as const)} />
            </div>
            <label style={sx('display: flex; flex-direction: column; gap: 4px; font-size: 13px; color: #5F5A52')}>Izvor i licenca teksture
              <Select value={look.license} onValueChange={v => put({ license: v as License })}>
                <SelectTrigger aria-label="Izvor i licenca teksture" className={SEL}><SelectValue /></SelectTrigger>
                <SelectContent>{LICENSES.map(([v, t]) => <SelectItem key={v} value={v}>{t}</SelectItem>)}</SelectContent>
              </Select></label>
            <div style={sx('font-size: 13px; line-height: 1.5; padding: 10px 12px; border-radius: 8px; ' + (look.license === 'check' ? 'background: #FBE3D3; color: #7C2D0A' : 'background: #F3F1EC; color: #3D3A35'))}>{LICENSE_NOTE[look.license]}{look.source ? ` Izvor: ${look.source}.` : ''}</div>
          </aside>
        </div>
        )}
      </div>
    </AdminLayout>
  );
}

type TabProps = { ws: WsDraft; put: (p: Partial<WsDraft>) => void };

function OpeningTab({ ws, put }: TabProps) {
  return (
    <div style={sx('display: flex; flex-direction: column; gap: 16px')}>
      <label style={sx(CARD + '; display: flex; flex-wrap: wrap; align-items: center; gap: 12px; padding: 14px 16px; font-size: 14px')}><strong>Podrazumevano za nove projekte</strong>
        <Select value={ws.opening} onValueChange={v => { const k = v as OpeningKind; put({ opening: k, openingOff: ws.openingOff.filter(x => x !== k) }); }}>
          <SelectTrigger aria-label="Podrazumevano za nove projekte" className={SEL}><SelectValue /></SelectTrigger>
          <SelectContent>{OCARDS.filter(o => o[0] !== 'gola').map(([k, t]) => <SelectItem key={k} value={k}>{t}</SelectItem>)}</SelectContent>
        </Select>
        <span style={sx('color: #5F5A52; font-size: 13px')}>Projekat i pojedinačni element mogu da promene.</span>
      </label>
      <div style={sx('display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px')}>
        {OCARDS.map(([k, title, sub, d, sw, facts]) => {
          const gola = k === 'gola', def = ws.opening === k, on = !gola && !ws.openingOff.includes(k);
          return (
            <section key={k} aria-label={title} style={sx(`background: #FFFFFF; border: ${def ? '2px solid #B4440E' : '1px solid #DDD8CE'}; border-radius: 10px; padding: 14px 16px; display: flex; flex-direction: column; gap: 8px${gola ? '; opacity: 0.65' : ''}`)}>
              <div style={sx('display: flex; align-items: center; gap: 12px')}>
                <svg width="64" height="48" viewBox="0 0 64 48" aria-hidden="true"><rect x="4" y="4" width="56" height="40" rx="2" fill="#EFE9DE" stroke="#1C1B19" strokeWidth="1.4" /><path d={d} fill="none" stroke="#1C1B19" strokeWidth={sw} strokeLinecap="round" /></svg>
                <div style={sx('flex: 1')}><h2 style={sx('margin: 0; font-size: 17px')}>{title}</h2><div style={sx('font-size: 12px; color: #5F5A52')}>{sub}</div></div>
              </div>
              {facts.map(([a, b]) => <div key={a} style={sx('display: flex; justify-content: space-between; gap: 12px; font-size: 13px; border-top: 1px solid #EFEBE3; padding-top: 8px')}><span style={sx('color: #5F5A52')}>{a}</span><span style={sx('text-align: right')}>{b}</span></div>)}
              <label style={sx('display: flex; align-items: center; gap: 10px; min-height: 40px; font-size: 14px')}>
                <Checkbox checked={on} disabled={gola || def}
                  onCheckedChange={() => put({ openingOff: on ? [...ws.openingOff, k as OpeningKind] : ws.openingOff.filter(x => x !== k) })} />
                {gola ? 'Uskoro (v2)' : def ? 'Dostupno · podrazumevano' : 'Dostupno u projektima'}
              </label>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function ApplianceTab({ ws, put }: TabProps) {
  const note = 'flex: 1 1 320px; ' + CARD + '; padding: 14px 16px; font-size: 13px; line-height: 1.55; color: #3D3A35';
  return (
    <div style={sx('display: flex; flex-direction: column; gap: 16px')}>
      <div style={sx('display: flex; flex-wrap: wrap; gap: 16px')}>
        <div style={sx(note)}><strong style={sx('color: #1C1B19')}>Generički modeli, bez brenda.</strong> Biblioteku održava Kroj tim i ista je za sve radionice. Aparat se sam smešta u nišu elementa (tačka umetanja: donji levi zadnji ugao). Prikazuju se samo u realnom 3D; u 2D, nacrtima i krojnoj listi ostaje simbol.</div>
        <div style={sx(note)}><strong style={sx('color: #1C1B19')}>Pravila licenci.</strong> Prihvatamo: CC0, kupljenu licencu za komercijalnu aplikaciju, sopstvene modele. Ne prihvatamo: CC-BY bez navođenja autora, nekomercijalne (NC) i „editorial only". Zasluge se ispisuju automatski na stranici „O aplikaciji".</div>
      </div>
      <div role="group" aria-label="Podrazumevana završna obrada aparata" style={sx('display: flex; flex-wrap: wrap; align-items: center; gap: 8px; font-size: 14px')}>Podrazumevana obrada u projektima:
        {FINS.map(([k, t, c]) => {
          const on = ws.applianceFinish === k;
          return <Button key={k} variant="outline" size="none" aria-pressed={on} onClick={() => put({ applianceFinish: k })} className="min-h-9 gap-1.5 rounded-[18px] px-3 py-1.5 text-[13px] font-normal aria-pressed:border-foreground aria-pressed:bg-foreground aria-pressed:text-white"><span className="size-3.5 rounded-full border border-solid border-muted-2" style={{ background: c }} />{t}</Button>;
        })}
      </div>
      <section aria-label="Aparati" style={sx(CARD + '; padding: 8px 16px 16px')}>
        <div style={sx('overflow-x: auto')}>
          <table style={sx('width: 100%; border-collapse: collapse; font-size: 14px; min-width: 820px')}>
            <thead><tr style={sx('text-align: left; color: #5F5A52; font-size: 13px')}><th style={sx('padding: 12px 8px 12px 0; font-weight: 500')}>Model</th><th style={sx('padding: 12px 8px; font-weight: 500')}>Niša / mere (mm)</th><th style={sx('padding: 12px 8px; font-weight: 500')}>Obrade</th><th style={sx('padding: 12px 8px; font-weight: 500; text-align: right')}>GLB</th><th style={sx('padding: 12px 8px; font-weight: 500')}>Licenca · izvor</th><th style={sx('padding: 12px 0 12px 8px; font-weight: 500')}>Status</th></tr></thead>
            <tbody>
              {appliances.modeli.map(a => (
                <tr key={a.id} style={sx('border-top: 1px solid #EEEAE2')}>
                  <td style={sx('padding: 8px 8px 8px 0')}><div style={sx('font-weight: 600')}>{a.name}</div><div style={sx('font-size: 12px; color: #5F5A52')}>{CAT_NAME[a.category] ?? a.category}</div></td>
                  <td style={sx("padding: 8px; font-family: var(--font-mono); font-size: 13px")}>{a.niche.replace(/×/g, ' × ').replace(', ', ' · ')}</td>
                  <td style={sx('padding: 8px; font-size: 13px')}>{a.finishes.map(f => FIN_NAME[f] ?? f).join(' · ')}</td>
                  <td style={sx("padding: 8px; text-align: right; font-family: var(--font-mono); font-size: 13px")}>—</td>
                  <td style={sx('padding: 8px; font-size: 13px')}>{a.license} · {a.source}</td>
                  {/* The GLB files do not exist yet (fixtures/aparati.json "opis"): the realistic 3D draws a generic box. */}
                  <td style={sx('padding: 8px 0 8px 8px')}><span title="Model još ne postoji; u realnom 3D se crta generičko telo" style={sx('display: inline-block; font-size: 12px; padding: 3px 8px; border-radius: 10px; background: #FBE3D3; color: #7C2D0A')}>Planiran</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function CatalogTab({ ws, put, items, opening }: TabProps & { items: Extract<LibItem, { type: 'el' }>[]; opening: OpeningKind }) {
  return (
    <div style={sx('display: flex; flex-direction: column; gap: 16px')}>
      <p style={sx('margin: 0; font-size: 14px; color: #5F5A52; line-height: 1.5')}>Gotovi elementi koji se vide u biblioteci Prostora. Svaki je podrazumevana konfiguracija parametarskog elementa — širina, ručke i materijali se menjaju u projektu. Sakrij ono što radionica ne pravi.</p>
      {CATALOG_GROUPS.map(g => {
        const list = items.filter(l => l.group === g);
        return list.length ? (
          <section key={g} aria-label={g} style={sx(CARD + '; padding: 14px 16px; display: flex; flex-direction: column; gap: 10px')}>
            <h2 style={sx('margin: 0; font-size: 16px')}>{g} <span style={sx("font: 13px var(--font-mono); color: #8A8378")}>{list.length}</span></h2>
            <div style={sx('display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 8px')}>
              {list.map(l => {
                const on = !ws.hiddenCatalog.includes(l.key), t = thumbOf(l);
                return (
                  <label key={l.key} style={sx('display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 10px 8px; border-radius: 8px; cursor: pointer; ' + (on ? 'border: 1px solid #DDD8CE; background: #FFFFFF' : 'border: 1px dashed #BDB6AA; background: #F7F5F0; opacity: 0.7'))}>
                    <FrontThumb el={t} opening={opening} />
                    <span style={sx('font-size: 13px; font-weight: 600; text-align: center')}>{l.name}</span>
                    <span style={sx("font: 12px var(--font-mono); color: #5F5A52")}>{l.width} × {t.height} × {l.template?.depth ?? (l.kind === 'wall' ? 320 : 560)}</span>
                    <span style={sx('display: flex; align-items: center; gap: 6px; font-size: 12px')}>
                      <Checkbox className="size-4" checked={on}
                        onCheckedChange={() => put({ hiddenCatalog: on ? [...ws.hiddenCatalog, l.key] : ws.hiddenCatalog.filter(x => x !== l.key) })} />U biblioteci
                    </span>
                  </label>
                );
              })}
            </div>
          </section>
        ) : null;
      })}
    </div>
  );
}
