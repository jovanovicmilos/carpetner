// Sign in / new workshop (design/screens/Prijava.html) on apps/api. The design draws the two tabs; the other states
// (e-mail sent, forgotten password, new password from the e-mail link, naming the workshop after a Google sign-in) reuse
// the same form column. Links from e-mails and Google come back here: ?potvrda= / ?lozinka= / ?code= / ?error=.
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BRAND, BrandMark } from './brand';
import { api, ApiError, errorText, loadWorkshops, signIn } from './session';
import { pull } from './sync';
import { useProjects } from './projects';
import { ALERT } from './ui';

const FIELD = 'flex flex-col gap-1.5 text-sm';
const INPUT = 'h-auto p-3 text-base';
const NOTE = 'm-0 rounded-lg bg-ok-soft px-3.5 py-2.5 text-[14px] leading-normal text-ok';
const LINK = 'cursor-pointer border-0 bg-transparent p-0 font-sans text-sm text-primary underline';

type Mode = 'in' | 'reg' | 'forgot' | 'reset' | 'workshop';
type Session = Parameters<typeof signIn>[0];

export function LoginPage() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>(params.get('lozinka') ? 'reset' : 'in');
  const [f, setF] = useState({ workshop: '', email: '', password: '' });
  const [error, setError] = useState(params.get('error') ? errorText(params.get('error')!) : '');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const resetToken = useRef(params.get('lozinka'));
  const reg = mode === 'reg';

  const run = async (job: () => Promise<void>) => {
    setBusy(true); setError(''); setNote('');
    try { await job(); } catch (e) { setError(errorText(e instanceof ApiError ? e.code : 'server')); } finally { setBusy(false); }
  };
  /** Signed in: a workshop is needed first; then its projects come down and work continues. */
  const enter = async (s: Session) => {
    const workshops = await signIn(s);
    if (!workshops.length) { setMode('workshop'); return; }
    await pull();
    navigate(Object.keys(useProjects.getState().list).length ? '/projekti' : '/brzi-start');
  };

  // E-mail confirmation and Google return: one call each, then the parameters leave the address bar.
  useEffect(() => {
    const verify = params.get('potvrda'), code = params.get('code');
    if (!verify && !code && !params.get('lozinka') && !params.get('error')) return;
    setParams({}, { replace: true });
    if (verify) void run(async () => enter(await api<Session>('POST', '/auth/verify', { token: verify })));
    if (code) void run(async () => enter(await api<Session>('POST', '/auth/google/exchange', { code })));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (mode === 'in') void run(async () => enter(await api<Session>('POST', '/auth/login', { email: f.email, password: f.password })));
    else if (mode === 'reg') void run(async () => {
      await api('POST', '/auth/register', { workshop: f.workshop, email: f.email, password: f.password });
      setNote(`Poslali smo link za potvrdu na ${f.email.trim()}. Otvori ga (važi 24 sata) — radionica se otvara čim potvrdiš e-poštu.`);
    });
    else if (mode === 'forgot') void run(async () => {
      await api('POST', '/auth/password/reset', { email: f.email });
      setNote(`Ako za ${f.email.trim()} postoji nalog, stigao je link za novu lozinku (važi 30 minuta).`);
    });
    else if (mode === 'reset') void run(async () => {
      await api('POST', '/auth/password/reset/confirm', { token: resetToken.current, password: f.password });
      resetToken.current = null; setMode('in'); setF({ ...f, password: '' });
      setNote('Lozinka je promenjena. Prijavi se novom lozinkom.');
    });
    else void run(async () => {
      await api('POST', '/organizations', { name: f.workshop });
      await loadWorkshops(); await pull();
      navigate(Object.keys(useProjects.getState().list).length ? '/projekti' : '/brzi-start');
    });
  };
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const switchTo = (m: Mode) => { setMode(m); setError(''); setNote(''); };

  const title = { in: 'Dobro došao nazad', reg: 'Otvori nalog radionice', forgot: 'Nova lozinka', reset: 'Postavi novu lozinku', workshop: 'Kako se zove tvoja radionica?' }[mode];
  const action = { in: 'Prijavi se', reg: 'Započni 14 dana probe', forgot: 'Pošalji link za novu lozinku', reset: 'Sačuvaj lozinku', workshop: 'Otvori radionicu' }[mode];
  return (
    <div className="flex min-h-screen flex-wrap bg-background font-sans text-foreground">
      <section className="box-border flex min-w-0 flex-[1_1_520px] flex-col gap-7 bg-dark p-12 text-background">
        <Link to="/" className="flex items-center gap-2.5 text-background no-underline">
          <BrandMark />
          <span className="text-xl font-bold">{BRAND.name}</span>
        </Link>
        <h1 className="mt-auto mb-0 max-w-[520px] text-[40px] leading-[1.1]">Tvoja radionica, tvoje mere, tvoje cene.</h1>
        <div className="flex max-w-[480px] flex-col gap-3 text-base text-on-dark-muted">
          {['Projekti su vezani za radionicu, ne za računar — rade na tabletu u stanu kupca i na računaru u radionici.',
            'Vlasnik radionice postavlja cenovnik i pravila, majstori crtaju i šalju krojne liste.'].map(t => (
            <div key={t} className="flex gap-3"><span className="font-mono text-accent-on-dark">→</span><span>{t}</span></div>
          ))}
        </div>
        <div className="mt-auto text-[13px] text-[#C9C3B8]">14 dana besplatno · bez kartice</div>
      </section>
      <main className="box-border flex min-w-0 flex-[1_1_480px] items-center justify-center p-12">
        <form className="flex w-full max-w-[400px] flex-col gap-[18px]" onSubmit={submit}>
          {(mode === 'in' || reg) && (
            <Tabs value={mode} onValueChange={v => switchTo(v as Mode)}>
              <TabsList aria-label="Nalog" className="flex overflow-hidden rounded-lg border border-solid border-border bg-white">
                {([['in', 'Prijava'], ['reg', 'Nova radionica']] as const).map(([v, t]) => (
                  <TabsTrigger key={v} value={v} className="min-h-[46px] flex-1 border-0 bg-white text-[15px] text-foreground data-[state=active]:bg-dark data-[state=active]:font-semibold data-[state=active]:text-white">{t}</TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          )}
          <h2 className="m-0 text-[26px]">{title}</h2>
          {mode === 'workshop' && <p className="m-0 text-[14px] leading-normal text-muted-foreground">Projekti, cenovnik i pravila se čuvaju pod radionicom. Prvih 30 dana imaš sve iz paketa Pro.</p>}
          {(reg || mode === 'workshop') && <label className={FIELD}>Naziv radionice<Input className={INPUT} type="text" autoComplete="organization" required value={f.workshop} onChange={set('workshop')} /></label>}
          {(mode === 'in' || reg || mode === 'forgot') && <label className={FIELD}>E-pošta<Input className={INPUT} type="email" autoComplete="email" required value={f.email} onChange={set('email')} /></label>}
          {(mode === 'in' || reg || mode === 'reset') && (
            <label className={FIELD}>{mode === 'reset' ? 'Nova lozinka (najmanje 8 znakova)' : 'Lozinka'}
              <Input className={INPUT} type="password" autoComplete={mode === 'in' ? 'current-password' : 'new-password'} required minLength={mode === 'in' ? undefined : 8} value={f.password} onChange={set('password')} />
            </label>
          )}
          {mode === 'in' && <button type="button" className={`${LINK} self-end no-underline`} onClick={() => switchTo('forgot')}>Zaboravljena lozinka?</button>}
          {error && <p className={`${ALERT} m-0`} role="alert">{error}</p>}
          {note && <p className={NOTE} role="status">{note}</p>}
          {error === errorText('not_verified') && (
            <button type="button" className={`${LINK} self-start`} disabled={busy}
              onClick={() => void run(async () => { await api('POST', '/auth/verify/resend', { email: f.email }); setNote('Poslali smo novi link za potvrdu.'); })}>Pošalji ponovo link za potvrdu</button>
          )}
          <Button type="submit" size="none" className="min-h-[50px] rounded-md text-base" disabled={busy}>{busy ? 'Sačekaj…' : action}</Button>
          {(mode === 'forgot' || mode === 'reset') && <button type="button" className={`${LINK} self-center`} onClick={() => switchTo('in')}>Nazad na prijavu</button>}
          {(mode === 'in' || reg) && <>
            <div className="flex items-center gap-3 text-[13px] text-muted-foreground"><span className="h-px flex-1 bg-border" />ili<span className="h-px flex-1 bg-border" /></div>
            <Button asChild variant="outline" size="none" className="min-h-12 rounded-md border-line-strong text-[15px] font-normal text-foreground no-underline">
              <a href="/api/v1/auth/google">Nastavi sa Google nalogom</a>
            </Button>
            <p className="m-0 text-[13px] leading-normal text-muted-foreground">Pozvan si od strane radionice? Otvori link iz pozivnice — nalog se automatski veže za tu radionicu.</p>
          </>}
        </form>
      </main>
    </div>
  );
}
