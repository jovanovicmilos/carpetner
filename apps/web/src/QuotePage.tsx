// Quote screen (design/screens/Obracun.html): sheets + saw shop, hardware, labour, margin, VAT, from the cut list × price list.
// Prices come from Admin → Cenovnik (prices.ts); once a PDF is made they are frozen for the project (quotes.ts) until "Preračunaj".
// "Pošalji kupcu": system share sheet with the PDF (tablet/phone), else PDF download + mailto. shortcut: no server e-mail until the backend.
// "Napravi PDF" downloads quotePdf.ts (loaded on demand: pdf-lib + font).
import { DEFAULT_QUOTE, PRESETS, quote } from 'engine';
import { pricedProject, usePrices } from './prices';
import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { ALERT, APP, STEP_DONE } from './ui';
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

  const TD = 'border-0 border-t border-solid border-line-soft px-2 py-[9px] align-middle';
  const TH = 'border-0 bg-transparent p-2 text-[13px] font-medium text-muted-foreground';
  const ROW = 'flex justify-between text-[14px]';
  const BTN = 'min-h-11 border-border text-[15px] font-normal';
  return (
    <div className={APP}>
      <Header />
      <div className="mx-auto box-border flex w-full max-w-[1360px] flex-wrap items-start gap-5 p-6">
        <div className="flex min-w-0 flex-[999_1_640px] flex-col gap-5">
          <div>
            <h1 className="m-0 text-[28px]">Obračun kuhinje</h1>
            <p className="mt-1 mb-0 text-[15px] text-muted-foreground">Izračunato automatski iz krojne liste × cenovnik radionice · cene u RSD bez PDV-a</p>
          </div>
          {/* Step Ponuda in words (user 2026-11-22 did not know how to finish it): prices check themselves, sending can be marked by hand. */}
          <div role="group" aria-label="Korak Ponuda" className={cn('flex flex-wrap items-center gap-x-5 gap-y-2 rounded-lg border border-solid border-border bg-white px-3.5 py-2.5 text-[14px]', project.marks?.priced && project.marks.offerSent && STEP_DONE)}>
            <strong>Korak Ponuda</strong>
            <span className={cn(project.marks?.priced && 'font-semibold text-ok')}>{project.marks?.priced ? '✓ Cene obračunate' : '○ Cene obračunate — dodaj u Cenovnik cene koje fale'}</span>
            <span className={cn(project.marks?.offerSent && 'font-semibold text-ok')}>{project.marks?.offerSent ? '✓ Ponuda poslata kupcu' : '○ Ponuda poslata kupcu — napravi PDF ponudu ili je pošalji (desno), ili gore desno „Označi kao poslatu”'}</span>
          </div>
          {q.unpriced.length > 0 && (
            <div className={ALERT} role="alert">Nema cene u cenovniku za: {q.unpriced.join(', ')} — ove ploče su računate 0 RSD. Dodaj cenu u <Link to="/admin/cenovnik">Cenovnik</Link>.</div>
          )}
          {issued && (
            <div role="status" className={cn('flex flex-wrap items-center gap-x-3.5 gap-y-2.5 rounded-lg px-3.5 py-2.5 text-[14px]',
              sameCenovnik(issued.frozen, current) ? 'bg-ok-soft text-ok' : 'border border-solid border-warn-line bg-warn-soft text-warn-ink')}>
              <span>{sameCenovnik(issued.frozen, current)
                ? `Cene su zamrznute u ponudi od ${new Date(issued.createdAt).toLocaleDateString('sr-Latn')} (ukupno ${rsd(issued.total)} RSD).`
                : `Cenovnik je promenjen posle ponude od ${new Date(issued.createdAt).toLocaleDateString('sr-Latn')}. Obračun i dalje koristi cene iz ponude.`}</span>
              {!sameCenovnik(issued.frozen, current) && (
                <Button size="none" className="min-h-9 px-3 text-[13px]" onClick={() => { drop(project.id); setMargin(String(current.marginPct)); }}>Preračunaj po novom cenovniku</Button>
              )}
            </div>
          )}
          {q.sections.map((s, i) => (
            <section key={s.title} className="rounded-xl border border-solid border-border bg-white p-5" aria-label={s.title}>
              <h2 className="mt-0 mb-2.5 text-[17px]">{i + 1} · {s.title}{tips[i] && <Tip k={tips[i]!} align="right" />}</h2>
              <div className={i < 2 ? 'overflow-x-auto' : undefined}>
                <Table className={cn('text-[14px]', i < 2 && 'min-w-[560px]')}>
                  {i === 0 && <TableHeader><TableRow>
                    <TableHead className={cn(TH, 'pl-0')}>Stavka</TableHead><TableHead className={cn(TH, 'text-right')}>Količina</TableHead>
                    <TableHead className={cn(TH, 'text-right')}>Cena</TableHead><TableHead className={cn(TH, 'pr-0 text-right')}>Iznos</TableHead>
                  </TableRow></TableHeader>}
                  <TableBody className="font-mono">
                    {s.lines.map(l => <TableRow key={l.name}><TableCell className={cn(TD, 'pl-0 font-sans')}>{l.name}</TableCell><TableCell className={cn(TD, 'text-right')}>{l.qty}</TableCell>
                      <TableCell className={cn(TD, 'text-right')}>{l.price}</TableCell><TableCell className={cn(TD, 'pr-0 text-right')}>{rsd(l.amount)}</TableCell></TableRow>)}
                    <TableRow className="font-semibold [&>td]:border-t-2 [&>td]:border-foreground [&>td]:py-2.5">
                      <TableCell className={cn(TD, 'pl-0 font-sans')}>Ukupno {i + 1}</TableCell><TableCell className={TD} /><TableCell className={TD} /><TableCell className={cn(TD, 'pr-0 text-right')}>{rsd(s.total)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </section>
          ))}
        </div>
        <aside aria-label="Ukupna cena" className="flex min-w-0 flex-[1_1_340px] flex-col gap-4">
          <section className="flex flex-col gap-2.5 rounded-xl bg-dark p-[22px] text-background">
            <h2 className="mt-0 mb-1 text-[17px]">Cena kuhinje<Tip k="quote.total" align="left" /></h2>
            {([['Materijal i pilana', q.material], ['Okov i repro', q.hardware], ['Rad', q.labour], [`Marža ${opt.marginPct}% na materijal i okov`, q.margin]] as const).map(([t, v]) => (
              <div key={t} className={ROW}><span className="text-on-dark-muted">{t}</span><span className="font-mono">{rsd(v)}</span></div>
            ))}
            {q.discount > 0 && <div className={ROW}><span className="text-on-dark-muted">Popust {opt.discountPct}%</span><span className="font-mono">−{rsd(q.discount)}</span></div>}
            <div className={cn(ROW, 'border-0 border-t border-solid border-muted-foreground pt-2.5 text-[15px]')}><span>Bez PDV-a</span><span className="font-mono">{rsd(q.net)}</span></div>
            <div className={ROW}><span className="text-on-dark-muted">PDV {opt.vatPct}%</span><span className="font-mono">{rsd(q.vat)}</span></div>
            <div className={cn(ROW, 'items-baseline border-0 border-t border-solid border-muted-foreground pt-3 text-[15px]')}><span>Ukupno</span><span className="font-mono text-[30px] font-semibold text-[#A9D6BA]">{rsd(q.total)} RSD</span></div>
            <p className="m-0 text-[12px] leading-normal text-[#C9C3B8]">Aparati (rerna, ploča, MSP, frižider, sudopera) nisu uključeni — kupac ih nabavlja.</p>
          </section>
          <section className="flex flex-col gap-3 rounded-xl border border-solid border-border bg-white p-5">
            <h2 className="m-0 text-[16px]">Prilagodi ponudu<Tip k="quote.adjust" align="left" /></h2>
            <label className="flex flex-col gap-1 text-[13px] text-muted-foreground">Marža (%)<Input className="h-auto border-border px-2.5 py-[9px] font-mono text-[15px]" type="text" inputMode="numeric" value={margin} onChange={e => setMargin(e.target.value)} /></label>
            <label className="flex flex-col gap-1 text-[13px] text-muted-foreground">Popust kupcu (%)<Input className="h-auto border-border px-2.5 py-[9px] font-mono text-[15px]" type="text" inputMode="numeric" value={discount} onChange={e => setDiscount(e.target.value)} /></label>
            <LockedButton feature="quote.full" label="Ponuda sa stavkama">
              <label className="flex min-h-10 cursor-pointer items-center gap-2.5 text-[14px] text-foreground"><Checkbox checked={onlyTotal} onCheckedChange={v => setOnlyTotal(v === true)} />Prikaži kupcu samo ukupnu cenu</label>
            </LockedButton>
            <Button size="none" className="min-h-12 text-[15px]" disabled={busy} onClick={() => run('download')}>{busy ? 'Pravim PDF…' : 'Napravi PDF ponudu sa 3D slikom'}</Button>
            {pdfError && <div className={ALERT} role="alert">{pdfError}</div>}
            {ready && <Button size="none" className="min-h-12 text-[15px]" onClick={retry}>PDF je spreman — pošalji</Button>}
            <Button variant="outline" size="none" className={BTN} disabled={busy} onClick={() => run('send')}>Pošalji kupcu na e-poštu</Button>
          </section>
          <KrojOffer projectId={project.id} total={q.total} vatPct={opt.vatPct} onSent={freeze}
            makePdf={() => import('./quotePdf').then(m => m.quotePdf({ project, q, opt, onlyTotal, worktopThickness: dims.worktopThickness, date: new Date() }))} />
        </aside>
      </div>
    </div>
  );
}
