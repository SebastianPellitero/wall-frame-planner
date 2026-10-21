import type { Grid, Rect } from "../types";

/** `axis: "x"` is a vertical line at x = position; `axis: "y"` a horizontal line at y = position. Wall cm. */
export interface SnapGuide {
  axis: "x" | "y";
  position: number;
}

export interface SnapResult {
  x: number;
  y: number;
  guides: SnapGuide[];
}

/** Distances closer than this count as a tie, so float noise can't change which candidate wins. */
const TIE_EPS = 1e-9;

/**
 * Nearest grid line to the start, middle or end of a rect along one axis.
 * Candidates are tried in that order and the earlier one wins ties.
 * Returns null when no candidate is within `thresholdCm`.
 */
function snapAxis(
  start: number,
  size: number,
  origin: number,
  spacing: number,
  thresholdCm: number,
): { d: number; line: number } | null {
  if (!(spacing > 0)) return null;
  let best: { d: number; line: number } | null = null;
  for (const c of [start, start + size / 2, start + size]) {
    const line = origin + Math.round((c - origin) / spacing) * spacing;
    const d = line - c;
    if (best === null || Math.abs(d) < Math.abs(best.d) - TIE_EPS) best = { d, line };
  }
  return best !== null && Math.abs(best.d) <= thresholdCm ? best : null;
}

/**
 * Soft magnet: moves the rect so its nearest edge/center lands on a grid line when
 * that line is within `thresholdPx`. Stateless, so moving farther than the threshold
 * releases the axis again.
 */
export function snapPosition(
  rect: Rect,
  grid: Grid,
  pxPerCm: number,
  thresholdPx: number,
): SnapResult {
  if (!grid.enabled || !grid.snap || !(pxPerCm > 0)) {
    return { x: rect.x, y: rect.y, guides: [] };
  }
  const thresholdCm = thresholdPx / pxPerCm;
  const guides: SnapGuide[] = [];
  let { x, y } = rect;

  const sx = snapAxis(rect.x, rect.w, grid.originX, grid.spacingX, thresholdCm);
  if (sx) {
    x += sx.d;
    guides.push({ axis: "x", position: sx.line });
  }
  const sy = snapAxis(rect.y, rect.h, grid.originY, grid.spacingY, thresholdCm);
  if (sy) {
    y += sy.d;
    guides.push({ axis: "y", position: sy.line });
  }
  return { x, y, guides };
}
