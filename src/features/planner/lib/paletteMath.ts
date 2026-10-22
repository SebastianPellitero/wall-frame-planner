/**
 * Geometry of the Frame creator: fitting its preview, and dragging a new frame from the
 * preview onto the wall (design-system.md §5.1, §5.15). Client px in, wall cm out; no React, no DOM.
 */
import { MIN_SIZE_CM } from "../defaults";
import type { Grid, Point, ShapeKind, Wall } from "../types";
import { computeDrag } from "./dragMath";
import { clientToWallCm } from "./geometry";
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
      /** Where to draw the ghost's true-size box, in client px: exactly where it will land (`commitCm`). */
      topLeftPx: Point;
      /** Where the frame lands on drop: snapped, clamped and rounded, in wall cm. */
      commitCm: Point;
      /** `commitCm` + size / 2: the center to pass to `addShape`. */
      centerCm: Point;
      guides: SnapGuide[];
    };

/**
 * Hit-tests the ghost's center against the wall and, over it, places the frame exactly like a
 * dragged one: snapped, clamped inside the wall and rounded. The ghost is drawn at that landing
 * spot, so the drop lands where it is drawn (§5.15).
 */
export function placeGhost({ centerPx, wallRect, size, pxPerCm, wall, grid, coarse }: GhostInput): GhostPlacement {
  if (!(pxPerCm > 0) || !isInside(centerPx, wallRect)) return { overWall: false };
  const center = clientToWallCm(centerPx, wallRect, pxPerCm);
  const startCm = { x: center.x - size.w / 2, y: center.y - size.h / 2 };
  const r = computeDrag({ startCm, deltaPx: { x: 0, y: 0 }, size, pxPerCm, wall, grid, coarse });
  return {
    overWall: true,
    topLeftPx: { x: wallRect.left + r.commitCm.x * pxPerCm, y: wallRect.top + r.commitCm.y * pxPerCm },
    commitCm: r.commitCm,
    centerCm: { x: r.commitCm.x + size.w / 2, y: r.commitCm.y + size.h / 2 },
    guides: r.guides,
  };
}

/**
 * The preview frame's px size (§5.1): the frame scaled to fit the box's content area (inside its
 * padding) minus the caption's height, keeping its aspect ratio. Zero until there is room.
 */
export function fitPreview(sizeCm: { w: number; h: number }, contentPx: { w: number; h: number }, captionPx: number): { w: number; h: number } {
  const roomW = contentPx.w;
  const roomH = contentPx.h - captionPx;
  if (!(roomW > 0 && roomH > 0 && sizeCm.w > 0 && sizeCm.h > 0)) return { w: 0, h: 0 };
  const scale = Math.min(roomW / sizeCm.w, roomH / sizeCm.h);
  return { w: sizeCm.w * scale, h: sizeCm.h * scale };
}
