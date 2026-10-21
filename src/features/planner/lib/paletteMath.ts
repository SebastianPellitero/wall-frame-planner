/**
 * Geometry of dragging a new frame from a source (palette tile) onto the wall
 * (design-system.md §5.15). Client px in, wall cm out; no React, no DOM.
 */
import { MIN_SIZE_CM } from "../defaults";
import type { Grid, Point, ShapeKind, Wall } from "../types";
import { computeDrag } from "./dragMath";
import { ghostTouchLiftPx } from "./physics";
import type { SnapGuide } from "./snap";

type WallSize = Pick<Wall, "width" | "height">;

export interface Limits {
  min: number;
  max: number;
}

/** Size-input limits, matching the store's `clampSize`: the wall caps a rectangle per axis, a square or circle by its shorter side. */
export function sizeLimits(kind: ShapeKind, wall: WallSize): { w: Limits; h: Limits } {
  if (kind === "rect") return { w: { min: MIN_SIZE_CM, max: wall.width }, h: { min: MIN_SIZE_CM, max: wall.height } };
  const side = { min: MIN_SIZE_CM, max: Math.min(wall.width, wall.height) };
  return { w: side, h: { ...side } };
}

/** Where the ghost's center goes: on the cursor (fine), or with its bottom edge `ghostTouchLiftPx` above the finger (coarse). */
export function ghostCenter(pointer: Point, heightPx: number, coarse: boolean): Point {
  if (!coarse) return { x: pointer.x, y: pointer.y };
  return { x: pointer.x, y: pointer.y - ghostTouchLiftPx - heightPx / 2 };
}

export interface ClientRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** True when `p` is inside `r`, edges included. */
export function isInside(p: Point, r: ClientRect): boolean {
  return p.x >= r.left && p.x <= r.left + r.width && p.y >= r.top && p.y <= r.top + r.height;
}

export interface GhostInput {
  /** The ghost's center in client px. */
  centerPx: Point;
  wallRect: ClientRect;
  size: { w: number; h: number };
  pxPerCm: number;
  wall: WallSize;
  grid: Grid;
  coarse: boolean;
}

export type GhostPlacement =
  | { overWall: false }
  | {
      overWall: true;
      /** Where to draw the ghost's true-size box, in client px: snapped, rubber-banded like a frame. */
      topLeftPx: Point;
      /** Where the frame lands on drop: snapped, clamped and rounded, in wall cm. */
      commitCm: Point;
      /** `commitCm` + size / 2: the center to pass to `addShape`. */
      centerCm: Point;
      guides: SnapGuide[];
    };

/** Hit-tests the ghost's center against the wall and, over it, places the frame exactly like a dragged one. */
export function placeGhost({ centerPx, wallRect, size, pxPerCm, wall, grid, coarse }: GhostInput): GhostPlacement {
  if (!(pxPerCm > 0) || !isInside(centerPx, wallRect)) return { overWall: false };
  const startCm = {
    x: (centerPx.x - wallRect.left) / pxPerCm - size.w / 2,
    y: (centerPx.y - wallRect.top) / pxPerCm - size.h / 2,
  };
  const r = computeDrag({ startCm, deltaPx: { x: 0, y: 0 }, size, pxPerCm, wall, grid, coarse });
  return {
    overWall: true,
    topLeftPx: { x: wallRect.left + r.displayPx.x, y: wallRect.top + r.displayPx.y },
    commitCm: r.commitCm,
    centerCm: { x: r.commitCm.x + size.w / 2, y: r.commitCm.y + size.h / 2 },
    guides: r.guides,
  };
}
