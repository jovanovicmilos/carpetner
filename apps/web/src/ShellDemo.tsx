// The two navigation references as pages (design/screens/AppShell.html, AdminShell.html), to check MainMenu / ProjectBar /
// AdminLayout against them before the shell replaces the old headers on every workshop screen (waits for the user's OK).
// The editor area and the price table are the references' placeholders, not real screens.
import { AdminLayout, MainMenu, ProjectBar } from './AppShell';
import { useHelp } from './help';

const ROW = 'rounded-md border border-solid border-line-soft bg-background';

export function AppShellDemo() {
  const [help] = useHelp();
  return (
    <div className="relative flex h-dvh flex-col overflow-hidden bg-background">
      <MainMenu current="projekat" />
      <ProjectBar step={3} />
      <div className="grid min-h-0 flex-1 grid-cols-[240px_minmax(0,1fr)_300px]">
        <aside aria-label="Biblioteka (radna površina editora)" className="flex flex-col gap-2.5 border-0 border-r border-solid border-border bg-white p-3.5">
          <span className="text-[15px] font-semibold">Biblioteka</span>
          {Array.from({ length: 6 }, (_, i) => <span key={i} className={`h-10 ${ROW}`} />)}
        </aside>
        <main aria-label="Plan (radna površina editora)" className="relative bg-[#FAF8F4] bg-[linear-gradient(#E4DFD5_1px,transparent_1px),linear-gradient(90deg,#E4DFD5_1px,transparent_1px)] bg-size-[50px_50px]">
          <div aria-hidden="true" className="absolute top-[70px] left-20 h-[9px] w-[560px] bg-foreground" />
          <div aria-hidden="true" className="absolute top-[70px] left-20 h-[420px] w-[9px] bg-foreground" />
          <div aria-hidden="true" className="absolute top-[79px] left-[89px] h-[110px] w-[520px] border border-solid border-foreground bg-[#EADBC4]" />
          <div aria-hidden="true" className="absolute top-[189px] left-[89px] h-[280px] w-[110px] border border-solid border-foreground bg-[#EADBC4]" />
        </main>
        <aside aria-label="Inspektor (radna površina editora)" className="flex flex-col gap-2.5 border-0 border-l border-solid border-border bg-white p-3.5">
          <span className="text-[15px] font-semibold">Izabrano</span>
          {help && <div className="flex items-start gap-2 rounded-lg border border-solid border-[#A9D6BA] bg-[#F2F8F4] px-[11px] py-[9px] text-[13px] leading-[1.45] text-accent-ink">
            <span aria-hidden="true" className="box-border inline-flex size-[18px] flex-none items-center justify-center rounded-full border-[1.5px] border-solid border-primary text-[11px] font-bold">i</span>
            Primer objašnjenja: vidi se samo kad je „Pomoć na ekranu“ uključena u meniju Radionica.</div>}
          {Array.from({ length: 4 }, (_, i) => <span key={i} className={`h-9 ${ROW}`} />)}
        </aside>
      </div>
    </div>
  );
}

const PRICES = [['Iverica 18 W980', 'ploča', '6.500 RSD'], ['Iverica 18 U708', 'ploča', '8.900 RSD'], ['HDF 3 bela', 'ploča', '2.400 RSD'], ['Radna ploča 38 hrast', 'ploča', '14.500 RSD'], ['Kant ABS 2 mm', 'm', '190 RSD'], ['Rad — donji element', 'kom', '3.500 RSD']];

export function AdminShellDemo() {
  return (
    <AdminLayout title="Cenovnik" current="Cenovnik" text="Ove cene koristi svaki obračun i ponuda.">
      <div className="overflow-hidden rounded-xl border border-solid border-border bg-white">
        <table className="w-full border-collapse text-[14px]">
          <thead><tr className="bg-background text-left"><th scope="col" className="px-3.5 py-2.5 text-[14px] font-bold text-foreground">Stavka</th><th scope="col" className="px-3.5 py-2.5 text-[14px] font-bold text-foreground">Jedinica</th><th scope="col" className="px-3.5 py-2.5 text-[14px] font-bold text-foreground text-right">Cena</th></tr></thead>
          <tbody>{PRICES.map(([n, u, p]) => <tr key={n} className="border-0 border-t border-solid border-line-soft"><td className="px-3.5 py-2.5">{n}</td><td className="px-3.5 py-2.5 text-muted-foreground">{u}</td><td className="px-3.5 py-2.5 text-right font-mono">{p}</td></tr>)}</tbody>
        </table>
      </div>
    </AdminLayout>
  );
}
