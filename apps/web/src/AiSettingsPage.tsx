// Admin → AI asistent (design/screens/AIPodesavanja.html): how AI is paid for and run, connector address, predefined tasks.
// shortcut: settings live in this screen only (no backend yet); the API key is never stored in the browser —
// it will be kept encrypted server-side (docs/AI.md).
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { AdminLayout } from './AdminLayout';
import { Tip } from './help';
import { BRAND } from './brand';

type Mode = 'connector' | 'credits' | 'key';
const MODES: [Mode, string, string, string][] = [
  ['connector', `${BRAND.name} u Claude-u`, 'Koristi tvoju Claude pretplatu', `${BRAND.name} se dodaje kao konektor u Claude. Slike, razgovor i AI rad su u Claude-u na tvom planu; ${BRAND.name} daje alate i čuva projekat.`],
  ['credits', 'AI u Kroju — krediti', 'Uključeno u paket', 'AI dugme radi direktno u Kroju. Paket uključuje mesečne AI kredite; po potrebi se dokupljuju.'],
  ['key', `AI u ${BRAND.loc} — tvoj API ključ`, 'Plaćaš Anthropic-u po potrošnji', `Unesi svoj Anthropic API ključ; tokene plaćaš direktno, bez ${BRAND.name} kredita.`],
];
const TASKS: [string, string, string, boolean][] = [
  ['Prepoznaj zidove i instalacije', 'AI iz slike', 'predlog prostora', true],
  ['Predloži raspored kuhinje', 'Prostor', 'predlog elemenata', true],
  ['Prepiši postojeću kuhinju sa slike', 'AI iz slike', 'predlog elemenata', true],
  ['Proveri projekat', 'svi ekrani', 'ništa — samo lista primedbi', true],
  ['Napiši ponudu kupcu', 'Ponuda', 'tekst ponude', true],
  ['Uvezi cenovnik iz PDF-a ili slike', 'Admin · cenovnik', 'predlog cena', false],
];
const MCP_URL = 'https://[DOMEN]/mcp'; // shortcut: real domain when the MCP server is deployed (docs/AI.md)

const BOX = 'flex flex-col gap-3 rounded-xl border border-solid border-border bg-white p-5';
const TH = 'border-0 bg-transparent px-2 py-3.5 text-[13px] font-medium text-muted-foreground';
const TD = 'border-0 border-t border-solid border-line-soft px-2 py-2.5 align-middle';
const FIELD = 'flex flex-col gap-1.5 text-[13px] text-muted-foreground';

export function AiSettingsPage() {
  const [enabled, setEnabled] = useState(true);
  const [mode, setMode] = useState<Mode>('connector');
  const [tasks, setTasks] = useState(TASKS.map(t => t[3]));
  const [copied, setCopied] = useState(false);
  return (
    <AdminLayout nav="ai">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <h1 className="m-0 text-[28px]">AI asistent<Tip k="ai.title" align="right" /></h1>
          <p className="mt-1 mb-0 max-w-[760px] text-[15px] text-muted-foreground">AI je dodatak, ne obaveza. Sve se može uraditi ručno; AI samo priprema predlog koji majstor proverava.</p>
        </div>
        <label className="ml-auto flex min-h-11 cursor-pointer items-center gap-2.5 text-[15px] font-semibold">
          <Checkbox className="size-5" checked={enabled} onCheckedChange={v => setEnabled(v === true)} />AI uključen za radionicu</label>
      </div>
      <section aria-labelledby="ai-modes" style={{ opacity: enabled ? 1 : 0.45 }}>
        <div id="ai-modes" className="mb-2.5 text-[14px] font-semibold">Kako se AI plaća i pokreće<Tip k="ai.modes" align="right" /></div>
        <RadioGroup value={mode} onValueChange={v => setMode(v as Mode)} disabled={!enabled} aria-labelledby="ai-modes" className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-3.5">
          {MODES.map(([id, t, tag, d]) => (
            <label key={id} className={cn('flex cursor-pointer flex-col gap-2 rounded-xl border border-solid border-border bg-white p-4', mode === id && 'border-2 border-primary')}>
              <span className="flex items-center gap-2.5"><RadioGroupItem value={id} /><strong className="text-[16px]">{t}</strong></span>
              <span className="text-[12px] font-semibold tracking-[0.04em] text-primary uppercase">{tag}</span>
              <span className="text-[14px] leading-normal text-ink-2">{d}</span>
            </label>
          ))}
        </RadioGroup>
      </section>
      {mode === 'connector' && (
        <section className={BOX}>
          <h2 className="m-0 text-[17px]">Poveži {BRAND.name} sa Claude-om</h2>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md border border-solid border-border bg-background px-3 py-2.5 font-mono text-[15px]">{MCP_URL}</span>
            <Button size="none" className="min-h-11 border border-solid border-foreground bg-dark px-3.5 py-2.5 text-[14px] font-normal" onClick={() => { void navigator.clipboard?.writeText(MCP_URL); setCopied(true); }}>{copied ? 'Kopirano' : 'Kopiraj adresu'}</Button>
          </div>
          <ol className="m-0 flex flex-col gap-1.5 pl-5 text-[14px] leading-normal">
            <li>U Claude-u otvori Customize → Connectors → Add custom connector i nalepi adresu.</li>
            <li>Prijavi se {BRAND.name} nalogom — Claude dobija pristup samo projektima tvoje radionice.</li>
            <li>U Claude-u pošalji sliku prostora i izaberi {BRAND.name} zadatak (npr. „Prepoznaj zidove i instalacije"). Predlog stiže u {BRAND.name} na proveru.</li>
          </ol>
        </section>
      )}
      {mode === 'key' && (
        <section className={BOX}>
          <h2 className="m-0 text-[17px]">Sopstveni API ključ</h2>
          <label className={FIELD}>Anthropic API ključ (iz Claude Console)<Input className="h-auto border-border py-2.5 font-mono text-[15px]" type="password" autoComplete="off" placeholder="sk-ant-…" /></label>
          <label className={FIELD}>Mesečni limit potrošnje (USD)<Input className="h-auto max-w-[200px] border-border py-2.5 font-mono text-[15px]" type="text" inputMode="numeric" placeholder="[IZNOS]" /></label>
          <p className="m-0 text-[13px] text-muted-foreground">Ključ se čuva šifrovano i koristi samo za zahteve tvoje radionice.</p>
        </section>
      )}
      {mode === 'credits' && (
        <section className={cn(BOX, 'flex-row flex-wrap items-center gap-5')}>
          <div><div className="text-[13px] text-muted-foreground">AI krediti ovog meseca</div><div className="font-mono text-[26px] font-semibold">[BROJ] / [BROJ]</div></div>
          <Button variant="dark" size="none" className="ml-auto min-h-11 cursor-default px-3.5 py-2.5 text-[14px]" aria-disabled="true" title="Uskoro">Dokupi kredite</Button>
        </section>
      )}
      <section aria-label="Predefinisani zadaci" className="overflow-x-auto rounded-xl border border-solid border-border bg-white px-5 pt-2 pb-5">
        <Table className="min-w-[720px] text-[14px]">
          <TableHeader><TableRow>
            <TableHead className={cn(TH, 'pl-0')}>Predefinisani zadatak</TableHead><TableHead className={TH}>Gde se pojavljuje</TableHead>
            <TableHead className={TH}>Šta sme da menja</TableHead><TableHead className={cn(TH, 'pr-0')}>Uključen</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {TASKS.map(([t, where, what], i) => (
              <TableRow key={t}><TableCell className={cn(TD, 'pl-0')}>{t}</TableCell><TableCell className={cn(TD, 'text-ink-2')}>{where}</TableCell><TableCell className={cn(TD, 'text-ink-2')}>{what}</TableCell>
                <TableCell className={cn(TD, 'pr-0')}><Checkbox className="align-middle" aria-label={`Uključen: ${t}`} checked={tasks[i]} onCheckedChange={v => setTasks(tasks.map((x, j) => (j === i ? v === true : x)))} /></TableCell></TableRow>
            ))}
          </TableBody>
        </Table>
        <Button variant="outline" size="none" className="mt-3 min-h-10 cursor-default border-dashed border-muted-foreground px-3 py-2 text-[14px]" aria-disabled="true" title="Uskoro">+ Sopstveni zadatak radionice</Button>
      </section>
      <section className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4 rounded-xl bg-dark p-5 text-[14px] leading-normal text-background">
        {[['Uvek predlog', 'AI nikad ne menja projekat direktno — sve ide na listu „Prihvati / Izmeni".'],
          ['Mere metrom', 'Sa slike se mere procenjuju; bar jedna izmerena mera je obavezna pre prenosa.'],
          ['Istorija i poništavanje', 'Svaka AI izmena je zabeležena i može se vratiti jednim klikom.']].map(([t, d]) => (
          <div key={t}><strong className="mb-1 block">{t}</strong><span className="text-on-dark-muted">{d}</span></div>
        ))}
      </section>
    </AdminLayout>
  );
}
