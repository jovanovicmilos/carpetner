// Radionica → Korisnici i uloge (no reference screen yet; AdminLayout + the AI asistent page's table style).
// apps/api /organizations/:org/members + /invites: every member sees the team, owners invite, change roles and remove.
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { AdminLayout } from './AdminLayout';
import { api, ApiError, errorText, loadWorkshops, useSession } from './session';
import { ALERT } from './ui';

type Role = 'owner' | 'designer';
interface Team { members: { id: string; name: string; email: string; role: Role }[]; invites: { id: string; email: string; role: Role }[] }
const ROLE: Record<Role, string> = { owner: 'Vlasnik', designer: 'Majstor / projektant' };

const BOX = 'rounded-xl border border-solid border-border bg-white px-5 pt-2 pb-5';
const TH = 'border-0 bg-transparent px-2 py-3.5 text-[13px] font-medium text-muted-foreground';
const TD = 'border-0 border-t border-solid border-line-soft px-2 py-2.5 align-middle';
const SMALL = 'min-h-9 px-3 py-1.5 text-[14px] font-normal';

function RoleSelect({ value, onChange, disabled, label }: { value: Role; onChange: (r: Role) => void; disabled?: boolean; label: string }) {
  return (
    <Select value={value} onValueChange={v => onChange(v as Role)} disabled={disabled}>
      <SelectTrigger aria-label={label} className="h-auto min-w-[200px] border-border bg-white py-2 text-[14px]"><SelectValue /></SelectTrigger>
      <SelectContent>{(Object.keys(ROLE) as Role[]).map(r => <SelectItem key={r} value={r}>{ROLE[r]}</SelectItem>)}</SelectContent>
    </Select>
  );
}

export function KorisniciPage() {
  const shop = useSession(s => (s.session ? s.workshops[0] : undefined));
  const me = useSession(s => s.session?.user._id);
  const navigate = useNavigate();
  const [team, setTeam] = useState<Team | null>(null);
  const [mail, setMail] = useState('');
  const [role, setRole] = useState<Role>('designer');
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const owner = shop?.role === 'owner';
  const roles = !!shop?.features.includes('users.roles');
  const seats = shop?.limits.users;
  const lockNote = 'Uloge se biraju u paketu Premium; do tada su novi korisnici majstori.';

  const load = useCallback(async () => { if (shop) setTeam(await api<Team>('GET', `/organizations/${shop.id}/members`)); }, [shop]);
  useEffect(() => { void load().catch(e => setError(errorText(e instanceof ApiError ? e.code : 'server'))); }, [load]);

  const act = async (job: () => Promise<unknown>, done = '') => {
    setBusy(true); setError(''); setNote('');
    try { await job(); await load(); setNote(done); } catch (e) { setError(errorText(e instanceof ApiError ? e.code : 'server')); } finally { setBusy(false); }
  };
  const invite = (e: FormEvent) => {
    e.preventDefault();
    const to = mail.trim();
    void act(async () => { await api('POST', `/organizations/${shop!.id}/invites`, { email: to, role }); setMail(''); }, `Pozivnica je poslata na ${to}.`);
  };
  const leave = () => void act(async () => { await api('DELETE', `/organizations/${shop!.id}/members/${me}`); await loadWorkshops(); navigate('/projekti'); });

  if (!shop) return (
    <AdminLayout title="Korisnici i uloge">
      <p className="m-0 text-[15px]">Korisnici se dodaju radionici sa nalogom. <Link to="/prijava">Prijavi se</Link> da bi pozvao majstore.</p>
    </AdminLayout>
  );
  const used = team ? team.members.length + team.invites.length : 0;
  return (
    <AdminLayout title="Korisnici i uloge" text="Vlasnik podešava cene, pravila i tim; majstori crtaju projekte i šalju krojne liste.">
      {team && <p className="m-0 text-[14px] text-muted-foreground">Mesta u paketu: <strong className="font-mono text-foreground">{used} / {seats === null ? '∞' : seats ?? 0}</strong>{seats !== null && used >= (seats ?? 0) && <> · <Link to="/pretplata">dodaj korisnika u paketu</Link></>}</p>}
      {error && <p className={cn(ALERT, 'm-0')} role="alert">{error}</p>}
      {note && <p className="m-0 rounded-lg bg-ok-soft px-3.5 py-2.5 text-[14px] text-ok" role="status">{note}</p>}
      <section aria-label="Korisnici radionice" className={cn(BOX, 'overflow-x-auto')}>
        <Table className="min-w-[720px] text-[14px]">
          <TableHeader><TableRow>
            <TableHead className={cn(TH, 'pl-0')}>Ime</TableHead><TableHead className={TH}>E-pošta</TableHead>
            <TableHead className={TH}>Uloga</TableHead><TableHead className={cn(TH, 'pr-0')}><span className="sr-only">Radnje</span></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {team?.members.map(m => (
              <TableRow key={m.id}>
                <TableCell className={cn(TD, 'pl-0 font-semibold')}>{m.name}{m.id === me && <span className="font-normal text-muted-foreground"> (ti)</span>}</TableCell>
                <TableCell className={cn(TD, 'text-ink-2')}>{m.email}</TableCell>
                <TableCell className={TD}>{owner && roles
                  ? <RoleSelect label={`Uloga: ${m.name}`} value={m.role} disabled={busy} onChange={r => void act(() => api('PATCH', `/organizations/${shop.id}/members/${m.id}`, { role: r }))} />
                  : ROLE[m.role]}</TableCell>
                <TableCell className={cn(TD, 'pr-0 text-right')}>
                  {m.id === me
                    ? !owner && <Button variant="outline" size="none" className={SMALL} disabled={busy} onClick={leave}>Napusti radionicu</Button>
                    : owner && <Button variant="outline" size="none" className={SMALL} disabled={busy} onClick={() => void act(() => api('DELETE', `/organizations/${shop.id}/members/${m.id}`), `${m.name} više nije u radionici.`)}>Ukloni</Button>}
                </TableCell>
              </TableRow>
            ))}
            {team?.invites.map(i => (
              <TableRow key={i.id}>
                <TableCell className={cn(TD, 'pl-0 text-muted-foreground')}>Pozvan — čeka prijavu</TableCell>
                <TableCell className={cn(TD, 'text-ink-2')}>{i.email}</TableCell>
                <TableCell className={TD}>{ROLE[i.role]}</TableCell>
                <TableCell className={cn(TD, 'pr-0 text-right')}>{owner && <Button variant="outline" size="none" className={SMALL} disabled={busy} onClick={() => void act(() => api('DELETE', `/organizations/${shop.id}/invites/${i.id}`))}>Otkaži pozivnicu</Button>}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>
      {owner && (
        <form onSubmit={invite} className="flex flex-col gap-3 rounded-xl border border-solid border-border bg-white p-5">
          <h2 className="m-0 text-[17px]">Pozovi korisnika</h2>
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex min-w-[280px] flex-1 flex-col gap-1.5 text-[13px] text-muted-foreground">E-pošta
              <Input className="h-auto border-border py-2.5 text-[15px]" type="email" autoComplete="off" required value={mail} onChange={e => setMail(e.target.value)} /></label>
            <label className="flex flex-col gap-1.5 text-[13px] text-muted-foreground">Uloga
              <RoleSelect label="Uloga novog korisnika" value={role} onChange={setRole} disabled={!roles} /></label>
            <Button type="submit" size="none" className="min-h-11 px-4 py-2.5 text-[14px]" disabled={busy}>Pošalji pozivnicu</Button>
          </div>
          <p className="m-0 text-[13px] leading-normal text-muted-foreground">Ko već ima nalog odmah je u radionici; ostali dobijaju link da naprave nalog sa tom e-poštom.{!roles && ` ${lockNote}`}</p>
        </form>
      )}
    </AdminLayout>
  );
}
