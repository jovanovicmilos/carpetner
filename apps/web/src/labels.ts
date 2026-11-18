// Serbian UI names for engine enums.
import type { ElementKind, Obstacle } from 'engine';

export const KIND_NAME: Record<ElementKind, string> = {
  'corner-blind': 'ugaoni', base: 'donji', sink: 'sudopera', drawer: 'fiokar', 'appliance-front': 'MSP',
  oven: 'rerna', filler: 'filer', tall: 'frižider', wall: 'gornji',
};

export const OBSTACLE_NAME: Record<Obstacle['kind'], string> = { chimney: 'Dimnjak', column: 'Stub', other: 'Ostalo' };

export const num = (v: string) => { const n = parseInt(v.replace(/\D/g, ''), 10); return isNaN(n) ? 0 : n; };
