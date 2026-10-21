import type { Grid, Point, Wall } from "../types";
import { clampToWall, round1, rubberBandPosition } from "./geometry";
import { rubberBandFactor, rubberBandMaxPx, snapThresholdPx } from "./physics";
import { snapPosition, type SnapGuide } from "./snap";

export interface DragInput {
  /** Committed top-left when the drag started, in cm. */
  startCm: Point;
  /** Pointer movement since the press, in screen px. */
  deltaPx: Point;
  size: { w: number; h: number };
  pxPerCm: number;
  wall: Pick<Wall, "width" | "height">;
  grid: Grid;
  /** Touch or pen: the larger snap threshold. */
  coarse: boolean;
}

export interface DragOutput {
  /** Where to draw the frame now, in px: snapped, and rubber-banded past the wall edges. */
  displayPx: Point;
  /** Where the frame lands on release, in cm: snapped, clamped to the wall and rounded. */
  commitCm: Point;
  /** Active snap guides, without any axis the wall clamped away from its line. */
  guides: SnapGuide[];
}

/** One pointer move of a frame drag (design-system.md §6.3): snap, rubber-band, clamp. */
export function computeDrag({ startCm, deltaPx, size, pxPerCm, wall, grid, coarse }: DragInput): DragOutput {
  if (!(pxPerCm > 0)) {
    return { displayPx: { x: 0, y: 0 }, commitCm: { ...startCm }, guides: [] };
  }
  const raw = { x: startCm.x + deltaPx.x / pxPerCm, y: startCm.y + deltaPx.y / pxPerCm };
  const threshold = coarse ? snapThresholdPx.coarse : snapThresholdPx.fine;
  const snapped = snapPosition({ ...raw, ...size }, grid, pxPerCm, threshold);
  const clamped = clampToWall({ x: snapped.x, y: snapped.y, ...size }, wall);

  const band = (pos: number, wallCm: number, sizeCm: number) =>
    rubberBandPosition(pos * pxPerCm, 0, (wallCm - sizeCm) * pxPerCm, rubberBandFactor, rubberBandMaxPx);

  return {
    displayPx: { x: band(snapped.x, wall.width, size.w), y: band(snapped.y, wall.height, size.h) },
    commitCm: { x: round1(clamped.x), y: round1(clamped.y) },
    guides: snapped.guides.filter((g) => (g.axis === "x" ? clamped.x === snapped.x : clamped.y === snapped.y)),
  };
}

/** True when both lists hold the same guides in the same order. */
export function sameGuides(a: readonly SnapGuide[], b: readonly SnapGuide[]): boolean {
  return a.length === b.length && a.every((g, i) => g.axis === b[i].axis && g.position === b[i].position);
}

/** Axes that have a guide in `next` but had none in `prev`: each one fires the snap haptic once. */
export function newlyEngagedAxes(prev: readonly SnapGuide[], next: readonly SnapGuide[]): Array<SnapGuide["axis"]> {
  return next.filter((g) => !prev.some((p) => p.axis === g.axis)).map((g) => g.axis);
}
