// Projekti (design/Projekti.dc.html, docs/TOK_PROJEKTA.md): the start screen after login; logo in every header.
// "Nastavi gde si stao" = the last edited project, opened on the screen it was left on; cards with progress, filters, search, order.
import { projectProgress, roomWalls, wallGeoms, type Project, type ProjectProgress } from 'engine';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Tip, useHelp } from './help';
import { editedText, useProjects, type StoredProject } from './projects';
import { useQuotes } from './quotes';
import { useProject } from './store';
import { sx } from './ui';

type Filter = 'all' | 'run' | 'offer' | 'done';
type Sort = 'edited' | 'pct' | 'name';
const SHAPE = ['', 'prava', 'ugaona', 'U oblik'];
const rsd = (p: number) => `${Math.round(p / 100).toLocaleString('sr-Latn')} RSD`;

/** "Kupac: Petrović · ugaona, 3200 × 2400": the walls that carry units, by inner length. */
function meta(p: Project) {
  const g = wallGeoms(p.room), used = roomWalls(p.room).filter(w => p.elements.some(e => e.wallId === w.id)).map(w => g[w.id].inner);
  if (used.length === 2) used.sort((a, b) => b - a); // L: the longer wall first, as the design ("3200 × 2400")
  const shape = used.length ? `${SHAPE[used.length] ?? `${used.length} zida`}, ${used.join(' × ')}` : 'prazan prostor';
  return p.customer ? `Kupac: ${p.customer} · ${shape}` : shape;
}
const isDone = (p: Project, pr: ProjectProgress) => pr.percent >= 100 || !!p.marks?.offerAccepted;
const onOffer = (pr: ProjectProgress) => pr.steps[5].status !== 'todo';

/** Step dots (design dotsFor): done = tick, partial = ring with the number, not started = outline. */
function Dots({ pr, big, dark }: { pr: ProjectProgress; big?: boolean; dark?: boolean }) {
  const cur = pr.steps.findIndex(s => s.status !== 'done');
  const sz = big ? 24 : 18;
  return <>
    {pr.steps.map((s, i) => {
      const part = s.status === 'partial', done = s.status === 'done', pct = Math.round(s.part * 100), here = i === cur && !done;
      let dot = `width: ${sz}px; height: ${sz}px; border-radius: 50%; flex: none; display: inline-flex; align-items: center; justify-content: center; font: 600 ${big ? 12 : 10}px var(--font-mono); box-sizing: border-box; `;
      let inner = 'display: inline-flex; align-items: center; justify-content: center; border-radius: 50%; ';
      if (done) { dot += 'background: #E2804D; color: #1C1B19'; inner += 'width: 100%; height: 100%'; }
      else if (part) {
        dot += `background: conic-gradient(#E2804D 0 ${pct}%, ${dark ? '#6B665E' : '#DDD8CE'} ${pct}% 100%)`;
        inner += `width: ${sz - 6}px; height: ${sz - 6}px; ` + (dark && here ? 'background: #F3F1EC; color: #1C1B19' : dark ? 'background: #1C1B19; color: #FFFFFF' : 'background: #FFFFFF; color: #1C1B19');
      } else { dot += `border: 1.5px solid ${dark ? '#6B665E' : '#BDB6AA'}; color: ${dark ? '#BDB6AA' : '#8A8378'}`; inner += 'width: 100%; height: 100%'; }
      const title = `${i + 1} ${s.name} — ${done ? 'završeno' : part ? `u toku ${pct} %` : 'nije započeto'}`;
      const mark = <span style={sx(dot)}><span style={sx(inner)}>{done
        ? <svg width={big ? 12 : 10} height={big ? 12 : 10} viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 6.2l2.3 2.3 4.7-5" fill="none" stroke="#1C1B19" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" /></svg>
        : i + 1}</span></span>;
      const line = i < 5 && <span aria-hidden="true" style={sx(`width: ${big ? 16 : 10}px; height: 2px; flex: none; border-radius: 1px; background: ${done ? '#E2804D' : dark ? '#4A4743' : '#DDD8CE'}`)} />;
      return big
        ? <span key={s.key} style={sx('display: contents')}>
          <span title={title} style={sx('display: inline-flex; align-items: center; gap: 6px; padding: 3px 8px 3px 3px; border-radius: 14px; ' + (here ? 'background: #F3F1EC; color: #1C1B19' : ''))}>{mark}
            <span style={sx('font-size: 13px; ' + (here ? 'color: #1C1B19; font-weight: 500' : done ? 'color: #F3F1EC' : 'color: #8A8378'))}>{s.name}</span></span>{line}</span>
        : <span key={s.key} style={sx('display: contents')}><span role="listitem" title={title} aria-label={title} style={sx('display: inline-flex')}>{mark}</span>{line}</span>;
    })}
  </>;
}

export function ProjectsPage() {
  const list = useProjects(s => s.list);
  const quotes = useQuotes(s => s.byProject);
  const current = useProject(s => s.project);
  const setProject = useProject(s => s.setProject);
  const navigate = useNavigate();
  const [help, toggleHelp] = useHelp();
  const [filter, setFilter] = useState<Filter>('all');
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<Sort>('edited');

  const all = Object.values(list).map(s => ({ ...s, pr: projectProgress(s.project) }))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const pass = (f: Filter, x: (typeof all)[number]) => f === 'all' || (f === 'run' && !isDone(x.project, x.pr)) || (f === 'offer' && onOffer(x.pr) && !isDone(x.project, x.pr)) || (f === 'done' && isDone(x.project, x.pr));
  const needle = q.trim().toLowerCase();
  const shown = all.filter(x => pass(filter, x) && (!needle || `${x.project.name} ${x.project.customer ?? ''}`.toLowerCase().includes(needle)))
    .sort((a, b) => (sort === 'pct' ? b.pr.percent - a.pr.percent : sort === 'name' ? a.project.name.localeCompare(b.project.name, 'sr') : 0));
  const last = all[0];
  const open = (s: StoredProject) => {
    if (current?.id !== s.project.id) setProject(s.project);
    navigate(s.resume?.path ?? '/projekat');
  };
  const next = (pr: ProjectProgress) => `Sledeće: ${pr.next}`;
  const fSt = (on: boolean) => 'font: inherit; font-size: 14px; min-height: 38px; padding: 0 14px; border: 0; border-radius: 6px; cursor: pointer; ' + (on ? 'background: #FFFFFF; color: #1C1B19; font-weight: 600; box-shadow: 0 1px 3px rgba(0,0,0,0.12)' : 'background: transparent; color: #3D3A35');
  const helpSt = 'font: inherit; font-size: 13px; display: inline-flex; align-items: center; gap: 6px; padding: 7px 12px; min-height: 36px; border-radius: 6px; cursor: pointer; '
    + (help ? 'border: 1px solid #E2804D; background: #E2804D; color: #1C1B19; font-weight: 600' : 'border: 1px solid #5F5A52; background: transparent; color: #F3F1EC');
  const navA = (on: boolean) => 'padding: 8px 14px; border-radius: 6px; text-decoration: none; font-size: 14px; ' + (on ? 'background: #F3F1EC; color: #1C1B19' : 'color: #F3F1EC');

  return (
    <div className={help ? 'k-helpon' : 'k-helpoff'} style={sx('color: #1C1B19; background: #F3F1EC; min-height: 100vh; display: flex; flex-direction: column')}>
      <header style={sx('display: flex; flex-wrap: wrap; align-items: center; gap: 16px; padding: 10px 20px; background: #1C1B19; color: #F3F1EC')}>
        <Link to="/projekti" aria-label="Kroj — svi projekti" style={sx('display: flex; align-items: center; gap: 10px; color: inherit; text-decoration: none')}>
          <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true"><rect x="3" y="3" width="22" height="22" rx="3" fill="none" stroke="#F3F1EC" strokeWidth="2" /><path d="M3 11h22M11 11v14" stroke="#E2804D" strokeWidth="2" /></svg>
          <span style={sx('font-weight: 700; font-size: 18px; letter-spacing: 0.02em')}>Kroj</span>
        </Link>
        <nav aria-label="Glavni meni" style={sx('display: flex; gap: 4px; margin-left: 8px')}>
          <Link to="/projekti" aria-current="page" style={sx(navA(true))}>Projekti</Link>
          <Link to="/admin/cenovnik" style={sx(navA(false))}>Cenovnik</Link>
          <Link to="/admin/biblioteka" style={sx(navA(false))}>Materijali i katalog</Link>
          <Link to="/admin/standardi" style={sx(navA(false))}>Podešavanja</Link>
        </nav>
        <div style={sx('margin-left: auto; display: flex; align-items: center; gap: 12px')}>
          <span style={sx('font-size: 13px; color: #D8D3C9')}>[Naziv radionice]</span>
          <button type="button" aria-pressed={help} onClick={toggleHelp} style={sx(helpSt)} title="Uključi ili isključi objašnjenja (oznake i) na svim ekranima">
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.5" /><path d="M8 7v4.5M8 4.6v.1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>Pomoć
          </button>
        </div>
      </header>

      <main style={sx('max-width: 1280px; width: 100%; box-sizing: border-box; margin: 0 auto; padding: 28px 24px 40px; display: flex; flex-direction: column; gap: 22px')}>
        <div style={sx('display: flex; flex-wrap: wrap; align-items: flex-end; gap: 12px')}>
          <div>
            <h1 style={sx('margin: 0; font-size: 30px')}>Projekti</h1>
            <p style={sx('margin: 4px 0 0; color: #5F5A52; font-size: 15px')}>Nastavi tamo gde si stao — svaki projekat pamti korak i ekran na kom si bio.</p>
          </div>
          <Link to="/" style={sx('margin-left: auto; display: inline-flex; align-items: center; gap: 8px; min-height: 46px; padding: 0 18px; border-radius: 6px; background: #B4440E; color: #FFFFFF; text-decoration: none; font-weight: 600; font-size: 15px')}>
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 3v10M3 8h10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>Novi projekat</Link>
        </div>

        {last && (
          <section aria-label="Poslednji projekat" className="pj-last" style={sx('background: #1C1B19; color: #F3F1EC; border-radius: 14px; padding: 22px 24px; display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 18px 28px; align-items: center')}>
            <div style={sx('display: flex; flex-direction: column; gap: 10px; min-width: 0')}>
              <div style={sx('font-size: 12px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #E2804D; display: flex; align-items: center')}>Nastavi gde si stao
<Tip k="projects.resume" align="right" />
              </div>
              <h2 style={sx('margin: 0; font-size: 24px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap')}>{last.project.name}</h2>
              <div style={sx('font-size: 14px; color: #D8D3C9')}>{meta(last.project)} · menjano {editedText(last.updatedAt)}</div>
              <div style={sx('display: flex; align-items: center; gap: 4px; flex-wrap: wrap; margin-top: 4px')}><Dots pr={last.pr} big dark /></div>
            </div>
            <div style={sx('display: flex; flex-direction: column; align-items: flex-end; gap: 10px')}>
              <div style={sx('display: flex; align-items: baseline; gap: 6px')}><span style={sx('font: 600 40px var(--font-sans); color: #FFFFFF; white-space: nowrap')}>{last.pr.percent} %</span><span style={sx('font-size: 14px; color: #D8D3C9')}>urađeno</span></div>
              <div role="progressbar" aria-label="Urađeno" aria-valuemin={0} aria-valuemax={100} aria-valuenow={last.pr.percent} style={sx('width: 220px; height: 6px; border-radius: 3px; background: #3A3835; overflow: hidden')}><div style={sx(`width: ${last.pr.percent}%; height: 100%; background: #E2804D`)} /></div>
              <button type="button" onClick={() => open(last)} style={sx('font: inherit; display: inline-flex; align-items: center; gap: 8px; min-height: 48px; padding: 0 20px; border-radius: 8px; border: 0; background: #E2804D; color: #1C1B19; font-weight: 600; font-size: 15px; cursor: pointer')}>
                Nastavi: {last.resume?.label ?? 'Prostor'} <span aria-hidden="true">→</span></button>
              <span style={sx('font-size: 12px; color: #BDB6AA')}>{next(last.pr)}</span>
            </div>
          </section>
        )}

        <div style={sx('display: flex; flex-wrap: wrap; align-items: center; gap: 10px')}>
          <div role="tablist" aria-label="Filter projekata" style={sx('display: flex; gap: 3px; padding: 3px; background: #E7E2D8; border-radius: 8px; flex-wrap: wrap')}>
            {([['all', 'Svi'], ['run', 'U toku'], ['offer', 'Na ponudi'], ['done', 'Završeni']] as const).map(([f, t]) => (
              <button key={f} type="button" role="tab" aria-selected={filter === f} onClick={() => setFilter(f)} style={sx(fSt(filter === f))}>{t}<span style={sx('margin-left: 6px; font: 12px var(--font-mono); opacity: 0.7')}>{all.filter(x => pass(f, x)).length}</span></button>
            ))}
          </div>
          <label style={sx('margin-left: auto; display: flex; align-items: center; gap: 8px; background: #FFFFFF; border: 1px solid #DDD8CE; border-radius: 8px; padding: 0 12px; min-height: 42px; min-width: 260px')}>
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M7 2.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9zM10.5 10.5L14 14" fill="none" stroke="#5F5A52" strokeWidth="1.6" strokeLinecap="round" /></svg>
            <span className="sr-only">Traži projekat</span>
            <input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Traži po kupcu ili nazivu" style={sx('flex: 1; min-width: 0; border: 0; outline: none; font: inherit; font-size: 14px; background: transparent')} />
          </label>
          <label style={sx('display: flex; align-items: center; gap: 8px; font-size: 13px; color: #5F5A52')}>Redosled
            <select value={sort} onChange={e => setSort(e.target.value as Sort)} style={sx('font: inherit; font-size: 14px; min-height: 42px; padding: 0 8px; border: 1px solid #DDD8CE; border-radius: 8px; background: #FFFFFF; color: #1C1B19')}>
              <option value="edited">Poslednje menjano</option><option value="pct">Najviše urađeno</option><option value="name">Po nazivu</option>
            </select>
          </label>
        </div>

        <div style={sx('display: grid; grid-template-columns: repeat(auto-fill, minmax(min(360px, 100%), 1fr)); gap: 16px')}>
          {shown.map(x => {
            const done = isDone(x.project, x.pr), issued = quotes[x.project.id];
            const badge = done ? 'Završen' : x.project.marks?.offerSent ? 'Poslato' : 'U toku';
            return (
              <article key={x.project.id} aria-label={x.project.name} style={sx('background: #FFFFFF; border: 1px solid #DDD8CE; border-radius: 12px; padding: 18px; display: flex; flex-direction: column; gap: 12px')}>
                <div style={sx('display: flex; align-items: flex-start; gap: 10px')}>
                  <div style={sx('flex: 1; min-width: 0')}>
                    <h3 style={sx('margin: 0; font-size: 17px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap')}>{x.project.name}</h3>
                    <div style={sx('font-size: 13px; color: #5F5A52; margin-top: 2px')}>{meta(x.project)}</div>
                  </div>
                  <span style={sx('font-size: 12px; padding: 3px 9px; border-radius: 10px; white-space: nowrap; ' + (done ? 'background: #E4F1E6; color: #1F5A2A' : 'background: #FBE3D3; color: #7C2D0A'))}>{badge}</span>
                </div>
                <div style={sx('display: flex; align-items: center; gap: 10px')}>
                  <div role="progressbar" aria-label="Urađeno" aria-valuemin={0} aria-valuemax={100} aria-valuenow={x.pr.percent} style={sx('flex: 1; height: 6px; border-radius: 3px; background: #EEEAE2; overflow: hidden')}><div style={sx(`width: ${x.pr.percent}%; height: 100%; background: ${done ? '#2F7A3E' : '#E2804D'}`)} /></div>
                  <span style={sx('font: 600 14px var(--font-mono); min-width: 44px; text-align: right')}>{x.pr.percent} %</span>
                </div>
                <div role="list" aria-label="Koraci" style={sx('display: flex; align-items: center; gap: 3px')}><Dots pr={x.pr} /></div>
                <div style={sx('font-size: 13px; color: #3D3A35')}>{next(x.pr)}<div style={sx('font-size: 12px; color: #5F5A52; margin-top: 2px')}>Menjano {editedText(x.updatedAt)}</div></div>
                <div style={sx('display: flex; align-items: center; gap: 8px; border-top: 1px solid #EEEAE2; padding-top: 12px')}>
                  <span style={sx('font: 600 14px var(--font-mono); color: #1C1B19; white-space: nowrap')}>{issued ? rsd(issued.total) : '—'}</span>
                  <button type="button" onClick={() => open(x)} style={sx('font: inherit; margin-left: auto; white-space: nowrap; display: inline-flex; align-items: center; gap: 6px; min-height: 40px; padding: 0 14px; border-radius: 6px; font-size: 14px; font-weight: 600; cursor: pointer; ' + (done ? 'border: 1px solid #1C1B19; background: #FFFFFF; color: #1C1B19' : 'border: 0; background: #1C1B19; color: #FFFFFF'))}>
                    {done ? 'Otvori' : `Nastavi: ${(x.resume?.label ?? 'Prostor').split(' · ')[0]}`} <span aria-hidden="true">→</span></button>
                </div>
              </article>
            );
          })}
        </div>
        {!shown.length && <p style={sx('margin: 0; font-size: 14px; color: #5F5A52')}>Nema projekata za ovaj filter. <Link to="/">Napravi novi projekat</Link>.</p>}
      </main>
    </div>
  );
}
