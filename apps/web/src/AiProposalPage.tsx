// AI proposal from a photo (design/screens/AIPredlog.html): the AI proposes, the joiner accepts; one measured length is required.
// shortcut: no AI call yet (docs/AI.md: MCP connector / in-app) — the screen reviews the example proposal of the design; the
// photo is only shown locally (never uploaded); a second photo comes with the real AI step.
import {
  applyProposal, DEFAULT_MATERIALS, DEFAULT_RULES, EXAMPLE_PROPOSAL, scaledItem, type Confidence, type Proposal, type ProposalItem,
} from 'engine';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Header } from './Header';
import { Tip } from './help';
import { num } from './labels';
import { APP_FIXED, SegmentedControl } from './ui';
import { useProject } from './store';
import { newProjectId } from './projects';

const PROMPTS: [string, string, string][] = [
  ['detect', 'Prepoznaj zidove i instalacije', 'Sa fotografija prepoznaj zidove, ugao, otvore i instalacije (voda, odvod, struja, gas). Mere izračunaj iz jedne izmerene mere. Za svaku stavku navedi sigurnost i ništa ne upisuj u projekat bez potvrde.'],
  ['layout', 'Predloži raspored kuhinje', 'Na osnovu prostora i instalacija predloži raspored elemenata: sudopera iznad vode i odvoda, rerna i ploča uz trofaznu utičnicu, frižider na kraju niza. Koristi podrazumevane mere radionice.'],
  ['photo-kitchen', 'Prepiši postojeću kuhinju sa slike', 'Sa slike gotove kuhinje prepoznaj elemente (donji, gornji, visoki), broj krila i fioka, i napravi ih kao elemente sa procenjenim širinama.'],
  ['check', 'Proveri projekat', 'Pronađi greške: instalacije iza pogrešnog elementa, mere van standarda, preklapanja, fronte bez okova, delove veće od ploče.'],
  ['cutlist', 'Objasni krojnu listu', 'Objasni krojnu listu ovog projekta i predloži uštedu ploča i kanta.'],
  ['quote', 'Napiši ponudu kupcu', 'Napiši kratak, jasan tekst ponude za kupca na osnovu obračuna, bez internih cena.'],
];
const CONF: Record<Confidence, string> = { high: 'visoka', medium: 'srednja', low: 'niska — proveri' };
const INST: Record<string, string> = { water: 'Voda T+H', drain: 'Odvod Ø50', power: 'Utičnica', power400: 'Trofazna 400 V', gas: 'Gas' };

function describe(p: Proposal, item: ProposalItem): [string, string] {
  const i = scaledItem(p, item), e = i.edited ? '' : '≈ ';
  switch (i.op) {
    case 'setWall': return [i.wallId === 'A' ? 'Zid A' : `Zid ${i.wallId}, ugao ${i.angle ?? 90}°`,
      p.referenceMeasurement?.wallId === i.wallId || i.edited ? `${i.length} mm (izmereno)` : `≈ ${i.length} mm`];
    case 'addOpening': return [`${i.opening.kind === 'window' ? 'Prozor' : 'Vrata'} na zidu ${i.opening.wallId}`,
      `od ugla ${e}${i.opening.offset}, š ${e}${i.opening.width}${i.opening.kind === 'window' ? `, parapet ${e}${i.opening.sill}` : ''}`];
    case 'addInstallation': return [INST[i.installation.kind], `zid ${i.installation.wallId}, od ugla ${e}${i.installation.offset}, h ${e}${i.installation.height}`];
  }
}

/** Editable measures of an item ("Izmeni"): label, value, item with the new value. */
function fields(i: ProposalItem): [string, number, (v: number) => ProposalItem][] {
  switch (i.op) {
    case 'setWall': return [['dužina', i.length, v => ({ ...i, length: v })]];
    case 'addOpening': {
      const o = i.opening, set = (k: 'offset' | 'width' | 'sill') => (v: number) => ({ ...i, opening: { ...o, [k]: v } });
      return [['od ugla', o.offset, set('offset')], ['širina', o.width, set('width')], ...(o.kind === 'window' ? [['parapet', o.sill, set('sill')] as [string, number, (v: number) => ProposalItem]] : [])];
    }
    case 'addInstallation': {
      const n = i.installation, set = (k: 'offset' | 'height') => (v: number) => ({ ...i, installation: { ...n, [k]: v } });
      return [['od ugla', n.offset, set('offset')], ['h', n.height, set('height')]];
    }
  }
}

export function AiProposalPage() {
  const navigate = useNavigate();
  const setProject = useProject(s => s.setProject);
  const [prompt, setPrompt] = useState('detect');
  const [measured, setMeasured] = useState(String(EXAMPLE_PROPOSAL.referenceMeasurement?.length ?? ''));
  const [acc, setAcc] = useState<Record<string, boolean>>(Object.fromEntries(EXAMPLE_PROPOSAL.items.map(i => [i.id, i.accepted])));
  const [photo, setPhoto] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, ProposalItem>>({});
  const [editing, setEditing] = useState<string | null>(null);
  const proposal: Proposal = { ...EXAMPLE_PROPOSAL, items: EXAMPLE_PROPOSAL.items.map(i => edits[i.id] ?? i),
    referenceMeasurement: num(measured) ? { wallId: 'A', length: num(measured) } : undefined };
  // Wall A is the reference measurement itself; any other edited measure is final and the item counts as accepted.
  const edit = (i: ProposalItem, patch: (v: number) => ProposalItem, v: number) => {
    if (i.op === 'setWall' && i.wallId === 'A') return setMeasured(String(v));
    setEdits({ ...edits, [i.id]: { ...patch(v), edited: true } });
    setAcc({ ...acc, [i.id]: true });
  };
  const accepted = proposal.items.filter(i => acc[i.id]).map(i => i.id);
  const blank = { id: newProjectId(), name: 'Novi prostor (AI)', unit: 'mm' as const, presetId: 'workshop' as const,
    room: { height: 2600, walls: [], openings: [], installations: [], obstacles: [] }, elements: [], rules: DEFAULT_RULES, materials: DEFAULT_MATERIALS };
  const transfer = () => {
    try { setProject(applyProposal(blank, proposal, accepted).project); navigate('/projekat'); }
    catch (e) { alert((e as Error).message); }
  };

  const PBTN = 'inline-flex min-h-10 cursor-pointer items-center rounded-md border-0 bg-white px-3 py-2 font-sans text-[13px] text-foreground';
  const IBTN = 'min-h-10 rounded-md px-2.5 py-1.5 text-[13px] font-normal';
  return (
    <div className={APP_FIXED}>
      <Header kind="new" />
      <div className="flex min-h-0 flex-1">
        <main className="flex min-h-0 min-w-0 flex-[1_1_auto] flex-col gap-3.5 overflow-y-auto p-5">
          <div className="flex flex-wrap items-baseline gap-3">
            <h1 className="m-0 text-[22px]">AI predlog iz fotografije<Tip k="aip.title" align="right" /></h1>
            <span className="text-[14px] text-muted-foreground">AI predlaže — ti potvrđuješ. Ništa ne ulazi u projekat bez tvog „Prihvati".</span>
          </div>
          <div className="relative aspect-video min-h-[300px] flex-none overflow-hidden rounded-xl bg-[#DCD6CB] bg-cover bg-center bg-no-repeat" style={photo ? { backgroundImage: `url(${photo})` } : undefined}>
            <svg className="absolute inset-0 size-full font-mono" viewBox="0 0 800 450" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Mesto za fotografiju prostora sa prepoznatim zidovima, prozorom i instalacijama">
              {!photo && <>
                <rect x="0" y="0" width="800" height="450" fill="#D2CBBE" />
                <polygon points="0,0 260,70 260,390 0,450" fill="#C4BCAD" />
                <polygon points="260,70 800,40 800,450 260,390" fill="#DCD6CB" />
                <polygon points="0,450 260,390 800,450" fill="#B3A995" />
                <text x="400" y="230" textAnchor="middle" fontSize="15" fill="#5F5A52">[FOTOGRAFIJA PROSTORA]</text>
              </>}
              {/* shortcut: overlay positions of the example detection (pixel boxes come from the AI later) */}
              <line x1="260" y1="70" x2="260" y2="390" stroke="#2E6B4E" strokeWidth="3" />
              <line x1="260" y1="390" x2="800" y2="450" stroke="#2E6B4E" strokeWidth="3" strokeDasharray="10 6" />
              <line x1="0" y1="450" x2="260" y2="390" stroke="#2E6B4E" strokeWidth="3" strokeDasharray="10 6" />
              <rect x="380" y="110" width="180" height="150" fill="none" stroke="#1E50C8" strokeWidth="3" />
              <rect x="380" y="92" width="72" height="18" fill="#1E50C8" /><text x="386" y="106" fontSize="12" fill="#FFFFFF">prozor</text>
              {([[470, 330, '#1E50C8', '#FFFFFF', 'V'], [500, 340, '#57534E', '#FFFFFF', 'O'], [660, 250, '#F2B630', '#1C1B19', 'S'], [120, 300, '#F2B630', '#1C1B19', 'S']] as const).map(([x, y, bg, fg, t]) => (
                <g key={`${x}-${y}`}>
                  <circle cx={x} cy={y} r="12" fill={bg} stroke={fg === '#FFFFFF' ? '#FFFFFF' : '#1C1B19'} strokeWidth={fg === '#FFFFFF' ? 2 : 1.5} />
                  <text x={x} y={y + 4} textAnchor="middle" fontSize="11" fontWeight="700" fill={fg}>{t}</text>
                </g>
              ))}
              <rect x="560" y="410" width="150" height="24" rx="4" fill="#1C1B19" /><text x="635" y="427" textAnchor="middle" fontSize="12" fill="#FFFFFF">zid A ≈ {num(measured) || 3200} mm</text>
            </svg>
            <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
              <label className={PBTN}>Zameni fotografiju<input type="file" accept="image/*" hidden onChange={e => { const f = e.target.files?.[0]; if (f) setPhoto(URL.createObjectURL(f)); }} /></label>
              <Button variant={null} size="none" className={PBTN} aria-disabled="true" title="Uskoro">+ Još jedna (drugi zid)</Button>
            </div>
          </div>
          <section aria-label="Predefinisani zadaci" className="flex flex-col gap-2">
            <h2 className="m-0 text-[15px]">Šta AI da uradi<Tip k="aip.tasks" align="right" /></h2>
            <SegmentedControl className="flex flex-wrap gap-2" options={PROMPTS.map(([id, l]) => [id, l] as const)} value={prompt} onChange={setPrompt}
              itemClass="min-h-10 rounded-full border border-solid border-border bg-white px-3 py-2 text-[13px] text-foreground data-[state=on]:border-foreground data-[state=on]:bg-dark data-[state=on]:text-white" />
            <div className="rounded-lg border border-solid border-border bg-white px-3.5 py-3 text-[14px] leading-normal text-ink-2">{PROMPTS.find(p => p[0] === prompt)![2]}</div>
          </section>
        </main>
        <aside aria-label="Predlog za proveru" className="box-content flex min-h-0 flex-[0_0_420px] flex-col gap-3.5 overflow-y-auto border-0 border-l border-solid border-border bg-white p-5">
          <div className="flex items-baseline justify-between gap-2.5">
            <h2 className="m-0 text-[18px]">Predlog za proveru<Tip k="aip.review" align="left" /></h2>
            <span className="text-[13px] text-muted-foreground">{accepted.length} / {proposal.items.length} prihvaćeno</span>
          </div>
          <label className="flex flex-col gap-1.5 rounded-lg bg-accent-soft p-3 text-[13px] text-muted-foreground">
            <span className="text-[14px] font-semibold text-accent-ink">Jedna mera metrom je obavezna</span>
            <span className="text-accent-ink">Sa slike se mere samo procenjuju. Unesi jednu izmerenu meru — ostale se preračunaju.</span>
            <span className="flex items-center gap-2 text-foreground">Zid A (mm)<Input className="box-content h-auto w-[110px] border-primary px-2.5 py-2 font-mono text-[15px]" type="text" inputMode="numeric" value={measured} onChange={e => setMeasured(e.target.value)} /></span>
          </label>
          <div className="flex flex-col gap-2">
            {proposal.items.map(i => {
              const [title, value] = describe(proposal, i), on = !!acc[i.id];
              return (
                <div key={i.id} className={cn('flex items-center gap-2 rounded-lg border border-solid border-border px-3 py-2.5', on && 'border-[#B9D9BF]')}>
                  <div className="min-w-0 flex-1"><div className="text-[14px] font-semibold">{title}</div>
                    {editing === i.id
                      ? <div className="my-1 flex flex-wrap gap-x-2.5 gap-y-1.5 text-[12px] text-muted-foreground">{fields(scaledItem(proposal, i)).map(([l, v, patch]) => (
                          <label key={l} className="flex items-center gap-1">{l}<Input className="h-auto w-14 px-1.5 py-1 font-mono text-[13px]" type="text" inputMode="numeric" value={v} onChange={e => edit(scaledItem(proposal, i), patch, num(e.target.value))} /></label>
                        ))}</div>
                      : <div className="font-mono text-[13px] text-ink-2">{value}</div>}
                    {i.edited ? <div className="text-[12px] text-ok">izmereno ručno</div> : <div className={cn('text-[12px]', i.confidence === 'high' ? 'text-ok' : 'text-accent-ink')}>sigurnost: {CONF[i.confidence]}</div>}</div>
                  <Button variant="outline" size="none" className={IBTN} aria-label={`${editing === i.id ? 'Gotovo' : 'Izmeni'}: ${title}`} aria-expanded={editing === i.id}
                    onClick={() => setEditing(editing === i.id ? null : i.id)}>{editing === i.id ? 'Gotovo' : 'Izmeni'}</Button>
                  <Button size="none" className={cn(IBTN, 'min-w-[104px] border border-solid border-foreground bg-dark aria-pressed:border-ok aria-pressed:bg-ok-soft aria-pressed:font-semibold aria-pressed:text-ok')} aria-pressed={on} onClick={() => setAcc({ ...acc, [i.id]: !on })}>{on ? 'Prihvaćeno' : 'Prihvati'}</Button>
                </div>
              );
            })}
          </div>
          <div className="mt-auto flex flex-col gap-2">
            <Button size="none" className="min-h-12 text-[15px]" disabled={!proposal.referenceMeasurement} onClick={transfer}>Prenesi prihvaćeno u projekat</Button>
            <Link to="/projekat" className="inline-flex min-h-11 items-center justify-center rounded-md border border-solid border-border text-[15px] text-foreground no-underline">Preskoči AI — crtam ručno</Link>
            <p className="m-0 text-[12px] leading-normal text-muted-foreground">Svaka AI izmena se upisuje u istoriju projekta i može da se poništi.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
