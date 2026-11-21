// Workshop settings → public profile and portfolio (design/screens/ProfilRadionice.html): basics, services and area, inquiry
// pause, portfolio with the customer's consent per project, live preview of the directory card, save bar.
// Signed in as a workshop member, the profile is loaded from and saved to apps/api (/organizations/:org/profile): a filled-in
// city lists the workshop in the directory customers send requests from (Pošalji); "Prijem upita" off stops new requests.
// Signed out: the design's placeholder profile, local state only.
// shortcut: the portfolio list is placeholders; logo / cover upload and
// "Zatraži saglasnost" (a message to the customer) are not wired.
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { api, ApiError, errorText, useSession } from './session';
import { AdminLayout } from './AppShell';

type Consent = 'ok' | 'own' | 'none' | 'wait' | 'no';
const PROJECTS: { id: number; t: string; m: string; st: Consent; c: [string, string, string] }[] = [
  { id: 1, t: 'Hrast i bela', m: 'Prava · 360 cm · završeno 10/2026', st: 'ok', c: ['#EADBC4', '#6B4A33', '#FFFFFF'] },
  { id: 2, t: 'Orah ostrvo', m: 'Ostrvo · 380 cm · završeno 9/2026', st: 'own', c: ['#6B4A33', '#F3F1EC', '#6B4A33'] },
  { id: 3, t: 'Ugaona — Ana P.', m: 'Ugaona · 320 × 240 cm · u izradi', st: 'none', c: ['#FFFFFF', '#C49A6C', '#FFFFFF'] },
  { id: 4, t: 'Bela sa orahom', m: 'U · 260 × 300 × 220 cm · završeno 8/2026', st: 'wait', c: ['#FFFFFF', '#6B4A33', '#FFFFFF'] },
  { id: 5, t: 'Kuhinja Petrović', m: 'Ugaona · 300 × 200 cm · ponuda poslata', st: 'no', c: ['#F6EEE2', '#C49A6C', '#F6EEE2'] },
];
const CONSENT: Record<Consent, [string, string]> = {
  ok: ['Kupac saglasan', 'bg-ok-soft text-ok'], own: ['Sopstveni projekat', 'bg-background text-ink-2'], none: ['Bez saglasnosti', 'bg-background text-ink-2'],
  wait: ['Čeka kupca', 'bg-wood-birch text-wood-bark'], no: ['Kupac odbio', 'bg-[#F6D5D3] text-[#8A1C22]'],
};
const SERVICES: [string, string][] = [['m', 'Merenje'], ['mo', 'Montaža'], ['d', 'Demontaža starih elemenata'], ['e', 'Električne i vodovodne priključke']];
const MAX_ABOUT = 400;
const CARD = 'flex flex-col rounded-xl border border-solid border-border bg-white p-[18px]';
const FIELD = 'flex flex-col gap-[5px] text-[14px] font-medium';
const INPUT = 'box-border min-h-[42px] rounded-md border border-solid border-line-strong bg-white px-2.5 font-sans text-[15px] font-normal text-foreground';
const OUTLINE = 'rounded-md border-line-strong bg-white text-[14px] font-semibold text-foreground';
const shelf = (c: string[]) => `linear-gradient(180deg, ${c[0]} 0 42%, ${c[1]} 42% 50%, ${c[2]} 50% 100%)`;

export function ProfilRadionice() {
  const [name, setName] = useState('[Radionica A]');
  const [about, setAbout] = useState('Porodična radionica od 2009. Kuhinje i plakari po meri od iverice i MDF-a, sa Blum okovom. Merimo i montiramo sami.');
  const [svc, setSvc] = useState<Record<string, boolean>>({ m: true, mo: true, d: true, e: false });
  const [km, setKm] = useState(30);
  const [open, setOpen] = useState(true);
  const [onProfile, setOnProfile] = useState<Record<number, boolean>>({ 1: true, 2: true });
  const [asked, setAsked] = useState<Record<number, boolean>>({});
  const [dirty, setDirty] = useState(false);
  const [city, setCity] = useState('Novi Sad');
  const [lead, setLead] = useState<[string, string]>(['4', '6']);
  const [error, setError] = useState('');
  const shopId = useSession(s => (s.session ? s.workshops[0]?.id : undefined));
  type Profile = { name: string; city?: string; about?: string; services?: string[]; km?: number; leadFrom?: number; leadTo?: number; open?: boolean };
  const show = (p: Profile) => {
    setName(p.name); setCity(p.city ?? ''); setAbout(p.about ?? ''); setKm(p.km ?? 30); setOpen(p.open !== false);
    setSvc(Object.fromEntries(SERVICES.map(([k]) => [k, !!p.services?.includes(k)])));
    setLead([p.leadFrom ? String(p.leadFrom) : '', p.leadTo ? String(p.leadTo) : '']);
    setDirty(false);
  };
  const load = useCallback(() => {
    if (shopId) api<Profile>('GET', `/organizations/${shopId}/profile`).then(show).catch(e => setError(errorText(e instanceof ApiError ? e.code : 'server')));
  }, [shopId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(load, [load]);
  async function save() {
    if (!shopId) { setDirty(false); return; }
    setError('');
    const n = (v: string) => (v ? parseInt(v, 10) : undefined);
    try {
      show(await api<Profile>('PUT', `/organizations/${shopId}/profile`, {
        name, city, about, km, open, services: SERVICES.map(([k]) => k).filter(k => svc[k]), leadFrom: n(lead[0]), leadTo: n(lead[1]),
      }));
    } catch (e) { setError(errorText(e instanceof ApiError ? e.code : 'server')); }
  }
  const leadText = lead[0] && lead[1] ? `rok ${lead[0]}–${lead[1]} nedelja` : 'rok po dogovoru';
  /** Every profile edit marks the page unsaved (asking for consent does not: it is sent right away). */
  const edit = <T,>(set: (v: T) => void) => (v: T) => { set(v); setDirty(true); };

  const shown = PROJECTS.filter(p => onProfile[p.id]);
  const preview = (shown.length ? shown : PROJECTS.slice(0, 1)).slice(0, 3);

  return (
    <AdminLayout>
      <div className="grid w-full max-w-[1100px] grid-cols-[minmax(0,1fr)_340px] items-start gap-6 max-lg:grid-cols-1">
        <section className="flex min-w-0 flex-col gap-[18px]">
          <div>
            <h1 className="m-0 text-[28px]">Profil radionice</h1>
            <p className="mt-1 mb-0 text-[15px] text-muted-foreground">Ovo vide kupci u imeniku Radionice i na tvom javnom profilu.</p>
          </div>

          <section aria-labelledby="b-h" className={cn(CARD, 'gap-3.5')}>
            <h2 id="b-h" className="m-0 text-[18px]">Osnovno</h2>
            <div className="grid grid-cols-2 gap-3 max-md:grid-cols-1">
              <label className={FIELD}>Naziv radionice<input type="text" value={name} onChange={e => edit(setName)(e.target.value)} className={INPUT} /></label>
              <label className={FIELD}>Mesto<input type="text" value={city} onChange={e => edit(setCity)(e.target.value)} className={INPUT} /></label>
            </div>
            <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3.5">
              <span aria-hidden="true" className="inline-flex size-[72px] items-center justify-center rounded-[14px] bg-wood-walnut text-[22px] font-bold text-white">RA</span>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="none" className={cn(OUTLINE, 'min-h-10 px-3.5')}>Promeni logo</Button>
                <Button variant="outline" size="none" className={cn(OUTLINE, 'min-h-10 px-3.5')}>Naslovna slika</Button>
                <span className="self-center text-[12.5px] text-muted-foreground">PNG ili JPG, do 5 MB. Bez slika ljudi.</span>
              </div>
            </div>
            <label className={FIELD}>O radionici
              <textarea rows={4} value={about} maxLength={MAX_ABOUT} onChange={e => edit(setAbout)(e.target.value)}
                className="resize-y rounded-md border border-solid border-line-strong p-2.5 font-sans text-[15px] leading-normal font-normal text-foreground" />
              <span className="text-[12.5px] font-normal text-muted-foreground">{about.length} / {MAX_ABOUT} znakova</span></label>
          </section>

          <section aria-labelledby="s-h" className={cn(CARD, 'gap-3.5')}>
            <h2 id="s-h" className="m-0 text-[18px]">Usluge i područje</h2>
            <fieldset className="m-0 flex flex-wrap gap-x-[22px] gap-y-2.5 border-0 p-0">
              <legend className="mb-1.5 text-[14px] font-medium">Radim</legend>
              {SERVICES.map(([k, t]) => (
                <label key={k} className="inline-flex min-h-9 items-center gap-2 text-[14.5px]">
                  <input type="checkbox" checked={!!svc[k]} onChange={() => edit(setSvc)({ ...svc, [k]: !svc[k] })} className="size-[18px] accent-primary" />{t}
                </label>
              ))}
            </fieldset>
            <div className="grid grid-cols-2 items-end gap-4 max-md:grid-cols-1">
              <label className="flex flex-col gap-1.5 text-[14px] font-medium">Područje rada: <span className="font-semibold text-accent-ink">{km} km od mesta</span>
                <input type="range" min={5} max={150} step={5} value={km} onChange={e => edit(setKm)(parseInt(e.target.value, 10))} className="accent-primary" /></label>
              <div className="flex items-end gap-2.5">
                <label className={FIELD}>Rok od<input type="number" min={1} max={52} value={lead[0]} onChange={e => edit(setLead)([e.target.value, lead[1]])} className={cn(INPUT, 'w-[90px] font-mono')} /></label>
                <label className={FIELD}>do<input type="number" min={1} max={52} value={lead[1]} onChange={e => edit(setLead)([lead[0], e.target.value])} className={cn(INPUT, 'w-[90px] font-mono')} /></label>
                <span className="pb-[11px] text-[14px] text-muted-foreground">nedelja od merenja</span>
              </div>
            </div>
          </section>

          <section aria-labelledby="r-h" className={cn(CARD, 'gap-2.5')}>
            <h2 id="r-h" className="m-0 text-[18px]">Prijem upita</h2>
            <div className="flex items-center gap-3">
              <button type="button" role="switch" aria-checked={open} aria-label="Primam upite kupaca" onClick={() => edit(setOpen)(!open)}
                className={cn('inline-flex h-7 w-12 cursor-pointer rounded-[14px] border-0 p-[3px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary', open ? 'justify-end bg-primary' : 'justify-start bg-line-strong')}>
                <span className="size-[22px] rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,0.2)]" />
              </button>
              <span className="text-[15px] font-medium">{open ? 'Primam upite kupaca' : 'Pauza — ne primam nove upite'}</span>
            </div>
            <p className="m-0 text-[13.5px] text-muted-foreground">{open
              ? 'Profil je u imeniku i kupci mogu da ti pošalju projekat.'
              : 'Profil ostaje vidljiv, ali uz oznaku „Trenutno ne prima upite“; postojeći upiti i saradnje rade normalno.'}</p>
          </section>

          <section aria-labelledby="p-h" className={cn(CARD, 'gap-3')}>
            <div className="flex items-baseline gap-2.5"><h2 id="p-h" className="m-0 text-[18px]">Portfolio</h2><span className="text-[14px] text-muted-foreground">{shown.length} na profilu</span></div>
            <p className="m-0 text-[13.5px] text-ink-2">Tvoji projekti su privatni. Ovde biraš koji idu na profil i u galeriju. Projekti od kupaca traže njihovu saglasnost; ime i adresa kupca se nikad ne prikazuju.</p>
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {PROJECTS.map(p => {
                const st: Consent = asked[p.id] ? 'wait' : p.st;
                return (
                  <li key={p.id} className="grid grid-cols-[72px_minmax(0,1fr)_auto_auto] items-center gap-3 rounded-[10px] border border-solid border-[#EEEAE2] p-2.5 max-md:grid-cols-[72px_minmax(0,1fr)]">
                    <span aria-hidden="true" className="h-[52px] w-[72px] rounded-md border border-solid border-[#E4DFD5]" style={{ background: shelf(p.c) }} />
                    <span className="flex min-w-0 flex-col gap-0.5"><strong className="text-[15px]">{p.t}</strong><span className="text-[13px] text-muted-foreground">{p.m}</span></span>
                    <span className={cn('rounded-[10px] px-[9px] py-[3px] text-[12.5px] whitespace-nowrap max-md:col-start-2 max-md:justify-self-start', CONSENT[st][1])}>{CONSENT[st][0]}</span>
                    {st === 'none' && <Button variant={null} size="none" onClick={() => setAsked({ ...asked, [p.id]: true })} className="min-h-[38px] rounded-md border border-solid border-primary bg-white px-3 text-[13px] font-semibold text-accent-ink max-md:col-start-2 max-md:justify-self-start">Zatraži saglasnost</Button>}
                    {(st === 'ok' || st === 'own') && (
                      <label className="inline-flex min-h-[38px] items-center gap-2 text-[14px] max-md:col-start-2">
                        <input type="checkbox" checked={!!onProfile[p.id]} onChange={() => edit(setOnProfile)({ ...onProfile, [p.id]: !onProfile[p.id] })} className="size-[18px] accent-primary" />Na profilu
                      </label>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        </section>

        <aside aria-label="Pregled profila" className="sticky top-0 flex flex-col gap-2.5 max-md:static">
          <div className="text-[13px] font-semibold tracking-[0.06em] text-muted-foreground uppercase">Kako te vide kupci</div>
          <div className="overflow-hidden rounded-[14px] border border-solid border-border bg-white">
            <div aria-hidden="true" className="h-[70px] bg-[linear-gradient(90deg,#6B4A33,#C49A6C_55%,#EADBC4)]" />
            <div className="-mt-[26px] flex flex-col gap-2 px-3.5 pb-3.5">
              {/* 52 px + 3 px border each side: the reference box is content-box */}
              <span aria-hidden="true" className="inline-flex size-[58px] items-center justify-center rounded-xl border-[3px] border-solid border-white bg-wood-walnut font-bold text-white">RA</span>
              <strong className="text-[17px]">{name}</strong>
              <span className="text-[13px] text-ink-2">{city || 'Mesto nije upisano'} · do {km} km · {leadText}</span>
              <span className="text-[13px] leading-[1.45] text-ink-2">{about.length > 90 ? `${about.slice(0, 90)}…` : about}</span>
              <div aria-hidden="true" className="grid h-14 grid-cols-3 gap-1">
                {preview.map(p => <span key={p.id} className="rounded border border-solid border-[#E4DFD5]" style={{ background: shelf(p.c) }} />)}
              </div>
              {!open && <span className="self-start rounded-lg bg-background px-2 py-[3px] text-[12.5px] text-ink-2">Trenutno ne prima upite</span>}
            </div>
          </div>
          <Link to={`/radionice/${shopId ?? "a"}`} className="inline-flex min-h-9 items-center text-[14px] font-semibold">Pogledaj javni profil →</Link>
        </aside>
      </div>

      {/* save bar stays at the bottom of the scrolling page */}
      <div className="sticky -bottom-6 -mx-7 -mb-6 mt-auto flex items-center justify-end gap-3 border-0 border-t border-solid border-border bg-white px-7 py-3">
        {error && <span role="alert" className="text-[14px] text-[#8A1C22]">{error}</span>}
        {shopId && !city.trim() && <span className="text-[14px] text-ink-2">Upiši mesto da bi radionica bila u imeniku.</span>}
        <span role="status" className="text-[14px] text-muted-foreground">{dirty ? 'Ima nesačuvanih izmena' : 'Sve je sačuvano'}</span>
        <Button variant="outline" size="none" disabled={!dirty} onClick={load} className={cn(OUTLINE, 'min-h-11 px-4 disabled:opacity-100')}>Odustani</Button>
        <Button size="none" onClick={() => void save()} className="min-h-11 rounded-md px-5 text-[15px] font-semibold">Sačuvaj profil</Button>
      </div>
    </AdminLayout>
  );
}
