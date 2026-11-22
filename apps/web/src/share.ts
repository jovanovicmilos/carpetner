// Sending files from the app (quote, cut list, inquiries): the system share sheet with the files attached (iPad/phone:
// Mail, Viber, WhatsApp…). Safari refuses share() when the tap is too long ago (a PDF took a moment): `ready` then holds the
// data and a "… pošalji" button sends it on the next tap; if the browser refuses again (desktop Chrome refuses some file types,
// e.g. XLSX), the files are downloaded and `note` says so. Without file sharing (desktop) the caller downloads instead.
import { useState } from 'react';

export function useShare() {
  const [ready, setReady] = useState<ShareData | null>(null);
  const [note, setNote] = useState('');
  /** true = handled (shared, cancelled or waiting for a tap); false = this browser cannot share files. */
  async function share(data: ShareData): Promise<boolean> {
    if (!navigator.canShare?.(data)) return false;
    setNote('');
    try { await navigator.share(data); setReady(null); }
    catch (e) {
      const name = (e as Error).name;
      if (name === 'NotAllowedError') setReady(data);
      else if (name !== 'AbortError') throw e;
    }
    return true;
  }
  async function retry() {
    if (!ready) return;
    setReady(null);
    try { await navigator.share(ready); }
    catch (e) {
      if ((e as Error).name === 'AbortError') return;
      downloadFiles(ready.files ?? []);
      setNote('Ovaj browser ne dozvoljava slanje fajlova — preuzeti su, priloži ih u poruku.');
    }
  }
  return { share, ready, retry, note };
}

/** Downloads files one after another (two quick downloads can cancel each other when the URL is revoked at once). */
export function downloadFiles(files: File[]) {
  for (const f of files) {
    const url = URL.createObjectURL(f);
    Object.assign(document.createElement('a'), { href: url, download: f.name }).click();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }
}
