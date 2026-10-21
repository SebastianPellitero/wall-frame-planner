import { describe, expect, it } from "vitest";
import { DEFAULT_GRID } from "../defaults";
import { ghostCenter, isInside, placeGhost, sizeLimits } from "./paletteMath";
import { ghostTouchLiftPx } from "./physics";

const WALL = { width: 300, height: 250 };

describe("sizeLimits", () => {
  it("caps a rectangle by the wall's width and height", () => {
    expect(sizeLimits("rect", WALL)).toEqual({ w: { min: 1, max: 300 }, h: { min: 1, max: 250 } });
  });

  it("caps a square or circle by the shorter wall side", () => {
    expect(sizeLimits("square", WALL)).toEqual({ w: { min: 1, max: 250 }, h: { min: 1, max: 250 } });
    expect(sizeLimits("circle", { width: 120, height: 200 }).w).toEqual({ min: 1, max: 120 });
  });
});

describe("ghostCenter", () => {
  it("is the pointer for fine pointers", () => {
    expect(ghostCenter({ x: 100, y: 200 }, 80, false)).toEqual({ x: 100, y: 200 });
  });

  it("lifts the ghost so its bottom edge sits above the finger for coarse pointers", () => {
    const c = ghostCenter({ x: 100, y: 200 }, 80, true);
    expect(c).toEqual({ x: 100, y: 200 - ghostTouchLiftPx - 40 });
    expect(c.y + 40).toBe(200 - ghostTouchLiftPx);
  });
});

describe("isInside", () => {
  const r = { left: 10, top: 20, width: 100, height: 50 };
  it("includes the edges and excludes points past them", () => {
    expect(isInside({ x: 10, y: 20 }, r)).toBe(true);
    expect(isInside({ x: 110, y: 70 }, r)).toBe(true);
    expect(isInside({ x: 9.9, y: 40 }, r)).toBe(false);
    expect(isInside({ x: 50, y: 70.1 }, r)).toBe(false);
  });
});

describe("placeGhost", () => {
  const wallRect = { left: 100, top: 50, width: 600, height: 500 }; // 2 px/cm
  const base = { wallRect, size: { w: 40, h: 50 }, pxPerCm: 2, wall: WALL, grid: DEFAULT_GRID, coarse: false };

  it("is off the wall when the center is outside the wall rect", () => {
    expect(placeGhost({ ...base, centerPx: { x: 99, y: 300 } })).toEqual({ overWall: false });
  });

  it("is off the wall before the wall has a scale", () => {
    expect(placeGhost({ ...base, pxPerCm: 0, centerPx: { x: 300, y: 300 } })).toEqual({ overWall: false });
  });

  it("converts the center to a wall top-left, center and on-screen top-left", () => {
    // Center at wall px (200, 250) = cm (100, 125); top-left cm (80, 100).
    const r = placeGhost({ ...base, centerPx: { x: 300, y: 300 } });
    expect(r).toEqual({
      overWall: true,
      topLeftPx: { x: 100 + 160, y: 50 + 200 },
      commitCm: { x: 80, y: 100 },
      centerCm: { x: 100, y: 125 },
      guides: [],
    });
  });

  it("snaps like a frame, draws at the snapped spot and reports the guides", () => {
    const grid = { ...DEFAULT_GRID, enabled: true, snap: true };
    // Top-left cm (81, 101): 1 cm (2 px) from the 80 and 100 lines, inside the 8 px threshold.
    const r = placeGhost({ ...base, grid, centerPx: { x: 100 + 2 * 101, y: 50 + 2 * 126 } });
    expect(r).toMatchObject({
      overWall: true,
      topLeftPx: { x: 260, y: 250 },
      commitCm: { x: 80, y: 100 },
      centerCm: { x: 100, y: 125 },
    });
    expect(r.overWall && r.guides.map((g) => g.axis)).toEqual(["x", "y"]);
  });

  it("clamps the landing spot inside the wall near an edge", () => {
    // Center 5 cm from the right edge: the 40 cm frame would stick out by 15 cm.
    const r = placeGhost({ ...base, centerPx: { x: 100 + 2 * 295, y: 300 } });
    expect(r.overWall && r.commitCm).toEqual({ x: 260, y: 100 });
    expect(r.overWall && r.centerCm).toEqual({ x: 280, y: 125 });
  });
});
