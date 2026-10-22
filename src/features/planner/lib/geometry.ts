import { MIN_SIZE_CM } from "../defaults";
import type { Point, Rect, ShapeKind, Wall } from "../types";

export function cmToPx(cm: number, pxPerCm: number): number {
  return cm * pxPerCm;
}

export function pxToCm(px: number, pxPerCm: number): number {
  return px / pxPerCm;
}

/**
 * A client (screen) point to wall cm, given the wall element's on-screen top-left: the one
 * conversion for drops and Grid origin taps. Before the wall has a scale it returns the origin.
 */
export function clientToWallCm(client: Point, wallTopLeft: { left: number; top: number }, pxPerCm: number): Point {
  if (!(pxPerCm > 0)) return { x: 0, y: 0 };
  return { x: (client.x - wallTopLeft.left) / pxPerCm, y: (client.y - wallTopLeft.top) / pxPerCm };
}

/** Rounds to 0.1 cm so stored state carries no float noise. Never returns -0. */
export function round1(n: number): number {
  return Math.round(n * 10) / 10 + 0;
}

export function clamp(n: number, lo: number, hi: number): number {
  return Math.min(Math.max(n, lo), hi);
}

export function shapeCenter(s: Rect): Point {
  return { x: s.x + s.w / 2, y: s.y + s.h / 2 };
}

/**
 * Top-left that keeps `rect` fully inside the wall. On an axis where the rect is
 * bigger than the wall there is no valid spot, so that axis is 0.
 */
export function clampToWall(rect: Rect, wall: Pick<Wall, "width" | "height">): Point {
  // The outer Math.max(0, ...) also turns a -0 into 0.
  return {
    x: Math.max(0, Math.min(rect.x, wall.width - rect.w)),
    y: Math.max(0, Math.min(rect.y, wall.height - rect.h)),
  };
}

/**
 * Displayed overflow (px) for a pointer that is `overflowPx` past an edge.
 * Slope at 0 is `factor`, the value approaches `maxPx` without a hard stop,
 * and the curve is odd-symmetric.
 */
export function rubberBand(overflowPx: number, factor: number, maxPx: number): number {
  if (overflowPx === 0 || maxPx <= 0) return 0;
  const o = Math.abs(overflowPx);
  return Math.sign(overflowPx) * maxPx * (1 - 1 / ((o * factor) / maxPx + 1));
}

/**
 * Displayed position (px) for a dragged frame whose resting range is [min, max].
 * Past either end it follows `rubberBand`. If the range is inverted (frame bigger
 * than the wall), `min` wins, matching `clampToWall`.
 */
export function rubberBandPosition(
  pos: number,
  min: number,
  max: number,
  factor: number,
  maxPx: number,
): number {
  if (pos < min) return min - rubberBand(min - pos, factor, maxPx);
  if (pos > max) return max + rubberBand(pos - max, factor, maxPx);
  return pos;
}

/**
 * Clamps a frame's size to [MIN_SIZE_CM, wall dimension]. Square and circle stay
 * equal-sided: both sides come from `w` and the shorter wall side is the cap.
 */
export function clampSize(
  kind: ShapeKind,
  w: number,
  h: number,
  wall: Pick<Wall, "width" | "height">,
): { w: number; h: number } {
  if (kind === "rect") {
    return {
      w: round1(clamp(w, MIN_SIZE_CM, wall.width)),
      h: round1(clamp(h, MIN_SIZE_CM, wall.height)),
    };
  }
  const side = round1(clamp(w, MIN_SIZE_CM, Math.min(wall.width, wall.height)));
  return { w: side, h: side };
}
