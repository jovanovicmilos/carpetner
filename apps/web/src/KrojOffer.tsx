// Obračun → "Ponuda kupcu u Kroju": shown when the open project is a workshop's working copy of a customer request (Upiti →
// Preuzmi projekat). Sends the quote's total as a new offer version (apps/api /requests/:id/offers) and freezes the prices
// like the PDF does; the customer sees it on Ponude. Not in the Obracun reference: a small card under "Prilagodi ponudu".
// shortcut: the PDF is not attached to the offer (the customer sees the summary); offer texts are free text per sending.
import { useEffect, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { FIELD as LABEL } from './fields';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useProjects } from './projects';
import { api, ApiError, base64, errorText, useSession } from './session';

interface Offer { version: number; total: number; status: 'sent' | 'accepted' | 'declined'; createdAt: string; hasPdf?: boolean }
interface Req { id: string; customer: string; workshopProjectId?: string; offer?: Offer | null }
const STATUS: Record<Offer['status'], string> = { sent: 'čeka odgovor kupca', accepted: 'kupac je prihvatio', declined: 'kupac je odbio' };
const FIELD = 'font-normal';

/** `total` in para (quote total with VAT); `onSent` freezes the prices of the quote; `makePdf` = the quote PDF, sent along. */
export function KrojOffer({ projectId, total, vatPct, onSent, makePdf }: { projectId: string; total: number; vatPct: number; onSent: () => void; makePdf: () => Promise<Uint8Array> }) {
  const shopId = useSession(s => (s.session ? s.workshops[0]?.id : undefined));
  const serverId = useProjects(s => s.list[projectId]?.serverId);
  const [req, setReq] = useState<Req | null>(null);
  const [f, setF] = useState({ validDays: '15', advancePct: '40', leadTime: '5 nedelja od merenja', included: 'elementi, radna ploča, okov, prevoz, montaža', excluded: 'aparati, sudopera i slavina, električni radovi' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!shopId || !serverId) return;
    api<Req[]>('GET', `/organizations/${shopId}/requests`).then(l => setReq(l.find(r => r.workshopProjectId === serverId) ?? null)).catch(() => {});
  }, [shopId, serverId]);
  if (!req) return null;

  const open = req.offer?.status === 'accepted';
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  async function send() {
    setBusy(true); setError('');
    try {
      // The customer cannot rebuild the PDF (the prices live here), so it goes with the offer; without it the offer still goes.
      const bytes = await makePdf().catch(() => null);
      const offer = await api<Offer>('POST', `/requests/${req!.id}/offers`, {
        ...(bytes && bytes.length <= 4e6 && { pdf: base64(bytes) }), total, vatPct, validDays: parseInt(f.validDays, 10) || 15, advancePct: parseInt(f.advancePct, 10) || 0,
        leadTime: f.leadTime, included: f.included, excluded: f.excluded,
      });
      setReq({ ...req!, offer });
      onSent();
    } catch (e) { setError(errorText(e instanceof ApiError ? e.code : 'server')); }
    finally { setBusy(false); }
  }
  return (
    <section aria-labelledby="kro-h" className="flex flex-col gap-4 rounded-xl border-2 border-solid border-primary bg-card p-6 shadow-sm">
      <div>
        <h2 id="kro-h" className="m-0 text-lg font-semibold">Ponuda kupcu u Kroju</h2>
        <p className="mt-1 mb-0 text-sm text-muted-foreground">Upit od {req.customer || 'kupca'} · kupac vidi ponudu na svojoj stranici Ponude.</p>
      </div>
      {req.offer && <div role="status" className="rounded-lg border border-[#B9D8BF] bg-accent-lightest px-3 py-2 text-sm text-accent-ink">
        Ponuda v{req.offer.version} od {new Date(req.offer.createdAt).toLocaleDateString('sr-Latn')}: {Math.round(req.offer.total / 100).toLocaleString('sr-Latn')} RSD — {STATUS[req.offer.status]}{req.offer.hasPdf ? ' · PDF priložen' : ''}.</div>}
      {!open && <>
        <div className="grid grid-cols-2 gap-2.5">
          <label className={LABEL}>Važi (dana)<Input type="number" min={1} max={365} value={f.validDays} onChange={set('validDays')} className={FIELD} /></label>
          <label className={LABEL}>Avans (%)<Input type="number" min={0} max={100} value={f.advancePct} onChange={set('advancePct')} className={FIELD} /></label>
        </div>
        <label className={LABEL}>Rok izrade<Input value={f.leadTime} onChange={set('leadTime')} className={FIELD} /></label>
        <label className={LABEL}>Uključeno<Textarea rows={2} value={f.included} onChange={set('included')} className="font-normal" /></label>
        <label className={LABEL}>Nije uključeno<Textarea rows={2} value={f.excluded} onChange={set('excluded')} className="font-normal" /></label>
        {error && <Alert role="alert" variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
        <Button size="lg" disabled={busy} onClick={() => void send()} className="h-auto min-h-10 py-2 whitespace-normal">
          {busy ? 'Šaljem…' : `Pošalji ponudu kupcu (v${(req.offer?.version ?? 0) + 1}) — ${Math.round(total / 100).toLocaleString('sr-Latn')} RSD`}</Button>
        <p className="m-0 text-xs text-muted-foreground">{req.offer ? 'Nova verzija zamenjuje prethodnu ponudu.' : 'Slanjem se cene u ovom obračunu zamrzavaju, kao i kod PDF ponude.'}</p>
      </>}
    </section>
  );
}
