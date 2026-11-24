// "Link za kupca" (user 2026-11-25): /k/:token — the kitchen read-only, without an account: realistic 3D + a short summary.
// The workshop makes / removes the link in the 3D canvas toolbar (ShareLink.tsx); the API answers 404 for a removed one.
import type { Project } from 'engine';
import { lazy, Suspense, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { BRAND, BrandMark } from './brand';
import { realPalette } from './look';
import { api } from './session';

const SceneGL = lazy(() => import('./SceneGL').then(m => ({ default: m.SceneGL })));
type Shared = { name: string; customer: string; workshop: string | null; updatedAt: string; data: Project };

export function SharedKitchen() {
  const { token } = useParams();
  const [k, setK] = useState<Shared | 'missing' | null>(null);
  useEffect(() => { api<Shared>('GET', `/share/${encodeURIComponent(token ?? '')}`).then(setK, () => setK('missing')); }, [token]);

  const header = (title?: string, sub?: string | null) => (
    <header className="flex h-14 flex-none items-center gap-3 bg-dark px-4 text-background">
      <Link to="/" aria-label={`${BRAND.name} — početna`} className="inline-flex text-inherit"><BrandMark size={26} /></Link>
      {title && <span className="flex min-w-0 flex-col leading-tight"><strong className="truncate text-[15px]">{title}</strong>{sub && <span className="truncate text-xs text-on-dark-muted">{sub}</span>}</span>}
      <span className="ml-auto text-xs text-on-dark-muted">samo za pregled</span>
    </header>
  );
  if (k === null) return <div className="flex h-dvh flex-col bg-background">{header()}</div>;
  if (k === 'missing') return (
    <div className="flex h-dvh flex-col bg-background">{header()}
      <main className="mx-auto mt-16 w-full max-w-md px-4">
        <Alert className="border-warn-line bg-warn-soft"><AlertTriangle className="text-warn-ink" />
          <AlertDescription className="text-warn-ink">Link nije važeći ili ga je radionica isključila. Zatraži novi link od radionice.</AlertDescription></Alert>
      </main>
    </div>
  );
  const p = k.data, lower = p.elements.filter(e => e.kind !== 'wall').length, upper = p.elements.length - lower;
  return (
    <div className="flex h-dvh flex-col bg-background">
      {header(k.name || 'Kuhinja', [k.workshop, k.customer && `za: ${k.customer}`].filter(Boolean).join(' · ') || null)}
      <main className="relative min-h-0 flex-1 bg-[#E9E6DF]" aria-label={`3D prikaz kuhinje ${k.name}`}>
        <Suspense fallback={null}>
          <SceneGL project={p} cam="iso" solid sel={null} onSel={() => {}} layers={{ walls: true, carcass: true, fronts: true, tops: true }} real={realPalette(p)} noOpen />
        </Suspense>
        <div className="absolute bottom-5 left-5 rounded-lg border bg-white px-4 py-3 text-sm shadow-sm">
          <div className="font-medium">{lower} donjih i visokih · {upper} gornjih elemenata</div>
          <div className="text-xs text-muted-foreground">Izmenjeno {new Date(k.updatedAt).toLocaleDateString('sr-Latn')} · okreći mišem ili prstom</div>
        </div>
      </main>
    </div>
  );
}
