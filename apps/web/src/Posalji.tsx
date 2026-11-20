// Customer step 5 "Stolar" (design/screens/KupacPosalji.html): pick up to 3 workshops, message, room photos, Kroj Plus and pay.
// The header is the new role stepper (PlannerHeader, step 5); the reference still draws the older 5-step bar.
// shortcut: workshops are the design's placeholders and filters, photos and payment are UI only; real directory, upload and
// billing come with apps/api (billing provider still open, CLAUDE.md).
import { useState } from 'react';
import { Link, Navigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { PlannerHeader } from './Planner';
import { kitchenSummary } from './Pregled';
import { useProject } from './store';

const SHOPS = [
  { id: 'a', name: '[Radionica A]', where: 'Novi Sad · radi Novi Sad, Sremski Karlovci, Futog', lead: '4–6 nedelja', extra: 'Merenje i montaža', jobs: '12 kuhinja u Kroju', featured: true, g: ['#C49A6C', '#EADBC4', '#FFFFFF', '#3A2A1F'] },
  { id: 'b', name: '[Radionica B]', where: 'Novi Sad · radi celu Bačku', lead: '6–8 nedelja', extra: 'Merenje i montaža', jobs: '5 kuhinja u Kroju', featured: false, g: ['#FFFFFF', '#F3F1EC', '#C49A6C', '#DDD8CE'] },
  { id: 'c', name: '[Radionica C]', where: 'Temerin · 15 km', lead: '3–5 nedelja', extra: 'Montaža uz doplatu', jobs: 'novo u Kroju', featured: false, g: ['#6B4A33', '#C49A6C', '#EADBC4', '#2A3A31'] },
  { id: 'd', name: '[Radionica D]', where: 'Inđija · 40 km', lead: '5–7 nedelja', extra: 'Merenje i montaža', jobs: '8 kuhinja u Kroju', featured: false, g: ['#EADBC4', '#FFFFFF', '#6B4A33', '#C49A6C'] },
];
const SELECT = 'min-h-11 rounded-lg border border-solid border-line-strong bg-white px-2.5 font-sans text-[15px] text-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary';

export function Posalji() {
  const project = useProject(s => s.project);
  const [sel, setSel] = useState<string[]>(['a', 'b']);
  if (!project) return <Navigate to="/kupac" replace />;
  const { shape, size, floor, uppers, look } = kitchenSummary(project);
  const n = sel.length;
  const toggle = (id: string) => setSel(s => (s.includes(id) ? s.filter(x => x !== id) : [...s, id]));

  return (
    <div className="flex min-h-[900px] flex-col bg-background text-foreground">
      <PlannerHeader project={project} role="kupac" step={5} live={false}
        right={<div className="flex items-center gap-2.5 justify-self-end"><span className="text-[13px] text-[#D8D3C9]">Sačuvano</span><Link to="/prijava" className="text-[14px] text-background hover:text-white">Ana P.</Link></div>} />
      <main className="mx-auto box-border grid w-full max-w-[1280px] grid-cols-[minmax(0,1fr)_400px] items-start gap-6 px-5 pt-6 pb-10">
        <section aria-labelledby="dir-h" className="flex min-w-0 flex-col gap-3.5">
          <div>
            <h1 id="dir-h" className="m-0 text-[28px]">Izaberi stolare</h1>
            <p className="mt-1 mb-0 text-[15px] text-muted-foreground">Do 3 radionice. Svaka odmah dobija tvoj projekat otvoren — ništa ne moraš da objašnjavaš ponovo.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <label className="flex flex-col gap-1 text-[13px] text-muted-foreground">Mesto
              <select className={cn(SELECT, 'min-w-[180px]')}><option>Novi Sad i okolina</option><option>Beograd</option><option>Niš</option></select></label>
            <label className="flex flex-col gap-1 text-[13px] text-muted-foreground">Rok izrade
              <select className={cn(SELECT, 'min-w-[160px]')}><option>Bilo koji</option><option>do 4 nedelje</option><option>do 8 nedelja</option></select></label>
            <label className="mt-[18px] flex min-h-11 items-center gap-2 text-[14px]"><input type="checkbox" defaultChecked className="size-[18px] accent-primary" />Radi montažu</label>
            <span className="mt-[18px] ml-auto text-[14px] text-muted-foreground">{SHOPS.length} radionice u blizini</span>
          </div>
          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {SHOPS.map(w => {
              const on = sel.includes(w.id), dis = !on && n >= 3;
              return (
                <li key={w.id} className={cn('rounded-xl bg-white p-4', on ? 'border-2 border-solid border-primary' : 'border border-solid border-border')}>
                  <div className="grid grid-cols-[120px_minmax(0,1fr)_auto] items-start gap-4">
                    <div aria-hidden="true" className="grid h-[90px] w-[120px] grid-cols-2 gap-1">
                      {w.g.map((c, i) => <span key={i} className="rounded border border-solid border-border" style={{ background: c }} />)}
                    </div>
                    <div className="flex min-w-0 flex-col gap-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="m-0 text-[18px]">{w.name}</h2>
                        {w.featured && <span className="rounded-[10px] bg-wood-birch px-2 py-0.5 text-[12px] text-wood-bark">Istaknuto</span>}
                      </div>
                      <div className="text-[14px] text-ink-2">{w.where}</div>
                      <div className="flex flex-wrap gap-x-3.5 gap-y-1.5 text-[13px] text-muted-foreground">
                        <span>Rok: <strong className="font-semibold text-foreground">{w.lead}</strong></span><span>{w.extra}</span><span>{w.jobs}</span>
                      </div>
                      {/* shortcut: workshop profiles (ProfilRadionice) are a later step of the redesign port. */}
                      <a href="#" className="mt-0.5 inline-flex min-h-7 items-center text-[14px]">Profil i primeri radova</a>
                    </div>
                    <Button variant={null} size="none" aria-pressed={on} disabled={dis} onClick={() => toggle(w.id)}
                      className={cn('min-h-[46px] min-w-[120px] rounded-lg text-[15px] font-semibold disabled:opacity-100',
                        on ? 'border-2 border-solid border-primary bg-accent-soft text-accent-ink'
                          : dis ? 'cursor-not-allowed border border-solid border-border bg-background text-muted-2'
                            : 'border border-solid border-primary bg-white text-accent-ink')}>{on ? 'Izabrano' : 'Izaberi'}</Button>
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="m-0 text-[13px] text-muted-foreground">Redosled: najbliži prvo. „Istaknuto“ je plaćeno isticanje radionice — uvek je označeno.</p>
        </section>

        <aside aria-labelledby="send-h" className="sticky top-4 flex flex-col gap-4 rounded-xl border border-solid border-border bg-white p-5">
          <h2 id="send-h" className="m-0 text-[20px]">Slanje projekta</h2>
          <div className="grid grid-cols-[88px_minmax(0,1fr)] items-center gap-3">
            <svg viewBox="0 0 88 66" aria-hidden="true" className="h-[66px] w-[88px] rounded-md border border-solid border-border bg-[#FAF8F4]"><path d="M10 58V10H78" fill="none" stroke="#1C1B19" strokeWidth="3" /><path d="M11.5 11.5h64v12h-64zM11.5 23.5h12v34h-12z" fill="#EADBC4" stroke="#1C1B19" strokeWidth="0.8" /></svg>
            <div className="text-[14px] leading-[1.45]"><strong>{shape} {size}</strong><br /><span className="text-muted-foreground">{floor.length} donjih i visokih, {uppers.length} gornja · {look[0]}, {look[1]}</span></div>
          </div>
          <div>
            <div className="mb-1.5 text-[14px] font-semibold">Izabrano ({n} od 3)</div>
            {!n && <p className="m-0 text-[14px] text-muted-foreground">Izaberi bar jednog stolara sa liste.</p>}
            <ul className="m-0 flex list-none flex-col gap-1 p-0">
              {SHOPS.filter(w => sel.includes(w.id)).map(w => (
                <li key={w.id} className="flex items-center gap-2 text-[14px]"><svg width="14" height="14" viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 6.2l2.3 2.3 4.7-5" fill="none" stroke="#2E6B4E" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" /></svg>{w.name} — {w.where.split(' · ')[0]}</li>
              ))}
            </ul>
          </div>
          <label className="flex flex-col gap-1.5 text-[14px] font-semibold">Poruka stolaru (nije obavezno)
            <Textarea rows={3} placeholder="Npr. stari elementi se demontiraju, zid B nije ravan, voleo bih ugradnju u martu."
              className="min-h-0 resize-y rounded-lg border-line-strong p-2.5 text-[14px] leading-[1.45] font-normal text-foreground" /></label>
          <div className="flex flex-col gap-1.5">
            <span className="text-[14px] font-semibold">Fotografije prostorije</span>
            <div className="flex items-center gap-2">
              <span aria-hidden="true" className="size-14 rounded-md bg-[#E0CCAD]" /><span aria-hidden="true" className="size-14 rounded-md bg-[#D6BE98]" />
              <Button variant={null} size="none" className="min-h-14 rounded-lg border border-dashed border-muted-2 bg-white px-3.5 text-[14px] font-medium text-foreground">+ Dodaj</Button>
            </div>
          </div>
          <div className="flex flex-col gap-2 rounded-[10px] border border-solid border-accent-light bg-accent-lightest p-3.5">
            <div className="flex items-baseline gap-2">
              <span className="text-[16px] font-bold">Kroj Plus</span><span className="text-[13px] text-accent-ink">za ovaj projekat, jednom</span>
              <span className="ml-auto font-mono text-[18px] font-semibold">[CENA]</span>
            </div>
            <ul className="m-0 pl-[18px] text-[13px] leading-normal text-accent-ink">
              <li>projekat odmah otvoren kod izabranih stolara (do 3)</li>
              <li>poruke, komentari na planu i ponude na jednom mestu — 90 dana</li>
              <li>poređenje ponuda, PDF projekta, slika bez oznake</li>
              <li>ako se niko ne javi za 5 radnih dana, biraš drugog besplatno</li>
            </ul>
          </div>
          <Button variant={null} size="none" disabled={!n}
            className={cn('min-h-[52px] rounded-lg text-[17px] font-semibold disabled:opacity-100', n ? 'bg-primary text-white' : 'cursor-not-allowed bg-border text-muted-foreground')}>
            {n ? `Plati i pošalji (${n} ${n === 1 ? 'stolar' : 'stolara'})` : 'Plati i pošalji'}
          </Button>
          <p className="m-0 text-[12.5px] leading-[1.45] text-muted-foreground">Plaćanje karticom. Ako te je stolar sam pozvao u projekat, slanje je besplatno. <a href="#">Uslovi i povraćaj</a></p>
        </aside>
      </main>
    </div>
  );
}
