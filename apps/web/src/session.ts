// Signed-in user and workshop (apps/api). Signed out, the app keeps working in this browser only, as before.
// Tokens: access (24 h) + refresh (60 d, rotated); a 401 refreshes once and repeats the call.
// shortcut: tokens in localStorage (like arbyte-web); an httpOnly cookie would keep them away from injected scripts.
import type { Feature, Grant, Limit } from 'engine';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { usePlan } from './locks';

export interface Workshop { id: string; name: string; role: 'owner' | 'designer'; grants: Grant[]; features: Feature[]; limits: Partial<Record<Limit, number | null>> }
interface User { _id: string; email: string; name: string; hasPassword: boolean; kind?: 'workshop_member' | 'customer' }
interface Session { accessToken: string; refreshToken: string; user: User }

export const useSession = create<{ session: Session | null; workshops: Workshop[] }>()(persist(
  (): { session: Session | null; workshops: Workshop[] } => ({ session: null, workshops: [] }),
  { name: 'kroj-session' },
));

/** Error codes of the API in the words of the UI. */
const TEXT: Record<string, string> = {
  wrong_login: 'Pogrešna e-pošta ili lozinka.',
  not_verified: 'E-pošta još nije potvrđena. Otvori link iz poruke koju smo poslali (ili pošalji novi).',
  email_taken: 'Za ovu e-poštu već postoji nalog. Prijavi se ili zatraži novu lozinku.',
  weak_password: 'Lozinka mora imati najmanje 8 znakova.',
  invalid_email: 'Upiši ispravnu e-poštu.',
  missing_email: 'Upiši e-poštu.',
  missing_password: 'Upiši lozinku.',
  missing_workshop: 'Upiši naziv radionice.',
  missing_name: 'Upiši naziv radionice.',
  invalid_token: 'Link je istekao ili je već iskorišćen. Zatraži novi.',
  already_verified: 'E-pošta je već potvrđena — prijavi se.',
  too_many: 'Previše pokušaja. Sačekaj malo pa probaj ponovo.',
  google_off: 'Prijava preko Google naloga još nije uključena.',
  google_cancelled: 'Prijava preko Google naloga je otkazana.',
  google_failed: 'Prijava preko Google naloga nije uspela. Pokušaj ponovo.',
  google_no_email: 'Google nalog nema potvrđenu e-poštu.',
  offline: 'Server nije dostupan. Proveri internet vezu i pokušaj ponovo.',
  missing_workshops: 'Izaberi bar jednog stolara.',
  too_many_workshops: 'Možeš da izabereš najviše 3 stolara.',
  workshop_unavailable: 'Neka od izabranih radionica trenutno ne prima upite. Izaberi drugu.',
  too_many_photos: 'Možeš da pošalješ najviše 5 fotografija.',
  bad_photo: 'Fotografija nije prihvaćena (JPEG, PNG ili WebP, do 1 MB). Probaj drugu.',
  not_found: 'Ovo više ne postoji ili nemaš pristup.',
  request_taken: 'Upit je već preuzet.',
  request_declined: 'Upit je već odbijen.',
  request_not_taken: 'Prvo preuzmi projekat, pa pošalji ponudu.',
  missing_total: 'Ponuda nema iznos.',
  offer_accepted: 'Kupac je već prihvatio ponudu.',
  offer_closed: 'Ova ponuda više nije otvorena (stigla je novija ili je odluka doneta).',
  offer_expired: 'Ponuda je istekla. Zatraži novu od stolara.',
  undo_expired: 'Rok za poništavanje je prošao.',
  owner_only: 'Ovo može samo vlasnik radionice.',
  feature_locked: 'Ovo je u većem paketu (Paket i dodaci).',
  users_limit: 'Sva mesta u paketu su popunjena. Dodaj korisnika u Paket i dodaci ili ukloni nekog.',
  invites_limit: 'Paket dozvoljava još samo jednu otvorenu pozivnicu. Otkaži staru ili sačekaj prijavu.',
  already_member: 'Ova osoba je već u radionici.',
  already_invited: 'Pozivnica za ovu e-poštu je već poslata.',
  last_owner: 'Radionica mora imati bar jednog vlasnika.',
  invalid_role: 'Nepoznata uloga.',
};
export const errorText = (code: string) => TEXT[code] ?? 'Nešto nije u redu. Pokušaj ponovo.';

export class ApiError extends Error { constructor(public status: number, public code: string) { super(code); } }

async function raw(method: string, path: string, body?: unknown, token?: string) {
  let res: Response;
  try {
    res = await fetch(`/api/v1${path}`, { method, headers: { ...(body !== undefined && { 'Content-Type': 'application/json' }), ...(token && { Authorization: `Bearer ${token}` }) },
      body: body === undefined ? undefined : JSON.stringify(body) });
  } catch { throw new ApiError(0, 'offline'); }
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, data?.error ?? 'server');
  return data;
}

let refreshing: Promise<void> | null = null;
/** Calls the API as the signed-in user (or anonymously); an expired access token is refreshed once. */
/** Where a customer goes after signing in (set by the Stolar step's account box); default Moje kuhinje. */
export const AFTER_LOGIN = 'kroj-after-login';

export async function api<T = unknown>(method: string, path: string, body?: unknown): Promise<T> {
  const s = useSession.getState().session;
  try { return await raw(method, path, body, s?.accessToken); }
  catch (e) {
    if (!(e instanceof ApiError) || e.status !== 401 || !s) throw e;
    // One refresh for all calls that failed together (the refresh token is single-use).
    refreshing ??= raw('POST', '/auth/token', { refreshToken: s.refreshToken })
      .then(t => { useSession.setState(st => ({ session: st.session && { ...st.session, ...t } })); })
      .catch(() => { signOut(false); throw new ApiError(401, 'invalid_token'); })
      .finally(() => { refreshing = null; });
    await refreshing;
    return raw(method, path, body, useSession.getState().session?.accessToken);
  }
}

/** Stores a session from login / verify / Google and loads the user's workshops (their plan feeds the locks). */
/** A file from the API (e.g. an offer's PDF) as a Blob; a 401 refreshes the session once through `api`. */
export async function apiFile(path: string): Promise<Blob> {
  const get = () => fetch(`/api/v1${path}`, { headers: { Authorization: `Bearer ${useSession.getState().session?.accessToken ?? ''}` } });
  let res = await get().catch(() => { throw new ApiError(0, 'offline'); });
  if (res.status === 401) { await api('GET', '/organizations').catch(() => {}); res = await get(); } // any authed call refreshes the token
  if (!res.ok) throw new ApiError(res.status, 'not_found');
  return res.blob();
}

export async function signIn(s: Session) {
  useSession.setState({ session: s });
  return loadWorkshops();
}

export async function loadWorkshops() {
  const workshops = await api<Workshop[]>('GET', '/organizations');
  useSession.setState({ workshops });
  // shortcut: the plan's grants are copied to the local plan store, so the local "Aktiviraj" switch still works for trying
  // the locks; the API is the source once a payment provider issues grants.
  if (workshops[0]) usePlan.setState({ grants: workshops[0].grants });
  return workshops;
}

/** Ends the session (also on the server when asked); this browser's copies of workshop projects are dropped by sync.ts. */
export function signOut(server = true) {
  const s = useSession.getState().session;
  if (server && s) void raw('POST', '/auth/logout', { refreshToken: s.refreshToken }, s.accessToken).catch(() => {});
  useSession.setState({ session: null, workshops: [] });
}

/** Bytes as base64 for a JSON body (offer PDF, room photos); chunks keep String.fromCharCode under the argument limit. */
export const base64 = (u: Uint8Array) => { let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000)); return btoa(s); };
