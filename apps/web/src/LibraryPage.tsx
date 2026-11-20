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
import { SegmentedControl } from './ui';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { BRAND } from './brand';

interface Row { key: string; name: string; code: string; kind: string; color: string }
const licStyle = (k: License) => cn('inline-block text-[12px] py-[3px] px-[8px] rounded-[10px]', k === 'check' ? 'bg-warn-soft text-warn-ink' : k === 'none' ? 'bg-[#F3F1EC] text-[#5F5A52]' : 'bg-[#E4F1E6] text-[#1F5A2A]');
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
const CARD = 'bg-white border border-[#DDD8CE] rounded-[10px]';
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
      <div className="flex flex-col gap-[20px]">
        <div className="flex flex-wrap items-end gap-[12px]">
          <div>
            <h1 className="m-0 text-[28px] flex items-center">Materijali, ručke i aparati<Tip k="library.title" align="right" /></h1>
            <p className="m-[4px_0_0] text-[#5F5A52] text-[15px]">Izgled u realnom prikazu · vezano za cenovnik radionice</p>
          </div>
          <div className="ml-auto flex gap-[8px] flex-wrap items-center">
            {saved && <span role="status" className="text-[13px] text-[#1F5A2A]">Sačuvano</span>}
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
        <div className="flex flex-wrap gap-[20px] items-start">
          <section aria-label="Materijali" className="flex-[999_1_560px] min-w-[0] bg-white border border-[#DDD8CE] rounded-[10px] p-[8px_16px_16px]">
            <div className="overflow-x-auto">
              <table className="w-full [border-collapse:collapse] text-[14px] min-w-[640px]">
                <thead><tr className="text-left text-[#5F5A52] text-[13px]"><th className="p-[12px_8px_12px_0] font-medium">Materijal</th><th className="py-[12px] px-[8px] font-medium">Vrsta</th><th className="py-[12px] px-[8px] font-medium">Tekstura</th><th className="py-[12px] px-[8px] font-medium">Površina</th><th className="p-[12px_0_12px_8px] font-medium">Izvor teksture</th></tr></thead>
                <tbody>
                  {rows.map(r => {
                    const on = r.key === cur.key, l = lookOf(draft, r.key);
                    return (
                      <tr key={r.key} className={cn('border-t border-t-[#EEEAE2]', (on ? 'bg-[#F2F8F4] shadow-[inset_3px_0_0_#2E6B4E]' : ''))}>
                        <td className="p-[8px_8px_8px_0]"><Button variant={null} size="none" onClick={() => setSel(r.key)} aria-pressed={on} className="flex justify-start whitespace-normal font-normal items-center gap-[10px] border-0 bg-transparent p-0 cursor-pointer text-left text-[#1C1B19]">
                          <span className="w-[40px] h-[40px] rounded-[6px] flex-none border border-[#BDB6AA]" style={{ background: bg(r) }} />
                          <span><span className="block font-semibold">{r.name}</span><span className="text-[12px] leading-[normal] font-mono text-[#5F5A52]">{r.code}</span></span></Button></td>
                        <td className="p-[8px] text-[#3D3A35]">{r.kind}</td>
                        <td className="p-[8px] text-[#3D3A35]">{files[r.key]?.name ?? l.file?.replace('/textures/', '') ?? 'jednobojna'}</td>
                        <td className="p-[8px] text-[#3D3A35]">{FINISH_NAME[l.finish]}</td>
                        <td className="p-[8px_0_8px_8px]"><span className={cn(licStyle(l.license))}>{LICENSES.find(x => x[0] === l.license)![1]}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Link to="/admin/cenovnik" className="inline-flex items-center mt-[12px] text-[14px] min-h-[44px] py-0 px-[14px] rounded-[6px] border border-dashed border-[#8A8378] bg-white text-[#1C1B19] no-underline">+ Dodaj materijal iz cenovnika</Link>
          </section>

          <aside aria-label="Izabrani materijal" className="flex-[1_1_320px] bg-white border border-[#DDD8CE] rounded-[10px] p-[18px] flex flex-col gap-[12px]">
            <div className="h-[120px] rounded-[8px] border border-[#DDD8CE]" style={{ background: bg(cur) }} />
            <div><div className="text-[12px] font-semibold tracking-[0.06em] uppercase text-[#2E6B4E]">Izgled u 3D</div><h2 className="m-[2px_0_0] text-[20px]">{cur.name} · {cur.code}</h2><div className="text-[13px] text-[#5F5A52]">{cur.kind}{cur.key.includes(':') ? '' : ' · cena iz cenovnika (Ploče)'}</div></div>
            <div className="flex flex-col gap-[4px] text-[13px] text-[#5F5A52]">Fajl teksture
              <span className="flex gap-[8px] items-center">
                <span className="flex-1 text-[13px] leading-[normal] font-mono text-[#1C1B19] py-[9px] px-[10px] border border-[#DDD8CE] rounded-[6px] overflow-hidden text-ellipsis whitespace-nowrap">{files[cur.key]?.name ?? look.file?.replace('/textures/', '') ?? 'jednobojna (bez slike)'}</span>
                <label className="text-[13px] min-h-[40px] py-0 px-[12px] rounded-[6px] border border-[#1C1B19] bg-white text-[#1C1B19] inline-flex items-center cursor-pointer">Otpremi
                  <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={e => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    setFiles(x => ({ ...x, [cur.key]: f }));
                    put({ file: f.name, ...(look.license === 'none' ? { license: 'check' as License } : {}), ...(look.repeat ? {} : { repeat: { w: 1400, h: 2800 } }), ...(look.grain === 'none' && !cur.key.includes(':') ? { grain: 'length' as const } : {}) });
                  }} /></label>
              </span>
            </div>
            <div className="grid grid-cols-[1fr_1fr] gap-[8px]">
              <label className="flex flex-col gap-[4px] text-[13px] text-[#5F5A52]"><span className="flex items-center">Uzorak (mm)<Tip k="library.repeat" align="right" /></span>
                <Input key={cur.key + repeatText} type="text" aria-label="Uzorak (mm)" defaultValue={repeatText} placeholder="1400 × 2800"
                  onBlur={e => { const [w, h] = e.target.value.split(/[x×*,\s]+/).map(Number).filter(n => n > 0); if (w && h) put({ repeat: { w, h } }); }}
                  className="h-auto border-border px-2.5 py-[9px] font-mono text-[14px]" /></label>
              <label className="flex flex-col gap-[4px] text-[13px] text-[#5F5A52]">Šara
                <Select value={look.grain} onValueChange={v => put({ grain: v as MaterialLook['grain'] })}>
                  <SelectTrigger aria-label="Šara" className={SEL}><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="length">Po dužini ploče</SelectItem><SelectItem value="none">Bez šare</SelectItem></SelectContent>
                </Select></label>
            </div>
            <div className="flex flex-col gap-[6px] text-[13px] text-[#5F5A52]">Površina
              <SegmentedControl label="Površina" className="grid grid-cols-3 gap-[3px] rounded-lg bg-background p-[3px]" value={look.finish} onChange={f => put({ finish: f })}
                itemClass="min-h-[34px] rounded-md border-0 bg-transparent text-[13px] text-muted-foreground data-[state=on]:bg-white data-[state=on]:font-semibold data-[state=on]:text-foreground data-[state=on]:shadow-[0_1px_3px_rgba(0,0,0,0.12)]"
                options={(['matte', 'satin', 'gloss'] as Finish[]).map(f => [f, FINISH_NAME[f]] as const)} />
            </div>
            <label className="flex flex-col gap-[4px] text-[13px] text-[#5F5A52]">Izvor i licenca teksture
              <Select value={look.license} onValueChange={v => put({ license: v as License })}>
                <SelectTrigger aria-label="Izvor i licenca teksture" className={SEL}><SelectValue /></SelectTrigger>
                <SelectContent>{LICENSES.map(([v, t]) => <SelectItem key={v} value={v}>{t}</SelectItem>)}</SelectContent>
              </Select></label>
            <div className={cn('text-[13px] leading-[1.5] py-[10px] px-[12px] rounded-[8px]', (look.license === 'check' ? 'bg-warn-soft text-warn-ink' : 'bg-[#F3F1EC] text-[#3D3A35]'))}>{LICENSE_NOTE[look.license]}{look.source ? ` Izvor: ${look.source}.` : ''}</div>
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
    <div className="flex flex-col gap-[16px]">
      <label className={cn(CARD, 'flex flex-wrap items-center gap-[12px] py-[14px] px-[16px] text-[14px]')}><strong>Podrazumevano za nove projekte</strong>
        <Select value={ws.opening} onValueChange={v => { const k = v as OpeningKind; put({ opening: k, openingOff: ws.openingOff.filter(x => x !== k) }); }}>
          <SelectTrigger aria-label="Podrazumevano za nove projekte" className={SEL}><SelectValue /></SelectTrigger>
          <SelectContent>{OCARDS.filter(o => o[0] !== 'gola').map(([k, t]) => <SelectItem key={k} value={k}>{t}</SelectItem>)}</SelectContent>
        </Select>
        <span className="text-[#5F5A52] text-[13px]">Projekat i pojedinačni element mogu da promene.</span>
      </label>
      <div className="grid grid-cols-[repeat(auto-fill,_minmax(300px,_1fr))] gap-[16px]">
        {OCARDS.map(([k, title, sub, d, sw, facts]) => {
          const gola = k === 'gola', def = ws.opening === k, on = !gola && !ws.openingOff.includes(k);
          return (
            <section key={k} aria-label={title} className={cn('bg-white rounded-[10px] py-[14px] px-[16px] flex flex-col gap-[8px]', def ? 'border-2 border-[#2E6B4E]' : 'border border-[#DDD8CE]', gola && 'opacity-[0.65]')}>
              <div className="flex items-center gap-[12px]">
                <svg width="64" height="48" viewBox="0 0 64 48" aria-hidden="true"><rect x="4" y="4" width="56" height="40" rx="2" fill="#EADBC4" stroke="#1C1B19" strokeWidth="1.4" /><path d={d} fill="none" stroke="#1C1B19" strokeWidth={sw} strokeLinecap="round" /></svg>
                <div className="flex-1"><h2 className="m-0 text-[17px]">{title}</h2><div className="text-[12px] text-[#5F5A52]">{sub}</div></div>
              </div>
              {facts.map(([a, b]) => <div key={a} className="flex justify-between gap-[12px] text-[13px] border-t border-t-[#EFEBE3] pt-[8px]"><span className="text-[#5F5A52]">{a}</span><span className="text-right">{b}</span></div>)}
              <label className="flex items-center gap-[10px] min-h-[40px] text-[14px]">
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
  const note = cn('flex-[1_1_320px]', CARD, 'py-[14px] px-[16px] text-[13px] leading-[1.55] text-[#3D3A35]');
  return (
    <div className="flex flex-col gap-[16px]">
      <div className="flex flex-wrap gap-[16px]">
        <div className={cn(note)}><strong className="text-[#1C1B19]">Generički modeli, bez brenda.</strong> Biblioteku održava {BRAND.name} tim i ista je za sve radionice. Aparat se sam smešta u nišu elementa (tačka umetanja: donji levi zadnji ugao). Prikazuju se samo u realnom 3D; u 2D, nacrtima i krojnoj listi ostaje simbol.</div>
        <div className={cn(note)}><strong className="text-[#1C1B19]">Pravila licenci.</strong> Prihvatamo: CC0, kupljenu licencu za komercijalnu aplikaciju, sopstvene modele. Ne prihvatamo: CC-BY bez navođenja autora, nekomercijalne (NC) i „editorial only". Zasluge se ispisuju automatski na stranici „O aplikaciji".</div>
      </div>
      <div role="group" aria-label="Podrazumevana završna obrada aparata" className="flex flex-wrap items-center gap-[8px] text-[14px]">Podrazumevana obrada u projektima:
        {FINS.map(([k, t, c]) => {
          const on = ws.applianceFinish === k;
          return <Button key={k} variant="outline" size="none" aria-pressed={on} onClick={() => put({ applianceFinish: k })} className="min-h-9 gap-1.5 rounded-[18px] px-3 py-1.5 text-[13px] font-normal aria-pressed:border-foreground aria-pressed:bg-dark aria-pressed:text-white"><span className="size-3.5 rounded-full border border-solid border-muted-2" style={{ background: c }} />{t}</Button>;
        })}
      </div>
      <section aria-label="Aparati" className={cn(CARD, 'p-[8px_16px_16px]')}>
        <div className="overflow-x-auto">
          <table className="w-full [border-collapse:collapse] text-[14px] min-w-[820px]">
            <thead><tr className="text-left text-[#5F5A52] text-[13px]"><th className="p-[12px_8px_12px_0] font-medium">Model</th><th className="py-[12px] px-[8px] font-medium">Niša / mere (mm)</th><th className="py-[12px] px-[8px] font-medium">Obrade</th><th className="py-[12px] px-[8px] font-medium text-right">GLB</th><th className="py-[12px] px-[8px] font-medium">Licenca · izvor</th><th className="p-[12px_0_12px_8px] font-medium">Status</th></tr></thead>
            <tbody>
              {appliances.modeli.map(a => (
                <tr key={a.id} className="border-t border-t-[#EEEAE2]">
                  <td className="p-[8px_8px_8px_0]"><div className="font-semibold">{a.name}</div><div className="text-[12px] text-[#5F5A52]">{CAT_NAME[a.category] ?? a.category}</div></td>
                  <td className="p-[8px] font-mono text-[13px]">{a.niche.replace(/×/g, ' × ').replace(', ', ' · ')}</td>
                  <td className="p-[8px] text-[13px]">{a.finishes.map(f => FIN_NAME[f] ?? f).join(' · ')}</td>
                  <td className="p-[8px] text-right font-mono text-[13px]">—</td>
                  <td className="p-[8px] text-[13px]">{a.license} · {a.source}</td>
                  {/* The GLB files do not exist yet (fixtures/aparati.json "opis"): the realistic 3D draws a generic box. */}
                  <td className="p-[8px_0_8px_8px]"><span title="Model još ne postoji; u realnom 3D se crta generičko telo" className="inline-block text-[12px] py-[3px] px-[8px] rounded-[10px] bg-[#E2EFE6] text-[#1D4632]">Planiran</span></td>
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
    <div className="flex flex-col gap-[16px]">
      <p className="m-0 text-[14px] text-[#5F5A52] leading-[1.5]">Gotovi elementi koji se vide u biblioteci Prostora. Svaki je podrazumevana konfiguracija parametarskog elementa — širina, ručke i materijali se menjaju u projektu. Sakrij ono što radionica ne pravi.</p>
      {CATALOG_GROUPS.map(g => {
        const list = items.filter(l => l.group === g);
        return list.length ? (
          <section key={g} aria-label={g} className={cn(CARD, 'py-[14px] px-[16px] flex flex-col gap-[10px]')}>
            <h2 className="m-0 text-[16px]">{g} <span className="text-[13px] leading-[normal] font-mono text-[#8A8378]">{list.length}</span></h2>
            <div className="grid grid-cols-[repeat(auto-fill,_minmax(150px,_1fr))] gap-[8px]">
              {list.map(l => {
                const on = !ws.hiddenCatalog.includes(l.key), t = thumbOf(l);
                return (
                  <label key={l.key} className={cn('flex flex-col items-center gap-[4px] py-[10px] px-[8px] rounded-[8px] cursor-pointer', (on ? 'border border-[#DDD8CE] bg-white' : 'border border-dashed border-[#BDB6AA] bg-[#F7F5F0] opacity-[0.7]'))}>
                    <FrontThumb el={t} opening={opening} />
                    <span className="text-[13px] font-semibold text-center">{l.name}</span>
                    <span className="text-[12px] leading-[normal] font-mono text-[#5F5A52]">{l.width} × {t.height} × {l.template?.depth ?? (l.kind === 'wall' ? 320 : 560)}</span>
                    <span className="flex items-center gap-[6px] text-[12px]">
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
