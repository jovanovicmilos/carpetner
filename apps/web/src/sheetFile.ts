// Rows of the first sheet of an Excel / CSV file (supplier price lists). CSV is read as UTF-8 text with cells kept as text,
// so "6.200,00" reaches the engine's parseMoney intact (SheetJS would read it as 6.2) and "Šifra" is not mangled.
export async function readSheetRows(f: File): Promise<(string | number)[][]> {
  const XLSX = await import('xlsx');
  const csv = /\.(csv|txt)$/i.test(f.name) || f.type === 'text/csv';
  const wb = csv ? XLSX.read((await f.text()).replace(/^﻿/, ''), { type: 'string', raw: true }) : XLSX.read(await f.arrayBuffer(), { type: 'array' });
  return XLSX.utils.sheet_to_json<(string | number)[]>(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: true, defval: '' });
}
