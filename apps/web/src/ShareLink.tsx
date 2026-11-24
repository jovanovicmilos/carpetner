// "Link za kupca" (user 2026-11-25): a read-only link to the kitchen (/k/:token, SharedKitchen.tsx). Lives in the 3D canvas toolbar
// (user 2026-11-24: not in the project bar on every screen).
import { useState } from 'react';
import { Check, Copy, Link2, Link2Off } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useProjects } from './projects';
import { api } from './session';
import { useProject } from './store';

/**
 * "Link za kupca" (user 2026-11-25, where the unwired "Podeli" was): a read-only link to the kitchen (/k/:token, SharedKitchen.tsx).
 * Needs the project on the server (signed in, synced); the owner makes, copies and removes it.
 */
export function ShareLink() {
  const project = useProject(s => s.project);
  const serverId = useProjects(s => (project ? s.list[project.id]?.serverId : undefined));
  const [token, setToken] = useState<string | null | undefined>(undefined); // undefined = not loaded
  const [busy, setBusy] = useState(false), [copied, setCopied] = useState(false), [error, setError] = useState('');
  const url = token ? `${location.origin}/k/${token}` : '';
  const run = async (f: () => Promise<void>) => { setBusy(true); setError(''); try { await f(); } catch { setError('Nije uspelo. Proveri vezu i pokušaj ponovo.'); } finally { setBusy(false); } };
  const load = () => serverId && run(async () => setToken((await api<{ token: string | null }>('GET', `/projects/${serverId}/share`)).token));
  return (
    <Popover onOpenChange={o => { if (o) { setCopied(false); void load(); } }}>
      <Tooltip><TooltipTrigger asChild><PopoverTrigger asChild><Button variant="ghost" size="icon" aria-label="Link za kupca"><Link2 /></Button></PopoverTrigger></TooltipTrigger>
        <TooltipContent side="top">Link za kupca</TooltipContent></Tooltip>
      <PopoverContent side="top" align="end" className="flex w-[340px] flex-col gap-3">
        <div className="flex flex-col gap-1"><strong className="text-sm font-semibold">Link za kupca</strong>
          <span className="text-sm text-muted-foreground">Kupac otvara kuhinju u pregledaču, u 3D, bez naloga i bez izmena.</span></div>
        {!serverId ? <span className="text-sm text-warn-ink">Kuhinja još nije sačuvana na nalogu — prijavi se (ili sačekaj par sekundi) pa probaj ponovo.</span>
          : token === undefined ? <span className="text-sm text-muted-foreground">Učitavam…</span>
          : !token ? <Button disabled={busy} onClick={() => void run(async () => setToken((await api<{ token: string }>('POST', `/projects/${serverId}/share`)).token))}><Link2 />Napravi link</Button>
          : <>
            <div className="flex gap-2">
              <Input readOnly value={url} aria-label="Link za kupca" className="font-mono text-xs" onFocus={e => e.currentTarget.select()} />
              <Button variant="outline" size="icon" aria-label="Kopiraj link" onClick={() => void navigator.clipboard?.writeText(url).then(() => setCopied(true))}>{copied ? <Check /> : <Copy />}</Button>
            </div>
            {copied && <span className="text-xs text-ok">Link je kopiran — pošalji ga kupcu porukom ili e-poštom.</span>}
            <Button variant="ghost" size="sm" className="self-start text-destructive hover:text-destructive" disabled={busy}
              onClick={() => void run(async () => { await api('DELETE', `/projects/${serverId}/share`); setToken(null); })}><Link2Off />Isključi link</Button>
          </>}
        {error && <span role="alert" className="text-sm text-destructive">{error}</span>}
      </PopoverContent>
    </Popover>
  );
}
