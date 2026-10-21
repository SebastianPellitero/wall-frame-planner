import type { Shape } from "../types";
import { shapeCenter } from "./geometry";

/**
 * Ids of the frames `resolveOverlaps` pushed, nearest to the anchor first: the push-apart
 * stagger order (design-system.md §6.3). A frame counts as pushed when its object changed,
 * because `resolveOverlaps` keeps the identity of every shape it leaves alone. Distance is
 * measured from where each frame was before the push.
 */
export function pushOrder(before: readonly Shape[], after: readonly Shape[], anchorId: string): string[] {
  const anchor = after.find((s) => s.id === anchorId);
  if (!anchor) return [];
  const prev = new Map(before.map((s) => [s.id, s]));
  const c = shapeCenter(anchor);
  const dist = (s: Shape) => {
    const p = shapeCenter(s);
    return Math.hypot(p.x - c.x, p.y - c.y);
  };
  return after
    .filter((s) => s.id !== anchorId && prev.has(s.id) && prev.get(s.id) !== s)
    .map((s) => ({ id: s.id, d: dist(prev.get(s.id) as Shape) }))
    .sort((a, b) => a.d - b.d)
    .map((e) => e.id);
}
