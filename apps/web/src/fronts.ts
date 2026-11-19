// Front drawing helpers; the layout itself lives in the engine (shared with the 3D export).
import type { FrontRect } from 'engine';

export { frontLayout, type FrontRect } from 'engine';

/** Opening mark: dashed lines from the free side's corners meeting mid-height on the hinge side. */
export const hingePath = (f: FrontRect) => {
  const hx = f.hinge === 'L' ? f.x : f.x + f.w, fx = f.hinge === 'L' ? f.x + f.w : f.x;
  return `M${fx} ${f.y}L${hx} ${f.y + f.h / 2}L${fx} ${f.y + f.h}`;
};
