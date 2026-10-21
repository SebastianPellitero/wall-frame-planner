import type { Point, Shape, ShapeKind, Wall } from "../types";
import { overlaps } from "./collision";
import { clampToWall, round1 } from "./geometry";

const DEFAULT_STEP_CM = 5;

/** Lattice offsets (in steps) around the origin that cover the wall, nearest first, ties by angle from east. */
function latticeOffsets(near: Point, wall: Wall, step: number): Array<{ i: number; j: number }> {
  const iMin = Math.floor(-near.x / step);
  const iMax = Math.ceil((wall.width - near.x) / step);
  const jMin = Math.floor(-near.y / step);
  const jMax = Math.ceil((wall.height - near.y) / step);

  const offsets: Array<{ i: number; j: number; dist: number; angle: number }> = [];
  for (let i = iMin; i <= iMax; i++) {
    for (let j = jMin; j <= jMax; j++) {
      const angle = Math.atan2(j, i); // y points down, so this runs east, south, west, north
      offsets.push({ i, j, dist: i * i + j * j, angle: angle < 0 ? angle + 2 * Math.PI : angle });
    }
  }
  return offsets.sort((p, q) => p.dist - q.dist || p.angle - q.angle);
}

/**
 * Nearest spot (top-left, cm) for a new frame of `size` that overlaps nothing, keeping `gap`.
 *
 * `near` is the desired center. Candidate centers sit on a lattice of `step` cm that
 * includes `near`, nearest first (ties by angle: east, south, west, north), and each is
 * clamped inside the wall. Returns null when nothing fits.
 */
export function findFreeSpot(
  size: { kind: ShapeKind; w: number; h: number },
  shapes: Shape[],
  wall: Wall,
  near: Point,
  opts: { gap?: number; step?: number } = {},
): Point | null {
  const gap = opts.gap ?? wall.pushGap;
  const step = opts.step !== undefined && opts.step > 0 ? opts.step : DEFAULT_STEP_CM;

  for (const { i, j } of latticeOffsets(near, wall, step)) {
    const topLeft = clampToWall(
      { x: near.x + i * step - size.w / 2, y: near.y + j * step - size.h / 2, w: size.w, h: size.h },
      wall,
    );
    const spot = { x: round1(topLeft.x), y: round1(topLeft.y) };
    const candidate = { kind: size.kind, x: spot.x, y: spot.y, w: size.w, h: size.h };
    if (shapes.every((s) => !overlaps(s, candidate, gap))) return spot;
  }
  return null;
}
