// Customer step 5 "Stolar" (design/screens/KupacPosalji.html): pick up to 3 workshops, message, room photos, Kroj Plus and pay.
// The header is the new role stepper (PlannerHeader, step 4); the reference still draws the older 5-step bar.
// The workshops are always the real directory (apps/api /workshops: registered workshops that take requests). The planner
// needs no account; sending does (user 2026-11-24). Signed in as a customer, "Plati i pošalji" sends the kitchen saved in
// the account to the chosen workshops (/me/requests), then opens Ponude. Signed out: an account box right here (e-mail
// sign-in link, or Prijava); the link brings the customer back to this step, choice and message are kept per kitchen.
// Room photos (up to 5) are scaled to ≤ 1600 px JPEG in the browser and sent with the request.
// shortcut: filters and the Kroj Plus payment are UI only (sending is free until a billing provider is chosen).
import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { PlannerHeader } from './Planner';
import { kitchenSummary } from './Pregled';
import { useProjects } from './projects';
import { dirWords, type DirShop } from './directory';
import { AFTER_LOGIN, api, ApiError, base64, errorText, useSession } from './session';
import { useProject } from './store';

type Shop = { id: string; name: string; city: string; mount: boolean; where: string; lead: string; extra: string; jobs: string; featured: boolean; g: string[] };
const PALETTE = ['#EADBC4', '#FFFFFF', '#C49A6C', '#6B4A33'];
/** A directory workshop in the card's words. */
const fromDir = (w: DirShop): Shop => { const d = dirWords(w); return { id: w.id, name: w.name, city: w.city, mount: d.mount, where: d.where, lead: d.lead, extra: d.extra, jobs: '', featured: false, g: PALETTE }; };
const MAX_PHOTOS = 5;
/** A photo scaled to ≤ 1600 px as JPEG (phone photos are 3–8 MB; the API takes ≤ 1 MB each). */
async function shrink(file: File): Promise<Blob> {
  const img = await createImageBitmap(file);
  const k = Math.min(1, 1600 / Math.max(img.width, img.height));
  const c = document.createElement('canvas');
  c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
  c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
  return new Promise((ok, no) => c.toBlob(b => (b ? ok(b) : no(new Error('photo'))), 'image/jpeg', 0.82));
}
const SELECT = 'min-h-11 rounded-lg border border-solid border-line-strong bg-white px-2.5 font-sans text-[15px] text-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary';

export function Posalji() {
  const project = useProject(s => s.project);
  const customer = useSession(s => s.session?.user.kind === 'customer');
  const signedIn = useSession(s => !!s.session);
  const serverId = useProjects(s => (project ? s.list[project.id]?.serverId : undefined));
  const [dir, setDir] = useState<Shop[] | null>(null);
  const draftKey = `kroj-posalji:${project?.id ?? ''}`;
  const draft = (() => { try { return JSON.parse(localStorage.getItem(draftKey) ?? '{}') as { sel?: string[]; message?: string }; } catch { return {}; } })();
  const [sel, setSel] = useState<string[]>(draft.sel ?? []);
  const [message, setMessage] = useState(draft.message ?? '');
  useEffect(() => { try { localStorage.setItem(draftKey, JSON.stringify({ sel, message })); } catch { /* private mode */ } }, [draftKey, sel, message]);
  const [photos, setPhotos] = useState<{ url: string; blob: Blob }[]>([]);
  const [error, setError] = useState('');
  const [city, setCity] = useState('');
  const [mount, setMount] = useState(false);
  // shortcut: "Rok izrade" is drawn, not a filter yet (most workshops have no lead time in their profile).
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  useEffect(() => { // the real directory (public), signed in or not: only registered workshops that take requests
    api<DirShop[]>('GET', '/workshops').then(l => setDir(l.filter(w => w.open !== false).map(fromDir))).catch(() => setDir([]));
  }, []);
  if (!project) return <Navigate to="/kupac" replace />;
  const shops = dir ?? [];
  const cities = [...new Set(shops.map(w => w.city))].sort();
  // Chosen ones stay listed even when a filter would hide them.
  const shown = shops.filter(w => sel.includes(w.id) || ((!city || w.city === city) && (!mount || w.mount)));
  useEffect(() => { if (dir) setSel(l => l.filter(id => dir.some(w => w.id === id))); }, [dir]);
  async function send() {
    if (!serverId) { setError('Kuhinja se još čuva u nalogu — pokušaj ponovo za par sekundi.'); return; }
    setBusy(true); setError('');
    try {
      const data = await Promise.all(photos.map(async p => base64(new Uint8Array(await p.blob.arrayBuffer()))));
      await api('POST', '/me/requests', { projectId: serverId, workshops: sel, message, photos: data });
      try { localStorage.removeItem(draftKey); } catch { /* private mode */ }
      navigate('/kupac/ponude');
    }
    catch (e) { setError(errorText(e instanceof ApiError ? e.code : 'server')); }
    finally { setBusy(false); }
  }
  const { shape, size, floor, uppers, look } = kitchenSummary(project);
  const n = sel.length;
  const addPhotos = async (files: FileList | null) => {
    setError('');
    for (const f of Array.from(files ?? []).slice(0, MAX_PHOTOS - photos.length)) {
      try { const blob = await shrink(f); setPhotos(l => [...l, { url: URL.createObjectURL(blob), blob }]); }
      catch { setError(`Fotografija ${f.name} ne može da se otvori. Probaj JPEG ili PNG.`); }
    }
  };
  const toggle = (id: string) => setSel(s => (s.includes(id) ? s.filter(x => x !== id) : [...s, id]));

  return (
    <div className="flex min-h-[900px] flex-col bg-background text-foreground">
      <PlannerHeader project={project} role="kupac" step={4} />
      <main className="mx-auto box-border grid w-full max-w-[1280px] grid-cols-[minmax(0,1fr)_400px] items-start gap-6 max-md:grid-cols-1 px-5 pt-6 pb-10">
        <section aria-labelledby="dir-h" className="flex min-w-0 flex-col gap-3.5">
          <div>
            <h1 id="dir-h" className="m-0 text-[28px]">Izaberi stolare</h1>
            <p className="mt-1 mb-0 text-[15px] text-muted-foreground">Do 3 radionice. Svaka odmah dobija tvoj projekat otvoren — ništa ne moraš da objašnjavaš ponovo.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <label className="flex flex-col gap-1 text-[13px] text-muted-foreground">Mesto
              <select value={city} onChange={e => setCity(e.target.value)} className={cn(SELECT, 'min-w-[180px]')}><option value="">Sva mesta</option>{cities.map(c => <option key={c}>{c}</option>)}</select></label>
            <label className="flex flex-col gap-1 text-[13px] text-muted-foreground">Rok izrade
              <select className={cn(SELECT, 'min-w-[160px]')}><option>Bilo koji</option><option>do 4 nedelje</option><option>do 8 nedelja</option></select></label>
            <label className="mt-[18px] flex min-h-11 items-center gap-2 text-[14px]"><input type="checkbox" checked={mount} onChange={e => setMount(e.target.checked)} className="size-[18px] accent-primary" />Radi montažu</label>
            <span className="mt-[18px] ml-auto text-[14px] text-muted-foreground">{shown.length} {shown.length % 10 === 1 && shown.length % 100 !== 11 ? 'radionica' : 'radionice'}</span>
          </div>
          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {dir && !dir.length && <li className="text-[15px] text-ink-2">Još nema radionica u imeniku koje primaju upite.</li>}
            {shown.map(w => {
              const on = sel.includes(w.id), dis = !on && n >= 3;
              return (
                <li key={w.id} className={cn('rounded-xl bg-white p-4', on ? 'border-2 border-solid border-primary' : 'border border-solid border-border')}>
                  <div className="grid grid-cols-[120px_minmax(0,1fr)_auto] items-start gap-4 max-md:grid-cols-[72px_minmax(0,1fr)] max-md:gap-3">
                    <div aria-hidden="true" className="grid h-[90px] w-[120px] grid-cols-2 gap-1 max-md:h-[54px] max-md:w-[72px]">
                      {w.g.map((c, i) => <span key={i} className="rounded border border-solid border-border" style={{ background: c }} />)}
                    </div>
                    <div className="flex min-w-0 flex-col gap-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="m-0 text-[18px]">{w.name}</h2>
                        {w.featured && <span className="rounded-[10px] bg-wood-birch px-2 py-0.5 text-[12px] text-wood-bark">Istaknuto</span>}
                      </div>
                      <div className="text-[14px] text-ink-2">{w.where}</div>
                      <div className="flex flex-wrap gap-x-3.5 gap-y-1.5 text-[13px] text-muted-foreground">
                        <span>Rok: <strong className="font-semibold text-foreground">{w.lead}</strong></span><span>{w.extra}</span>{w.jobs && <span>{w.jobs}</span>}
                      </div>
                      <Link to={`/radionice/${w.id}`} className="mt-0.5 inline-flex min-h-7 items-center text-[14px]">Profil i primeri radova</Link>
                    </div>
                    <Button variant={null} size="none" aria-pressed={on} disabled={dis} onClick={() => toggle(w.id)}
                      className={cn('min-h-[46px] min-w-[120px] rounded-lg text-[15px] font-semibold disabled:opacity-100 max-md:col-span-2',
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
              {shops.filter(w => sel.includes(w.id)).map(w => (
                <li key={w.id} className="flex items-center gap-2 text-[14px]"><svg width="14" height="14" viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 6.2l2.3 2.3 4.7-5" fill="none" stroke="#2E6B4E" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" /></svg>{w.name} — {w.where.split(' · ')[0]}</li>
              ))}
            </ul>
          </div>
          <label className="flex flex-col gap-1.5 text-[14px] font-semibold">Poruka stolaru (nije obavezno)
            <Textarea rows={3} value={message} onChange={e => setMessage(e.target.value)} placeholder="Npr. stari elementi se demontiraju, zid B nije ravan, voleo bih ugradnju u martu."
              className="min-h-0 resize-y rounded-lg border-line-strong p-2.5 text-[14px] leading-[1.45] font-normal text-foreground" /></label>
          <div className="flex flex-col gap-1.5">
            <span className="text-[14px] font-semibold">Fotografije prostorije</span>
            <div className="flex flex-wrap items-center gap-2">
              {!customer ? null
              : photos.map((p, i) => (
                <span key={p.url} className="relative">
                  <img src={p.url} alt={`Fotografija ${i + 1}`} className="block size-14 rounded-md object-cover" />
                  <button type="button" aria-label={`Ukloni fotografiju ${i + 1}`} onClick={() => { URL.revokeObjectURL(p.url); setPhotos(l => l.filter(x => x !== p)); }}
                    className="absolute -top-1.5 -right-1.5 flex size-5 cursor-pointer items-center justify-center rounded-full border-0 bg-foreground p-0 text-[12px] leading-none text-white">×</button>
                </span>
              ))}
              {(!customer || photos.length < MAX_PHOTOS) && <label className="inline-flex min-h-14 cursor-pointer items-center rounded-lg border border-dashed border-muted-2 bg-white px-3.5 text-[14px] font-medium text-foreground focus-within:outline-2 focus-within:outline-primary">+ Dodaj
                <input type="file" accept="image/*" multiple disabled={!customer} className="sr-only" onChange={e => { void addPhotos(e.target.files); e.target.value = ''; }} /></label>}
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
          {error && <p role="alert" className="m-0 text-[13px] text-[#8A1C22]">{error}</p>}
          {!customer ? <AccountBox n={n} shop={signedIn} /> : <Button variant={null} size="none" disabled={!n || busy} onClick={() => void send()}
            className={cn('min-h-[52px] rounded-lg text-[17px] font-semibold disabled:opacity-100', n ? 'bg-primary text-white' : 'cursor-not-allowed bg-border text-muted-foreground')}>
            {n ? `Plati i pošalji (${n} ${n === 1 ? 'stolar' : 'stolara'})` : 'Plati i pošalji'}
          </Button>}
          <p className="m-0 text-[12.5px] leading-[1.45] text-muted-foreground">Plaćanje karticom. Ako te je stolar sam pozvao u projekat, slanje je besplatno. <a href="#">Uslovi i povraćaj</a></p>
        </aside>
      </main>
    </div>
  );
}

/** Signed out on the Stolar step: a free account by e-mail link (or sign in), then back here to send. */
function AccountBox({ n, shop }: { n: number; shop: boolean }) {
  const [mail, setMail] = useState('');
  const [sent, setSent] = useState('');
  const [error, setError] = useState('');
  const [city, setCity] = useState('');
  const [mount, setMount] = useState(false);
  // shortcut: "Rok izrade" is drawn, not a filter yet (most workshops have no lead time in their profile).
  const [busy, setBusy] = useState(false);
  if (shop) return <p className="m-0 rounded-lg bg-background px-3 py-2.5 text-[13.5px] leading-[1.45] text-ink-2">Prijavljen si kao radionica. Kuhinju stolaru šalje kupac iz svog naloga.</p>;
  const back = () => { try { localStorage.setItem(AFTER_LOGIN, JSON.stringify({ to: '/kupac/posalji', at: Date.now() })); } catch { /* private mode */ } };
  const go = async () => {
    setBusy(true); setError('');
    try { back(); await api('POST', '/auth/link', { email: mail }); setSent(mail.trim()); }
    catch (e) { setError(errorText(e instanceof ApiError ? e.code : 'server')); }
    finally { setBusy(false); }
  };
  if (sent) return (
    <div role="status" className="flex flex-col gap-1.5 rounded-lg bg-accent-lightest px-3.5 py-3 text-[14px] leading-[1.45] text-accent-ink">
      <strong>Proveri e-poštu</strong>
      <span>Poslali smo link na <strong>{sent}</strong>. Otvori ga u ovom pregledaču (važi 30 minuta) — vraćaš se ovde, kuhinja je sačuvana u nalogu i možeš da pošalješ.</span>
      <button type="button" onClick={() => setSent('')} className="cursor-pointer self-start border-0 bg-transparent p-0 font-sans text-[13.5px] text-primary underline">Pogrešna adresa? Upiši ponovo</button>
    </div>
  );
  return (
    <form onSubmit={e => { e.preventDefault(); void go(); }} className="flex flex-col gap-2 rounded-lg border border-solid border-border p-3.5">
      <strong className="text-[15px]">Za slanje treba besplatan nalog</strong>
      <span className="text-[13px] leading-[1.45] text-muted-foreground">Kuhinju praviš bez naloga; stolar ti odgovara na e-poštu, zato je potrebna. {n ? 'Izbor stolara i poruka ostaju.' : ''}</span>
      <label className="flex flex-col gap-1 text-[13px] text-muted-foreground">E-pošta
        <Input type="email" required autoComplete="email" placeholder="ime@primer.rs" value={mail} onChange={e => setMail(e.target.value)} aria-invalid={!!error} aria-describedby={error ? 'acc-err' : undefined}
          className="min-h-11 rounded-lg border-line-strong px-3 text-[15px] text-foreground" /></label>
      {error && <p id="acc-err" role="alert" className="m-0 text-[13px] text-[#8A1C22]">{error}</p>}
      <Button type="submit" size="none" disabled={busy || !mail.trim()} className="min-h-12 rounded-lg text-[16px] font-semibold">Pošalji link za prijavu</Button>
      <span className="text-[13px] text-muted-foreground">Već imaš nalog? <Link to="/prijava" onClick={back}>Prijavi se</Link></span>
    </form>
  );
}
