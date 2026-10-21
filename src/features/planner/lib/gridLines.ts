import type { Grid, Wall } from "../types";

/** Tolerance for lines that land on a wall edge despite floating-point error. */
const EDGE_EPS = 1e-9;
/** Positions are rounded to this precision so 0.1-cm steps don't drift (0.30000000000000004). */
const PRECISION = 1e6;

/**
 * Positions, in cm from the wall's top/left edge, of every grid line inside [0, length]:
 * all `origin + k * spacing` for integer k, so lines extend both ways from the origin.
 */
export function gridLinePositions(length: number, spacing: number, origin: number): number[] {
  if (!(length > 0) || !(spacing > 0) || !Number.isFinite(spacing) || !Number.isFinite(origin)) return [];
  const first = Math.ceil(-origin / spacing - EDGE_EPS);
  const last = Math.floor((length - origin) / spacing + EDGE_EPS);
  const positions: number[] = [];
  for (let k = first; k <= last; k++) {
    positions.push(Math.round((origin + k * spacing) * PRECISION) / PRECISION);
  }
  return positions;
}

/** Vertical lines (`xs`, from spacingX/originX) and horizontal lines (`ys`) covering the wall. */
export function gridLines(
  wall: Pick<Wall, "width" | "height">,
  grid: Pick<Grid, "spacingX" | "spacingY" | "originX" | "originY">,
): { xs: number[]; ys: number[] } {
  return {
    xs: gridLinePositions(wall.width, grid.spacingX, grid.originX),
    ys: gridLinePositions(wall.height, grid.spacingY, grid.originY),
  };
}
