// Material looks for the realistic 3D (docs/3D.md "Materijali", DATA_MODEL `MaterialLook`, Admin → Biblioteka → Materijali).
// A look belongs to a board material (by id), a worktop decor ("wt:<name>") or a floor ("floor:<name>").
// Bundled CC0 textures live in public/textures; textures the workshop uploads are kept in IndexedDB (too big for localStorage).
// shortcut: per browser until accounts (MVP 8: material_looks table + Supabase Storage).
import { create } from 'zustand';
import { DECOR_IMG_MM, decorOf } from './decors';
import { persist } from 'zustand/middleware';

export type Finish = 'matte' | 'satin' | 'gloss';
export type License = 'none' | 'maker' | 'cc0' | 'own' | 'bought' | 'check';
export interface MaterialLook {
  file?: string;                      // texture file name; bundled ones start with "/textures/"
  repeat?: { w: number; h: number };  // real size of one image in mm
  grain: 'length' | 'none';
  finish: Finish;
  license: License;
  source?: string;
}
export const ROUGHNESS: Record<Finish, number> = { matte: 0.85, satin: 0.55, gloss: 0.2 };
export const FINISH_NAME: Record<Finish, string> = { matte: 'Mat', satin: 'Polumat', gloss: 'Sjaj' };
export const LICENSES: [License, string][] = [['none', 'Nije potrebna (jednobojna)'], ['maker', 'Proizvođač dekora — uslovi provereni'], ['cc0', 'CC0 (slobodno, bez navođenja)'], ['own', 'Sopstvena fotografija uzorka'], ['bought', 'Kupljena licenca'], ['check', 'Treba proveriti uslove']];
export const LICENSE_NOTE: Record<License, string> = {
  none: 'Jednobojni dekor: dovoljna je boja i površina (mat/polumat/sjaj).',
  maker: 'Mnogi proizvođači ploča daju teksture dekora za vizualizaciju. Sačuvaj gde i kada su uslovi provereni.',
  cc0: 'Slobodno za komercijalnu upotrebu, navođenje autora nije obavezno. Dobro kao privremena zamena dok ne stigne tekstura proizvođača.',
  own: 'Fotografija sopstvenog uzorka — bez ograničenja. Fotografiši pod difuznim svetlom, bez odsjaja.',
  bought: 'Upiši naziv licence i broj računa u napomenu.',
  check: 'Pre objave u ponudi kupcu proveri uslove korišćenja teksture. Dok nije provereno, u realnom prikazu se koristi samo boja.',
};

/** Defaults shipped with the app (CC0 from ambientCG, see public/textures/LICENSE.md). */
export const BUNDLED: Record<string, MaterialLook> = {
  'floor:Hrast parket': { file: '/textures/pod-parket.jpg', repeat: { w: 2000, h: 2000 }, grain: 'length', finish: 'satin', license: 'cc0', source: 'ambientCG WoodFloor051' },
  'wt:Hrast': { file: '/textures/rp-hrast.jpg', repeat: { w: 1200, h: 1200 }, grain: 'length', finish: 'satin', license: 'cc0', source: 'ambientCG Wood049' },
  'wt:Crni granit': { file: '/textures/rp-granit-crni.jpg', repeat: { w: 800, h: 800 }, grain: 'none', finish: 'gloss', license: 'cc0', source: 'ambientCG Marble006' },
  'wt:Beton': { file: '/textures/rp-beton.jpg', repeat: { w: 1500, h: 1500 }, grain: 'none', finish: 'matte', license: 'cc0', source: 'ambientCG Concrete034' },
  'wt:Kvarc beli': { grain: 'none', finish: 'gloss', license: 'none' },
};
const PLAIN: MaterialLook = { grain: 'none', finish: 'matte', license: 'none' };

export const useLooks = create<{ looks: Record<string, MaterialLook>; save: (l: Record<string, MaterialLook>) => void }>()(persist(
  set => ({ looks: {}, save: looks => set({ looks }) }),
  { name: 'kroj-looks' },
));
/** Look of a catalog decor named in a material id ("iv18-k003"): the maker's image when there is one. */
function decorLook(key: string): MaterialLook | undefined {
  const d = decorOf(key);
  return d?.img ? { file: d.img, repeat: DECOR_IMG_MM, grain: 'length', finish: 'satin', license: 'maker', source: `${d.maker} ${d.code} ${d.surface} — slika proizvođača (© ${d.maker})` } : undefined;
}
export const lookOf = (looks: Record<string, MaterialLook>, key: string): MaterialLook => looks[key] ?? BUNDLED[key] ?? decorLook(key) ?? PLAIN;

// ---------- uploaded texture files (IndexedDB "kroj", store "textures", key = look key)
const db = () => new Promise<IDBDatabase>((ok, no) => {
  const r = indexedDB.open('kroj', 1);
  r.onupgradeneeded = () => r.result.createObjectStore('textures');
  r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error);
});
const tx = async <T,>(mode: IDBTransactionMode, f: (s: IDBObjectStore) => IDBRequest<T>) => {
  const d = await db();
  return new Promise<T>((ok, no) => { const q = f(d.transaction('textures', mode).objectStore('textures')); q.onsuccess = () => ok(q.result); q.onerror = () => no(q.error); });
};
export const putTexture = (key: string, file: Blob) => tx('readwrite', s => s.put(file, key));
export const getTexture = (key: string) => tx<Blob | undefined>('readonly', s => s.get(key) as IDBRequest<Blob | undefined>);

/** URL to load a look's texture: bundled path, or an object URL of the uploaded file; null = colour only (also while "check"). */
export async function textureUrl(key: string, look: MaterialLook): Promise<string | null> {
  if (!look.file || look.license === 'check') return null;
  if (look.file.startsWith('/textures/') || look.file.startsWith('/decors/')) return look.file;
  try { const b = await getTexture(key); return b ? URL.createObjectURL(b) : null; } catch { return null; }
}
