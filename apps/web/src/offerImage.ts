// "Slika za ponudu" (docs/3D.md): the picture made on /3d goes on the first page of the PDF quote.
// shortcut: one PNG data URL per project in this browser (localStorage, may be refused when full); project_images table with accounts (MVP 8).
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useOfferImage = create<{ byProject: Record<string, string>; put: (id: string, png: string) => void }>()(persist(
  set => ({ byProject: {}, put: (id, png) => set(s => ({ byProject: { ...s.byProject, [id]: png } })) }),
  { name: 'kroj-offer-image' },
));
