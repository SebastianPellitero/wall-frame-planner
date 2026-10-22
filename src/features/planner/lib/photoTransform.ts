import type { Background, Point, Wall } from "../types";
import { clamp } from "./geometry";

/** Where the photo sits on the wall, in cm: top-left and width (height = width × aspect). */
export type Placement = Pick<Background, "x" | "y" | "width" | "aspect">;

type WallSize = Pick<Wall, "width" | "height">;

/** Scale slider range (design-system.md §4.6): width = wall.width × 2^t, t ∈ [−2, 2], i.e. 25–400%. */
export const SCALE_T_MIN = -2;
export const SCALE_T_MAX = 2;

const minWidth = (wall: WallSize) => wall.width * 2 ** SCALE_T_MIN;
const maxWidth = (wall: WallSize) => wall.width * 2 ** SCALE_T_MAX;

/** Cover-fit: the smallest width that still covers the whole wall, centered on it. */
export function initialPlacement(imgW: number, imgH: number, wall: WallSize): Placement {
  const aspect = imgH / imgW;
  const width = Math.max(wall.width, wall.height / aspect);
  return { x: (wall.width - width) / 2, y: (wall.height - width * aspect) / 2, width, aspect };
}

export function panBy<T extends Placement>(bg: T, dxCm: number, dyCm: number): T {
  return { ...bg, x: bg.x + dxCm, y: bg.y + dyCm };
}

/**
 * Scales by `factor` about `pivotCm` (wall cm), so the image point under the pivot stays put.
 * The width is clamped to 25–400% of the wall width; the pivot still holds at the clamp.
 */
export function zoomAround<T extends Placement>(bg: T, factor: number, pivotCm: Point, wall: WallSize): T {
  const width = clamp(bg.width * factor, minWidth(wall), maxWidth(wall));
  const k = width / bg.width;
  if (k === 1) return bg;
  return { ...bg, width, x: pivotCm.x - (pivotCm.x - bg.x) * k, y: pivotCm.y - (pivotCm.y - bg.y) * k };
}

const mid = (a: Point, b: Point): Point => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

/**
 * One step of a two-finger gesture (points in wall cm): pans with the midpoint, then zooms by
 * the change in finger distance around the new midpoint.
 */
export function pinchStep<T extends Placement>(bg: T, prev: readonly [Point, Point], next: readonly [Point, Point], wall: WallSize): T {
  const from = mid(prev[0], prev[1]);
  const to = mid(next[0], next[1]);
  const panned = panBy(bg, to.x - from.x, to.y - from.y);
  const d0 = dist(prev[0], prev[1]);
  if (!(d0 > 0)) return panned;
  return zoomAround(panned, dist(next[0], next[1]) / d0, to, wall);
}

export function sliderToWidth(t: number, wall: WallSize): number {
  return wall.width * 2 ** clamp(t, SCALE_T_MIN, SCALE_T_MAX);
}

export function widthToSlider(width: number, wall: WallSize): number {
  return clamp(Math.log2(width / wall.width), SCALE_T_MIN, SCALE_T_MAX);
}

/** px of wheel travel for one doubling (about five notches of a 100px mouse wheel). */
const WHEEL_PX_PER_DOUBLING = 500;
const LINE_PX = 16;

/** Zoom factor for one wheel event: up zooms in, down out. `deltaMode` 1 is lines, 2 pages. */
export function wheelZoomFactor(deltaY: number, deltaMode: number): number {
  const px = deltaMode === 1 ? deltaY * LINE_PX : deltaMode === 2 ? deltaY * WHEEL_PX_PER_DOUBLING : deltaY;
  return 2 ** (-px / WHEEL_PX_PER_DOUBLING);
}
