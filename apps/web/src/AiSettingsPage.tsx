// Admin → AI asistent (design/screens/AIPodesavanja.html): how AI is paid for and run, connector address, predefined tasks.
// shortcut: settings live in this screen only (no backend yet); the API key is never stored in the browser —
// it will be kept encrypted server-side (docs/AI.md).
import { useState } from 'react';
import { AdminLayout } from './AdminLayout';
import { Tip } from './help';

type Mode = 'connector' | 'credits' | 'key';
const MODES: [Mode, string, string, string][] = [
  ['connector', 'Kroj u Claude-u', 'Koristi tvoju Claude pretplatu', 'Kroj se dodaje kao konektor u Claude. Slike, razgovor i AI rad su u Claude-u na tvom planu; Kroj daje alate i čuva projekat.'],
  ['credits', 'AI u Kroju — krediti', 'Uključeno u paket', 'AI dugme radi direktno u Kroju. Paket uključuje mesečne AI kredite; po potrebi se dokupljuju.'],
  ['key', 'AI u Kroju — tvoj API ključ', 'Plaćaš Anthropic-u po potrošnji', 'Unesi svoj Anthropic API ključ; tokene plaćaš direktno, bez Kroj kredita.'],
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

export function AiSettingsPage() {
  const [enabled, setEnabled] = useState(true);
  const [mode, setMode] = useState<Mode>('connector');
  const [tasks, setTasks] = useState(TASKS.map(t => t[3]));
  const [copied, setCopied] = useState(false);
  return (
    <AdminLayout nav="ai">
      <div className="pl-head">
        <div>
          <h1>AI asistent<Tip k="ai.title" align="right" /></h1>
          <p className="ai-sub">AI je dodatak, ne obaveza. Sve se može uraditi ručno; AI samo priprema predlog koji majstor proverava.</p>
        </div>
        <label className="ai-enable"><input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} />AI uključen za radionicu</label>
      </div>
      <fieldset className="ai-modes" style={{ opacity: enabled ? 1 : 0.45 }} disabled={!enabled}>
        <legend>Kako se AI plaća i pokreće<Tip k="ai.modes" align="right" /></legend>
        {MODES.map(([id, t, tag, d]) => (
          <label key={id} className={mode === id ? 'on' : undefined}>
            <span className="t"><input type="radio" name="ai-mod" checked={mode === id} onChange={() => setMode(id)} /><strong>{t}</strong></span>
            <span className="tag">{tag}</span>
            <span className="d">{d}</span>
          </label>
        ))}
      </fieldset>
      {mode === 'connector' && (
        <section className="ai-box">
          <h2>Poveži Kroj sa Claude-om</h2>
          <div className="ai-url">
            <span>{MCP_URL}</span>
            <button type="button" onClick={() => { void navigator.clipboard?.writeText(MCP_URL); setCopied(true); }}>{copied ? 'Kopirano' : 'Kopiraj adresu'}</button>
          </div>
          <ol>
            <li>U Claude-u otvori Customize → Connectors → Add custom connector i nalepi adresu.</li>
            <li>Prijavi se Kroj nalogom — Claude dobija pristup samo projektima tvoje radionice.</li>
            <li>U Claude-u pošalji sliku prostora i izaberi Kroj zadatak (npr. „Prepoznaj zidove i instalacije"). Predlog stiže u Kroj na proveru.</li>
          </ol>
        </section>
      )}
      {mode === 'key' && (
        <section className="ai-box">
          <h2>Sopstveni API ključ</h2>
          <label className="ai-field">Anthropic API ključ (iz Claude Console)<input type="password" autoComplete="off" placeholder="sk-ant-…" /></label>
          <label className="ai-field">Mesečni limit potrošnje (USD)<input type="text" inputMode="numeric" placeholder="[IZNOS]" style={{ maxWidth: 200 }} /></label>
          <p>Ključ se čuva šifrovano i koristi samo za zahteve tvoje radionice.</p>
        </section>
      )}
      {mode === 'credits' && (
        <section className="ai-box ai-credits">
          <div><div className="k">AI krediti ovog meseca</div><div className="v">[BROJ] / [BROJ]</div></div>
          <button type="button" aria-disabled="true" title="Uskoro">Dokupi kredite</button>
        </section>
      )}
      <section aria-label="Predefinisani zadaci" className="st-table ai-tasks">
        <table>
          <thead><tr><th className="f">Predefinisani zadatak</th><th>Gde se pojavljuje</th><th>Šta sme da menja</th><th className="l">Uključen</th></tr></thead>
          <tbody>
            {TASKS.map(([t, where, what], i) => (
              <tr key={t}><td className="f">{t}</td><td className="dim">{where}</td><td className="dim">{what}</td>
                <td className="l"><input type="checkbox" aria-label={`Uključen: ${t}`} checked={tasks[i]} onChange={e => setTasks(tasks.map((x, j) => (j === i ? e.target.checked : x)))} /></td></tr>
            ))}
          </tbody>
        </table>
        <button type="button" className="pl-add" aria-disabled="true" title="Uskoro">+ Sopstveni zadatak radionice</button>
      </section>
      <section className="ai-rules">
        <div><strong>Uvek predlog</strong><span>AI nikad ne menja projekat direktno — sve ide na listu „Prihvati / Izmeni".</span></div>
        <div><strong>Mere metrom</strong><span>Sa slike se mere procenjuju; bar jedna izmerena mera je obavezna pre prenosa.</span></div>
        <div><strong>Istorija i poništavanje</strong><span>Svaka AI izmena je zabeležena i može se vratiti jednim klikom.</span></div>
      </section>
    </AdminLayout>
  );
}
