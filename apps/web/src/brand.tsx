// The product name is a working name (docs/MARKETPLACE.md → Product name): name, its Serbian case forms and the mark come
// only from here, so a rename is one change. Storage keys (`kroj-project` …) are internal and stay.
export const BRAND = {
  name: 'Kroj',
  loc: 'Kroju', // locative: "AI u Kroju"
} as const;

// Oak mark (design/brand, 2026-11-25): trunk + three crown layers. Light backgrounds (site) use the dark-green / brown palette
// (kroj-mark.svg), the dark header the light one (kroj-mark-on-dark.svg).
const OAK = {
  light: { trunk: '#6B4A33', crown: ['#1D4632', '#2E6B4E', '#4F8B67'] },
  dark: { trunk: '#C49A6C', crown: ['#5E9B74', '#8CC5A2', '#B5DCC2'] },
} as const;

/** The oak mark from the design; `light` for light backgrounds (Sajt), otherwise for the dark header. */
export function BrandMark({ size = 28, light = false }: { size?: number; light?: boolean }) {
  const c = OAK[light ? 'light' : 'dark'];
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" aria-hidden="true">
      <path d="M11.2 25.4c1.3-.5 2-1.8 2.1-3.8l.1-4.3h1.2l.1 4.3c.1 2 .8 3.3 2.1 3.8z" fill={c.trunk} />
      <path d="M13.9 18.4 10.6 16M14 18v-2.4M14.4 18.3l3.4-2.5" fill="none" stroke={c.trunk} strokeWidth="1.1" strokeLinecap="round" />
      <path d="M9.6 25.4h8.8" stroke={c.trunk} strokeWidth="1.2" strokeLinecap="round" />
      <path d="M3.6 15.2a2.6 2.6 0 0 1 .6-4.6a3 3 0 0 1 3.4-4.2a3.4 3.4 0 0 1 5-2.6a3.4 3.4 0 0 1 5.2.6a3 3 0 0 1 4 3.4a2.8 2.8 0 0 1 2.4 4a2.4 2.4 0 0 1-.4 4.2a2.6 2.6 0 0 1-4 .8a2.4 2.4 0 0 1-3.4.4a2.4 2.4 0 0 1-3.6 0a2.4 2.4 0 0 1-3.4-.4a2.6 2.6 0 0 1-4-.8a1.8 1.8 0 0 1-1.8-.8z" fill={c.crown[0]} />
      <path d="M3.9 12.9a2.6 2.6 0 0 1 .3-2.3a3 3 0 0 1 3.4-4.2a3.4 3.4 0 0 1 5-2.6a3.4 3.4 0 0 1 5.2.6a3 3 0 0 1 4 3.4a2.8 2.8 0 0 1 2.4 4a2.2 2.2 0 0 1-.3 1.4c-1-.7-2.3-.6-3.1.2c-.9-.8-2.4-.8-3.3 0c-1-.9-2.6-.9-3.6 0c-.9-.8-2.4-.8-3.3 0c-.8-.8-2.1-.9-3.1-.2c-.8-.4-1.4-.4-1.9-.2z" fill={c.crown[1]} />
      <path d="M7.2 9.2a2.2 2.2 0 0 1 2.4-2.4a2.6 2.6 0 0 1 4.2-1.4a2.4 2.4 0 0 1 2.6.2c-1.6.2-2.6 1-3 2.2c-1.4-.6-3 0-3.6 1.4c-1-.4-2-.4-2.6 0z" fill={c.crown[2]} />
    </svg>
  );
}
