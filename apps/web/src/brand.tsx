// The product name is a working name (docs/MARKETPLACE.md → Product name): name, its Serbian case forms and the mark come
// only from here, so a rename is one change. Storage keys (`kroj-project` …) are internal and stay.
export const BRAND = {
  name: 'Kroj',
  loc: 'Kroju', // locative: "AI u Kroju"
} as const;

/** The square mark from the design; `light` for light backgrounds (Sajt), otherwise for the dark header. */
export function BrandMark({ size = 28, light = false }: { size?: number; light?: boolean }) {
  return <svg width={size} height={size} viewBox="0 0 28 28" aria-hidden="true"><rect x="3" y="3" width="22" height="22" rx="3" fill="none" stroke={light ? '#1C1B19' : '#F3F1EC'} strokeWidth="2" /><path d="M3 11h22M11 11v14" stroke={light ? '#2E6B4E' : '#8CC5A2'} strokeWidth="2" /></svg>;
}
