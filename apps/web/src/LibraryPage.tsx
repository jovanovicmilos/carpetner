// Admin · Materijali, ručke, aparati (design/Biblioteka.dc.html, docs/3D.md "Materijali"), tab Materijali: how each board,
// worktop and floor looks in the realistic 3D — texture file (upload), real size of one image, grain, finish, licence.
// Changes are a draft until "Sačuvaj izmene", like Cenovnik.
// shortcut: tabs Ručke i otvaranje / Aparati / Katalog are not built yet (handles are set per project; no appliance models).
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { AdminLayout } from './AdminLayout';
import { Tip } from './help';
import { FLOORS, FRONTS, materialColor, WTOPS } from './look';
import {
  FINISH_NAME, LICENSE_NOTE, LICENSES, lookOf, putTexture, textureUrl, useLooks, type Finish, type License, type MaterialLook,
} from './materialLooks';
import { useProject } from './store';
import { sx } from './ui';

interface Row { key: string; name: string; code: string; kind: string; color: string }
const licStyle = (k: License) => 'display: inline-block; font-size: 12px; padding: 3px 8px; border-radius: 10px; ' + (k === 'check' ? 'background: #FBE3D3; color: #7C2D0A' : k === 'none' ? 'background: #F3F1EC; color: #5F5A52' : 'background: #E4F1E6; color: #1F5A2A');
const tabSt = (on: boolean) => 'font: inherit; font-size: 14px; padding: 10px 14px; min-height: 44px; border: 0; border-bottom: 3px solid ' + (on ? '#B4440E' : 'transparent') + '; background: transparent; cursor: pointer; color: ' + (on ? '#1C1B19; font-weight: 600' : '#5F5A52');
const segSt = (on: boolean) => 'font: inherit; font-size: 13px; min-height: 34px; border: 0; border-radius: 6px; cursor: pointer; ' + (on ? 'background: #FFFFFF; color: #1C1B19; font-weight: 600; box-shadow: 0 1px 3px rgba(0,0,0,0.12)' : 'background: transparent; color: #5F5A52');

export function LibraryPage() {
  const project = useProject(s => s.project);
  const { looks, save } = useLooks();
  const [draft, setDraft] = useState(looks);
  const [files, setFiles] = useState<Record<string, File>>({});
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [sel, setSel] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

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
    save(draft); setFiles({}); setSaved(true);
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
            <Link to="/3d" style={sx('display: inline-flex; align-items: center; font-size: 14px; padding: 0 14px; min-height: 44px; border-radius: 6px; border: 1px solid #DDD8CE; background: #FFFFFF; color: #1C1B19; text-decoration: none')}>Pogledaj u 3D</Link>
            <button type="button" onClick={commit} style={sx('font: inherit; font-size: 14px; font-weight: 600; padding: 10px 14px; min-height: 44px; border-radius: 6px; border: 0; background: #B4440E; color: #FFFFFF; cursor: pointer')}>Sačuvaj izmene</button>
          </div>
        </div>

        <div role="tablist" aria-label="Biblioteka izgleda" style={sx('display: flex; flex-wrap: wrap; gap: 4px; border-bottom: 1px solid #DDD8CE')}>
          {([['Materijali', String(rows.length), true], ['Ručke i otvaranje', '4', false], ['Aparati (3D modeli)', '15', false], ['Katalog elemenata', '32/32', false]] as const).map(([t, n, on]) => (
            <button key={t} type="button" role="tab" aria-selected={on} aria-disabled={!on} title={on ? undefined : 'Uskoro'} style={sx(tabSt(on))}>{t}<span style={sx("margin-left: 6px; font: 12px var(--font-mono); color: #8A8378")}>{n}</span></button>
          ))}
        </div>

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
                <input key={cur.key + repeatText} type="text" aria-label="Uzorak (mm)" defaultValue={repeatText} placeholder="1400 × 2800"
                  onBlur={e => { const [w, h] = e.target.value.split(/[x×*,\s]+/).map(Number).filter(n => n > 0); if (w && h) put({ repeat: { w, h } }); }}
                  style={sx("font: 14px var(--font-mono); padding: 9px 10px; border: 1px solid #DDD8CE; border-radius: 6px")} /></label>
              <label style={sx('display: flex; flex-direction: column; gap: 4px; font-size: 13px; color: #5F5A52')}>Šara
                <select value={look.grain} onChange={e => put({ grain: e.target.value as MaterialLook['grain'] })} style={sx('font: inherit; font-size: 14px; min-height: 40px; padding: 0 8px; border: 1px solid #DDD8CE; border-radius: 6px; background: #FFFFFF')}>
                  <option value="length">Po dužini ploče</option><option value="none">Bez šare</option>
                </select></label>
            </div>
            <div role="group" aria-label="Površina" style={sx('display: flex; flex-direction: column; gap: 6px; font-size: 13px; color: #5F5A52')}>Površina
              <div style={sx('display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 3px; padding: 3px; background: #F3F1EC; border-radius: 8px')}>
                {(['matte', 'satin', 'gloss'] as Finish[]).map(f => <button key={f} type="button" aria-pressed={look.finish === f} onClick={() => put({ finish: f })} style={sx(segSt(look.finish === f))}>{FINISH_NAME[f]}</button>)}
              </div>
            </div>
            <label style={sx('display: flex; flex-direction: column; gap: 4px; font-size: 13px; color: #5F5A52')}>Izvor i licenca teksture
              <select value={look.license} onChange={e => put({ license: e.target.value as License })} style={sx('font: inherit; font-size: 14px; min-height: 40px; padding: 0 8px; border: 1px solid #DDD8CE; border-radius: 6px; background: #FFFFFF')}>
                {LICENSES.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
              </select></label>
            <div style={sx('font-size: 13px; line-height: 1.5; padding: 10px 12px; border-radius: 8px; ' + (look.license === 'check' ? 'background: #FBE3D3; color: #7C2D0A' : 'background: #F3F1EC; color: #3D3A35'))}>{LICENSE_NOTE[look.license]}{look.source ? ` Izvor: ${look.source}.` : ''}</div>
          </aside>
        </div>
      </div>
    </AdminLayout>
  );
}
