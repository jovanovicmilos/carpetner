// Quote screen (design/screens/Obracun.html): sheets + saw shop, hardware, labour, margin, VAT, from the cut list × price list.
// Prices come from Admin → Cenovnik (prices.ts); once a PDF is made they are frozen for the project (quotes.ts) until "Preračunaj".
// "Pošalji kupcu": system share sheet with the PDF (tablet/phone), else PDF download + mailto. shortcut: no server e-mail until the backend.
// "Napravi PDF" downloads quotePdf.ts (loaded on demand: pdf-lib + font).
import { DEFAULT_QUOTE, PRESETS, quote } from 'engine';
import { pricedProject, usePrices } from './prices';
import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { AlertTriangle, Check, Circle, FileDown, Mail, RefreshCw } from 'lucide-react';
import { FIELD } from './fields';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { APP, STEP_DONE } from './ui';
import { Header } from './Header';
import { Tip } from './help';
import { num } from './labels';
import { markProject, useProject } from './store';
import { LockedButton, useCan } from './locks';
import { downloadFiles, useShare } from './share';
import { sameCenovnik, useQuotes } from './quotes';
import { KrojOffer } from './KrojOffer';

const rsd = (p: number) => Math.round(p / 100).toLocaleString('sr-Latn');

export function QuotePage() {
  const project = useProject(s => s.project);
  const current = usePrices();
  const issued = useQuotes(s => (project ? s.byProject[project.id] : undefined));
  const { issue, drop } = useQuotes();
  // A made quote keeps its prices; the current Cenovnik applies again only after "Preračunaj".
  const settings = issued ? { ...issued.frozen, marginPct: issued.marginPct } : current;
  const { prices, vatPct } = settings;
  const [margin, setMargin] = useState(String(issued?.marginPct ?? current.marginPct));
  const [discount, setDiscount] = useState(String(issued?.discountPct ?? DEFAULT_QUOTE.discountPct));
  const [onlyTotalPick, setOnlyTotal] = useState(true);
  const full = useCan('quote.full');
  const onlyTotal = onlyTotalPick || !full; // Start: simple offer, total only
  const [busy, setBusy] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const { share, ready, retry } = useShare();
  // Step Ponuda: prices are calculated once the quote is open with every board priced; the PDF made = sent to the customer.
  const allPriced = !!project && quote(pricedProject(project, settings), settings.prices, DEFAULT_QUOTE).unpriced.length === 0;
  useEffect(() => { if (allPriced) markProject({ priced: true }); }, [allPriced]);
  if (!project) return <Navigate to="/brzi-start" replace />;
  const dims = PRESETS[project.presetId === 'none' ? 'workshop' : project.presetId];
  const opt = { ...DEFAULT_QUOTE, vatPct, marginPct: Math.min(200, num(margin)), discountPct: Math.min(100, num(discount)) };
  const q = quote(pricedProject(project, settings), prices, opt, dims.worktopDepth);
  const tips = ['quote.sheets', null, null] as const;
  /** Issues the quote: prices are frozen for the project (PDF made, or offer sent in Kroj). */
  const freeze = () => {
    const { prices: fp, vatPct: fv, wastePct, rounding } = settings;
    issue(project.id, { frozen: { prices: fp, vatPct: fv, wastePct, rounding }, marginPct: opt.marginPct, discountPct: opt.discountPct, total: q.total, createdAt: new Date().toISOString() });
    markProject({ offerSent: true });
  };

  /** Makes the PDF (and freezes the prices: the quote is issued), then downloads or shares it. */
  async function run(how: 'download' | 'send') {
    setBusy(true); setPdfError(null);
    try {
      const { quotePdf } = await import('./quotePdf');
      const bytes = await quotePdf({ project: project!, q, opt, onlyTotal, worktopThickness: dims.worktopThickness, date: new Date() });
      const slug = project!.name.toLowerCase().normalize('NFD').replace(/[^\w]+/g, '-').replace(/^-|-$/g, '') || 'kuhinja'; // as Nacrti exports
      const file = new File([bytes as Uint8Array<ArrayBuffer>], `ponuda-${slug}.pdf`, { type: 'application/pdf' });
      freeze();
      const subject = `Ponuda — ${project!.name}`;
      const body = `Poštovani,\n\nu prilogu je ponuda za kuhinju „${project!.name}“: ukupno ${rsd(q.total)} RSD sa PDV-om.\nAparati (rerna, ploča, MSP, frižider, sudopera) nisu uključeni.\n\nSrdačan pozdrav`;
      // Tablet / phone: the system share sheet sends the PDF itself (Mail, Viber, WhatsApp…).
      if (how === 'send' && await share({ files: [file], title: subject, text: body })) return;
      downloadFiles([file]);
      // Computer: the PDF is downloaded; a new e-mail opens with the text, the PDF is attached by hand (mailto cannot attach).
      if (how === 'send') window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body + '\n\n(PDF ponude je preuzet — priložite ga.)')}`;
    } catch (err) {
      console.error(err);
      setPdfError('PDF nije napravljen. Pokušaj ponovo; ako se ponovi, javi nam.');
    } finally { setBusy(false); }
  }

  const ROW = 'flex justify-between text-sm';
  const CARD = 'rounded-xl border bg-card p-6 shadow-sm';
  const STATE = (ok?: boolean) => cn('inline-flex items-center gap-1.5', ok ? 'font-medium text-ok' : 'text-muted-foreground');
  return (
    <div className={APP}>
      <Header />
      <div className="mx-auto box-border flex w-full max-w-[1360px] flex-wrap items-start gap-5 p-6">
        <div className="flex min-w-0 flex-[999_1_640px] flex-col gap-5">
          <div>
            <h1 className="m-0 text-3xl font-semibold">Obračun kuhinje</h1>
            <p className="mt-1 mb-0 text-muted-foreground">Izračunato automatski iz krojne liste × cenovnik radionice · cene u RSD bez PDV-a</p>
          </div>
          {/* Step Ponuda in words (user 2026-11-22 did not know how to finish it): prices check themselves, sending can be marked by hand. */}
          <div role="group" aria-label="Korak Ponuda" className={cn('flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border bg-card px-4 py-3 text-sm shadow-sm', project.marks?.priced && project.marks.offerSent && STEP_DONE)}>
            <strong className="font-semibold">Korak Ponuda</strong>
            <span className={STATE(project.marks?.priced)}>{project.marks?.priced ? <Check className="size-4" /> : <Circle className="size-3.5" />}{project.marks?.priced ? 'Cene obračunate' : 'Cene obračunate — dodaj u Cenovnik cene koje fale'}</span>
            <span className={STATE(project.marks?.offerSent)}>{project.marks?.offerSent ? <Check className="size-4" /> : <Circle className="size-3.5" />}{project.marks?.offerSent ? 'Ponuda poslata kupcu' : 'Ponuda poslata kupcu — napravi PDF ponudu ili je pošalji (desno), ili gore desno „Označi kao poslatu”'}</span>
          </div>
          {q.unpriced.length > 0 && (
            <Alert role="alert" className="border-warn-line bg-warn-soft text-warn-ink"><AlertTriangle /><AlertDescription className="text-warn-ink">Nema cene u cenovniku za: {q.unpriced.join(', ')} — ove ploče su računate 0 RSD. Dodaj cenu u <Link to="/admin/cenovnik">Cenovnik</Link>.</AlertDescription></Alert>
          )}
          {issued && (
            <div role="status" className={cn('flex flex-wrap items-center gap-x-3.5 gap-y-2.5 rounded-lg border px-4 py-3 text-sm',
              sameCenovnik(issued.frozen, current) ? 'border-ok-strong bg-ok-soft text-ok' : 'border-warn-line bg-warn-soft text-warn-ink')}>
              <span>{sameCenovnik(issued.frozen, current)
                ? `Cene su zamrznute u ponudi od ${new Date(issued.createdAt).toLocaleDateString('sr-Latn')} (ukupno ${rsd(issued.total)} RSD).`
                : `Cenovnik je promenjen posle ponude od ${new Date(issued.createdAt).toLocaleDateString('sr-Latn')}. Obračun i dalje koristi cene iz ponude.`}</span>
              {!sameCenovnik(issued.frozen, current) && (
                <Button size="sm" onClick={() => { drop(project.id); setMargin(String(current.marginPct)); }}><RefreshCw />Preračunaj po novom cenovniku</Button>
              )}
            </div>
          )}
          {q.sections.map((s, i) => (
            <section key={s.title} className={CARD} aria-label={s.title}>
              <h2 className="mt-0 mb-3 flex items-center text-lg font-semibold">{i + 1} · {s.title}{tips[i] && <Tip k={tips[i]!} align="right" />}</h2>
              <div className={i < 2 ? 'overflow-x-auto' : undefined}>
                <Table className={cn(i < 2 && 'min-w-[560px]')}>
                  {i === 0 && <TableHeader><TableRow>
                    <TableHead className="pl-0 text-muted-foreground">Stavka</TableHead><TableHead className="text-right text-muted-foreground">Količina</TableHead>
                    <TableHead className="text-right text-muted-foreground">Cena</TableHead><TableHead className="pr-0 text-right text-muted-foreground">Iznos</TableHead>
                  </TableRow></TableHeader>}
                  <TableBody className="font-mono">
                    {s.lines.map(l => <TableRow key={l.name}><TableCell className="pl-0 font-sans whitespace-normal">{l.name}</TableCell><TableCell className="text-right">{l.qty}</TableCell>
                      <TableCell className="text-right">{l.price}</TableCell><TableCell className="pr-0 text-right">{rsd(l.amount)}</TableCell></TableRow>)}
                    <TableRow className="font-semibold hover:bg-transparent [&>td]:border-t-2 [&>td]:border-solid [&>td]:border-foreground">
                      <TableCell className="pl-0 font-sans">Ukupno {i + 1}</TableCell><TableCell /><TableCell /><TableCell className="pr-0 text-right">{rsd(s.total)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </section>
          ))}
        </div>
        <aside aria-label="Ukupna cena" className="flex min-w-0 flex-[1_1_340px] flex-col gap-4">
          <section className="flex flex-col gap-2.5 rounded-xl bg-dark p-6 text-background shadow-sm">
            <h2 className="mt-0 mb-1 flex items-center text-lg font-semibold">Cena kuhinje<Tip k="quote.total" align="left" /></h2>
            {([['Materijal i pilana', q.material], ['Okov i repro', q.hardware], ['Rad', q.labour], [`Marža ${opt.marginPct}% na materijal i okov`, q.margin]] as const).map(([t, v]) => (
              <div key={t} className={ROW}><span className="text-on-dark-muted">{t}</span><span className="font-mono">{rsd(v)}</span></div>
            ))}
            {q.discount > 0 && <div className={ROW}><span className="text-on-dark-muted">Popust {opt.discountPct}%</span><span className="font-mono">−{rsd(q.discount)}</span></div>}
            <div className={cn(ROW, 'border-0 border-t border-solid border-muted-foreground pt-2.5 text-[15px]')}><span>Bez PDV-a</span><span className="font-mono">{rsd(q.net)}</span></div>
            <div className={ROW}><span className="text-on-dark-muted">PDV {opt.vatPct}%</span><span className="font-mono">{rsd(q.vat)}</span></div>
            <div className={cn(ROW, 'items-baseline border-0 border-t border-solid border-muted-foreground pt-3 text-[15px]')}><span>Ukupno</span><span className="font-mono text-[30px] font-semibold text-[#A9D6BA]">{rsd(q.total)} RSD</span></div>
            <p className="m-0 text-[12px] leading-normal text-[#C9C3B8]">Aparati (rerna, ploča, MSP, frižider, sudopera) nisu uključeni — kupac ih nabavlja.</p>
          </section>
          <section className={cn(CARD, 'flex flex-col gap-4')}>
            <h2 className="m-0 flex items-center text-lg font-semibold">Prilagodi ponudu<Tip k="quote.adjust" align="left" /></h2>
            <label className={FIELD}>Marža (%)<Input className="font-mono font-normal" type="text" inputMode="numeric" value={margin} onChange={e => setMargin(e.target.value)} /></label>
            <label className={FIELD}>Popust kupcu (%)<Input className="font-mono font-normal" type="text" inputMode="numeric" value={discount} onChange={e => setDiscount(e.target.value)} /></label>
            <LockedButton feature="quote.full" label="Ponuda sa stavkama">
              <Label className="cursor-pointer font-normal"><Switch checked={onlyTotal} onCheckedChange={setOnlyTotal} />Prikaži kupcu samo ukupnu cenu</Label>
            </LockedButton>
            <Button size="lg" disabled={busy} onClick={() => run('download')}><FileDown />{busy ? 'Pravim PDF…' : 'Napravi PDF ponudu sa 3D slikom'}</Button>
            {pdfError && <Alert role="alert" className="border-warn-line bg-warn-soft"><AlertTriangle className="text-warn-ink" /><AlertDescription className="text-warn-ink">{pdfError}</AlertDescription></Alert>}
            {ready && <Button size="lg" onClick={retry}>PDF je spreman — pošalji</Button>}
            <Button variant="outline" size="lg" disabled={busy} onClick={() => run('send')}><Mail />Pošalji kupcu na e-poštu</Button>
          </section>
          <KrojOffer projectId={project.id} total={q.total} vatPct={opt.vatPct} onSent={freeze}
            makePdf={() => import('./quotePdf').then(m => m.quotePdf({ project, q, opt, onlyTotal, worktopThickness: dims.worktopThickness, date: new Date() }))} />
        </aside>
      </div>
    </div>
  );
}
