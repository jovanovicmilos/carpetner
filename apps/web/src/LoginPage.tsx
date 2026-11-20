// Sign in / new workshop (design/screens/Prijava.html).
// shortcut: there are no accounts yet (Supabase Auth, MVP 8) — submitting opens Brzi start like the design's link;
// nothing typed here is stored or sent anywhere.
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useProjects } from './projects';
import { BRAND, BrandMark } from './brand';

const FIELD = 'flex flex-col gap-1.5 text-sm';
const INPUT = 'h-auto p-3 text-base';

export function LoginPage() {
  const [reg, setReg] = useState(false);
  const navigate = useNavigate();
  return (
    <div className="flex min-h-screen flex-wrap bg-background font-sans text-foreground">
      <section className="box-border flex min-w-0 flex-[1_1_520px] flex-col gap-7 bg-dark p-12 text-background">
        <Link to="/sajt" className="flex items-center gap-2.5 text-background no-underline">
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
        <form className="flex w-full max-w-[400px] flex-col gap-[18px]" onSubmit={e => { e.preventDefault(); navigate(Object.keys(useProjects.getState().list).length ? '/projekti' : '/'); }}>
          <Tabs value={reg ? 'reg' : 'in'} onValueChange={v => setReg(v === 'reg')}>
            <TabsList aria-label="Nalog" className="flex overflow-hidden rounded-lg border border-solid border-border bg-white">
              {([['in', 'Prijava'], ['reg', 'Nova radionica']] as const).map(([v, t]) => (
                <TabsTrigger key={v} value={v} className="min-h-[46px] flex-1 border-0 bg-white text-[15px] text-foreground data-[state=active]:bg-dark data-[state=active]:font-semibold data-[state=active]:text-white">{t}</TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <h2 className="m-0 text-[26px]">{reg ? 'Otvori nalog radionice' : 'Dobro došao nazad'}</h2>
          {reg && <label className={FIELD}>Naziv radionice<Input className={INPUT} type="text" autoComplete="organization" /></label>}
          <label className={FIELD}>E-pošta<Input className={INPUT} type="email" autoComplete="email" /></label>
          <label className={FIELD}>Lozinka<Input className={INPUT} type="password" autoComplete={reg ? 'new-password' : 'current-password'} /></label>
          {!reg && <a href="#" className="self-end text-sm text-primary" aria-disabled="true" onClick={e => e.preventDefault()}>Zaboravljena lozinka?</a>}
          <Button type="submit" size="none" className="min-h-[50px] rounded-md text-base">{reg ? 'Započni 14 dana probe' : 'Prijavi se'}</Button>
          <div className="flex items-center gap-3 text-[13px] text-muted-foreground"><span className="h-px flex-1 bg-border" />ili<span className="h-px flex-1 bg-border" /></div>
          <Button type="button" variant="outline" size="none" className="min-h-12 cursor-default rounded-md border-line-strong text-[15px] font-normal" aria-disabled="true" title="Uskoro">Nastavi sa Google nalogom</Button>
          <p className="m-0 text-[13px] leading-normal text-muted-foreground">Pozvan si od strane radionice? Otvori link iz pozivnice — nalog se automatski veže za tu radionicu.</p>
        </form>
      </main>
    </div>
  );
}
