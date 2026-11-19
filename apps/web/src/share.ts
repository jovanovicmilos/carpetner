// Sending files from the app (quote, cut list, inquiries): the system share sheet with the files attached (iPad/phone:
// Mail, Viber, WhatsApp…). Safari refuses share() when the tap is too long ago (a PDF took a moment): `ready` then holds the
// data and a "… pošalji" button sends it on the next tap. Without file sharing (desktop) the caller downloads instead.
import { useState } from 'react';

export function useShare() {
  const [ready, setReady] = useState<ShareData | null>(null);
  /** true = handled (shared, cancelled or waiting for a tap); false = this browser cannot share files. */
  async function share(data: ShareData): Promise<boolean> {
    if (!navigator.canShare?.(data)) return false;
    try { await navigator.share(data); setReady(null); }
    catch (e) {
      const name = (e as Error).name;
      if (name === 'NotAllowedError') setReady(data);
      else if (name !== 'AbortError') throw e;
    }
    return true;
  }
  return { share, ready, retry: () => (ready ? share(ready) : Promise.resolve(false)) };
}

/** Downloads files one after another (two quick downloads can cancel each other when the URL is revoked at once). */
export function downloadFiles(files: File[]) {
  for (const f of files) {
    const url = URL.createObjectURL(f);
    Object.assign(document.createElement('a'), { href: url, download: f.name }).click();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }
}
