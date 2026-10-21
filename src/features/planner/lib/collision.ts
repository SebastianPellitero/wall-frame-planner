import type { Point, Shape, Wall } from "../types";
import { overlaps, separationCandidates } from "./collisionMath";
import { clampToWall, round1 } from "./geometry";

export { EPS, overlaps, separationCandidates } from "./collisionMath";

/** `q` shifted by `delta`, kept inside the wall and rounded to 0.1 cm. */
function place(q: Shape, delta: Point, wall: Wall): Point {
  const clamped = clampToWall({ x: q.x + delta.x, y: q.y + delta.y, w: q.w, h: q.h }, wall);
  return { x: round1(clamped.x), y: round1(clamped.y) };
}

/**
 * Where to put `q` so it stops overlapping `p`: the first separation candidate that
 * still clears `p` after clamping to the wall. If none does (a wall edge is in the
 * way), the first candidate, clamped, is the best effort.
 */
function bestPlacement(p: Shape, q: Shape, gap: number, wall: Wall): Point {
  let fallback: Point | null = null;
  for (const delta of separationCandidates(p, q, gap)) {
    const pos = place(q, delta, wall);
    if (!overlaps(p, { ...q, ...pos }, gap)) return pos;
    fallback ??= pos;
  }
  return fallback ?? { x: q.x, y: q.y };
}

/**
 * Pushes frames out of the way of `anchorId`, which never moves.
 *
 * Only frames "disturbed" by the anchor chain are pushed: the anchor starts the set and
 * every frame that gets pushed joins it, so it can push its own neighbors in turn.
 * Untouched frames that already overlap each other are left alone. When two disturbed
 * frames overlap, the one later in the array moves.
 *
 * Passes repeat until one moves nothing or `maxIter` is reached (a full wall returns
 * its best effort and never throws). Returns a new array in the same order; unmoved
 * shapes keep their identity and moved ones are new objects with round1 positions.
 */
export function resolveOverlaps(
  shapes: Shape[],
  anchorId: string,
  wall: Wall,
  opts: { gap?: number; maxIter?: number } = {},
): Shape[] {
  const gap = opts.gap ?? wall.pushGap;
  const maxIter = opts.maxIter ?? 20;
  const out = shapes.slice();
  const disturbed = new Set<string>([anchorId]);

  for (let pass = 0; pass < maxIter; pass++) {
    let movedAny = false;

    for (let i = 0; i < out.length; i++) {
      for (let j = i + 1; j < out.length; j++) {
        let p: number;
        let q: number;
        if (out[i].id === anchorId) {
          [p, q] = [i, j];
        } else if (out[j].id === anchorId) {
          [p, q] = [j, i];
        } else if (disturbed.has(out[i].id)) {
          [p, q] = [i, j]; // also covers both disturbed: the later one moves
        } else if (disturbed.has(out[j].id)) {
          [p, q] = [j, i];
        } else {
          continue;
        }

        if (!overlaps(out[p], out[q], gap)) continue;
        const next = bestPlacement(out[p], out[q], gap, wall);
        if (next.x === out[q].x && next.y === out[q].y) continue;

        out[q] = { ...out[q], x: next.x, y: next.y };
        disturbed.add(out[q].id);
        movedAny = true;
      }
    }

    if (!movedAny) break;
  }

  return out;
}
