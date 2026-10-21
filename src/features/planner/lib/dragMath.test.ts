import { describe, expect, it } from "vitest";
import { DEFAULT_GRID } from "../defaults";
import type { Grid } from "../types";
import { computeDrag, newlyEngagedAxes, sameGuides, type DragInput } from "./dragMath";
import { rubberBandMaxPx } from "./physics";

const wall = { width: 300, height: 250 };
const grid: Grid = { ...DEFAULT_GRID, enabled: true, snap: true }; // 10 cm spacing, origin 0
const PX_PER_CM = 2; // fine threshold 8 px = 4 cm, coarse 12 px = 6 cm

const input = (over: Partial<DragInput>): DragInput => ({
  startCm: { x: 50, y: 50 },
  deltaPx: { x: 0, y: 0 },
  size: { w: 40, h: 50 },
  pxPerCm: PX_PER_CM,
  wall,
  grid: { ...grid, enabled: false },
  coarse: false,
  ...over,
});

// A 20 cm tall frame at y = 5 has its top, middle and bottom 5 cm from every line:
// outside the fine threshold (4 cm), inside the coarse one (6 cm).
const OFF_Y = { startCm: { x: 50, y: 5 }, size: { w: 40, h: 20 } };

describe("computeDrag", () => {
  it("passes the raw position through with no grid", () => {
    const r = computeDrag(input({ deltaPx: { x: 21, y: -10 } }));
    expect(r.commitCm).toEqual({ x: 60.5, y: 45 });
    expect(r.displayPx).toEqual({ x: 121, y: 90 });
    expect(r.guides).toEqual([]);
  });

  it("snaps an axis within the fine threshold and reports its guide", () => {
    // raw x 61.5: left edge is 1.5 cm from the 60 line
    const r = computeDrag(input({ ...OFF_Y, grid, deltaPx: { x: 23, y: 0 } }));
    expect(r.commitCm).toEqual({ x: 60, y: 5 });
    expect(r.displayPx).toEqual({ x: 120, y: 10 });
    expect(r.guides).toEqual([{ axis: "x", position: 60 }]);
  });

  it("uses the larger coarse threshold for touch and pen", () => {
    // raw x 55: every candidate is 5 cm from a line
    const fine = computeDrag(input({ ...OFF_Y, grid, deltaPx: { x: 10, y: 0 } }));
    const coarse = computeDrag(input({ ...OFF_Y, grid, deltaPx: { x: 10, y: 0 }, coarse: true }));
    expect(fine.commitCm).toEqual({ x: 55, y: 5 });
    expect(fine.guides).toEqual([]);
    expect(coarse.commitCm).toEqual({ x: 60, y: 10 });
    expect(coarse.guides).toEqual([
      { axis: "x", position: 60 },
      { axis: "y", position: 10 },
    ]);
  });

  it("rubber-bands past the right edge while the commit stays clamped", () => {
    const r = computeDrag(input({ startCm: { x: 250, y: 100 }, deltaPx: { x: 200, y: 0 } }));
    const maxPx = (wall.width - 40) * PX_PER_CM; // 520
    expect(r.displayPx.x).toBeGreaterThan(maxPx);
    expect(r.displayPx.x).toBeLessThan(maxPx + rubberBandMaxPx);
    expect(r.commitCm).toEqual({ x: 260, y: 100 });
  });

  it("rubber-bands past the left edge while the commit stays clamped", () => {
    const r = computeDrag(input({ startCm: { x: 10, y: 100 }, deltaPx: { x: -100, y: 0 } }));
    expect(r.displayPx.x).toBeLessThan(0);
    expect(r.displayPx.x).toBeGreaterThan(-rubberBandMaxPx);
    expect(r.commitCm).toEqual({ x: 0, y: 100 });
  });

  it("rubber-bands on y as well", () => {
    const r = computeDrag(input({ startCm: { x: 50, y: 190 }, deltaPx: { x: 0, y: 100 } }));
    const maxPx = (wall.height - 50) * PX_PER_CM; // 400
    expect(r.displayPx.y).toBeGreaterThan(maxPx);
    expect(r.displayPx.y).toBeLessThan(maxPx + rubberBandMaxPx);
    expect(r.commitCm.y).toBe(200);
  });

  it("drops the guide of an axis that the wall clamped away from the line", () => {
    // raw x 301.5 snaps to the 300 line, which the wall clamps back to 260; y 51 snaps to 50
    const r = computeDrag(input({ grid, startCm: { x: 250, y: 51 }, deltaPx: { x: 103, y: 0 } }));
    expect(r.commitCm).toEqual({ x: 260, y: 50 });
    expect(r.guides).toEqual([{ axis: "y", position: 50 }]);
    // Display follows the snapped (unclamped) spot through the rubber band.
    expect(r.displayPx.x).toBeGreaterThan(520);
  });

  it("keeps a guide when the snapped spot is exactly at the wall edge", () => {
    // raw x 259.5 snaps to 260 (left edge wins the tie with the 300 line), exactly the clamp limit
    const r = computeDrag(input({ ...OFF_Y, grid, startCm: { x: 250, y: 5 }, deltaPx: { x: 19, y: 0 } }));
    expect(r.commitCm).toEqual({ x: 260, y: 5 });
    expect(r.guides).toEqual([{ axis: "x", position: 260 }]);
  });

  it("rounds the commit to 0.1 cm", () => {
    const r = computeDrag(input({ deltaPx: { x: 1, y: 1 }, pxPerCm: 3 }));
    expect(r.commitCm).toEqual({ x: 50.3, y: 50.3 });
  });

  it("stays put before the wall is measured", () => {
    const r = computeDrag(input({ deltaPx: { x: 40, y: 40 }, pxPerCm: 0 }));
    expect(r.commitCm).toEqual({ x: 50, y: 50 });
    expect(r.displayPx).toEqual({ x: 0, y: 0 });
    expect(r.guides).toEqual([]);
  });
});

describe("sameGuides", () => {
  it("compares guides by axis and position", () => {
    expect(sameGuides([], [])).toBe(true);
    expect(sameGuides([{ axis: "x", position: 10 }], [{ axis: "x", position: 10 }])).toBe(true);
    expect(sameGuides([{ axis: "x", position: 10 }], [{ axis: "x", position: 20 }])).toBe(false);
    expect(sameGuides([{ axis: "x", position: 10 }], [{ axis: "y", position: 10 }])).toBe(false);
    expect(sameGuides([{ axis: "x", position: 10 }], [])).toBe(false);
  });
});

describe("newlyEngagedAxes", () => {
  it("lists the axes that have a guide now but did not before", () => {
    expect(newlyEngagedAxes([], [{ axis: "x", position: 10 }])).toEqual(["x"]);
    expect(newlyEngagedAxes([{ axis: "x", position: 10 }], [{ axis: "x", position: 20 }])).toEqual([]);
    expect(
      newlyEngagedAxes([{ axis: "x", position: 10 }], [
        { axis: "x", position: 10 },
        { axis: "y", position: 0 },
      ]),
    ).toEqual(["y"]);
    expect(newlyEngagedAxes([{ axis: "y", position: 0 }], [])).toEqual([]);
  });
});
