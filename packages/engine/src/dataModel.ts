// docs/DATA_MODEL.md stores the room flat on the project (walls with a/b, roomHeight) and uses the id as the label.
// The engine still works on `Project.room`; this converts the shared format (fixtures/kuhinja-petrovic.json).
// shortcut: internal model keeps `room`; move the engine to the flat format when projects get a backend.
import { syncWalls } from './geometry';
import type { Element, Installation, Obstacle, Opening, Point, Project } from './types';

export interface DataModelProject extends Omit<Project, 'room' | 'elements'> {
  customer?: string;
  roomHeight: number;
  walls: { id: string; name?: string; a: Point; b: Point; thickness: number }[];
  openings: Opening[]; obstacles: Obstacle[]; installations: Installation[];
  elements: Omit<Element, 'label'>[];
}

export function fromDataModel(d: DataModelProject): Project {
  const { roomHeight, walls, openings, obstacles, installations, elements, customer: _c, ...rest } = d;
  return {
    ...rest,
    room: syncWalls({ height: roomHeight, walls: walls.map(({ name: _n, ...w }) => ({ ...w, length: 0, angleToPrev: 0 })), openings, installations, obstacles }),
    elements: elements.map(e => ({ ...e, label: e.id }) as Element),
  };
}
