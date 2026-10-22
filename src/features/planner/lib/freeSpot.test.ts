import { describe, expect, it } from "vitest";
import type { Shape, ShapeKind, Wall } from "../types";
import { overlaps } from "./collision";
import { findFreeSpot } from "./freeSpot";

const wall: Wall = { width: 300, height: 250, pushGap: 3 };
const rectSize = { kind: "rect" as const, w: 40, h: 50 };

const shape = (id: string, kind: ShapeKind, x: number, y: number, w: number, h: number = w): Shape => ({
  id,
  kind,
  x,
  y,
  w,
  h,
  color: 1,
});

/** A shape of `size` whose center sits at (cx, cy). */
const centeredAt = (id: string, size: { kind: ShapeKind; w: number; h: number }, cx: number, cy: number): Shape =>
  shape(id, size.kind, cx - size.w / 2, cy - size.h / 2, size.w, size.h);

const near = { x: 150, y: 125 };

describe("findFreeSpot", () => {
  it("returns the spot centered on near when the wall is empty", () => {
    expect(findFreeSpot(rectSize, [], wall, near)).toEqual({ x: 130, y: 100 });
  });

  it("rounds the result to 0.1 cm", () => {
    expect(findFreeSpot(rectSize, [], wall, { x: 100.06, y: 100 })).toEqual({ x: 80.1, y: 75 });
  });

  it("avoids an occupied center and picks the nearest free lattice spot", () => {
    const blocker = centeredAt("a", rectSize, near.x, near.y); // x 130..170, y 100..150
    const spot = findFreeSpot(rectSize, [blocker], wall, near);
    // east needs a 43 cm shift to clear the 3 cm gap; the 5 cm lattice gives 45
    expect(spot).toEqual({ x: 175, y: 100 });
    expect(overlaps(blocker, { ...rectSize, ...spot! }, wall.pushGap)).toBe(false);
  });

  it("aligns the lattice to near, not to the wall origin", () => {
    const n = { x: 153, y: 125 };
    const blocker = centeredAt("a", rectSize, n.x, n.y);
    // step 10: shifts are multiples of 10 from near; 50 is the first that clears 40 + 3
    expect(findFreeSpot(rectSize, [blocker], wall, n, { step: 10 })).toEqual({ x: 183, y: 100 });
  });

  it("allows touching when gap is 0", () => {
    const blocker = centeredAt("a", rectSize, near.x, near.y);
    expect(findFreeSpot(rectSize, [blocker], wall, near, { gap: 0 })).toEqual({ x: 170, y: 100 });
  });

  it("uses wall.pushGap when no gap is given", () => {
    const blocker = centeredAt("a", rectSize, near.x, near.y);
    const roomy = findFreeSpot(rectSize, [blocker], { ...wall, pushGap: 20 }, near);
    // needs 40 + 20 = 60 cm of shift; 60 is on the lattice
    expect(roomy).toEqual({ x: 190, y: 100 });
  });

  it("respects the wall bounds", () => {
    expect(findFreeSpot(rectSize, [], wall, { x: 0, y: 0 })).toEqual({ x: 0, y: 0 });
    expect(findFreeSpot(rectSize, [], wall, { x: 999, y: 999 })).toEqual({ x: 260, y: 200 });
    expect(findFreeSpot(rectSize, [], wall, { x: -50, y: -50 })).toEqual({ x: 0, y: 0 });
  });

  it("keeps every result inside the wall when the corner is crowded", () => {
    const blocker = shape("a", "rect", 0, 0, 80, 100);
    for (const n of [
      { x: 20, y: 25 },
      { x: 280, y: 230 },
      { x: 150, y: 10 },
    ]) {
      const spot = findFreeSpot(rectSize, [blocker], wall, n);
      expect(spot).not.toBeNull();
      expect(spot!.x).toBeGreaterThanOrEqual(0);
      expect(spot!.y).toBeGreaterThanOrEqual(0);
      expect(spot!.x + rectSize.w).toBeLessThanOrEqual(wall.width);
      expect(spot!.y + rectSize.h).toBeLessThanOrEqual(wall.height);
      expect(overlaps(blocker, { ...rectSize, ...spot! }, wall.pushGap)).toBe(false);
    }
  });

  it("returns null when the wall is full", () => {
    const full = shape("a", "rect", 0, 0, wall.width, wall.height);
    expect(findFreeSpot(rectSize, [full], wall, near)).toBeNull();
  });

  it("returns null when the shape cannot fit next to what is already there", () => {
    const tight: Wall = { width: 100, height: 100, pushGap: 3 };
    const big = { kind: "rect" as const, w: 60, h: 60 };
    const existing = shape("a", "rect", 0, 0, 60, 60);
    expect(findFreeSpot(big, [existing], tight, { x: 50, y: 50 })).toBeNull();
  });

  it("checks every existing shape", () => {
    const left = shape("l", "rect", 0, 0, 300, 100);
    const right = shape("r", "rect", 0, 100, 300, 150);
    expect(findFreeSpot(rectSize, [left, right], wall, near)).toBeNull();
  });

  it("is deterministic", () => {
    const shapes = [centeredAt("a", rectSize, near.x, near.y), shape("b", "circle", 200, 60, 40)];
    const first = findFreeSpot(rectSize, shapes, wall, near);
    expect(findFreeSpot(rectSize, shapes, wall, near)).toEqual(first);
    expect(findFreeSpot(rectSize, [...shapes].reverse(), wall, near)).toEqual(first);
  });

  it("breaks distance ties by angle: east, then south, west and north", () => {
    // East first (angle 0)
    const blocker = centeredAt("a", rectSize, near.x, near.y);
    expect(findFreeSpot(rectSize, [blocker], wall, near)).toEqual({ x: 175, y: 100 });

    // A wall exactly as wide as the shape allows only vertical moves; north and south tie at 55 cm
    const narrow: Wall = { width: 40, height: 250, pushGap: 3 };
    const mid = centeredAt("m", rectSize, 20, 125);
    expect(findFreeSpot(rectSize, [mid], narrow, { x: 20, y: 125 })).toEqual({ x: 0, y: 155 });

    // With south blocked too, north is next
    const south = shape("s", "rect", 0, 150, 40, 100);
    expect(findFreeSpot(rectSize, [mid, south], narrow, { x: 20, y: 125 })).toEqual({ x: 0, y: 45 });
  });

  it("measures against the shape kinds, so circles can sit closer than their bounding boxes", () => {
    const circle = { kind: "circle" as const, w: 30, h: 30 };
    const blocker = centeredAt("a", { kind: "circle", w: 40, h: 40 }, near.x, near.y);
    // centers must be 20 + 15 + 3 = 38 apart; the nearest lattice points are (35, 15) and permutations,
    // and (35, 15) comes first by angle
    const spot = findFreeSpot(circle, [blocker], wall, near);
    expect(spot).toEqual({ x: 170, y: 125 });
    expect(overlaps(blocker, { ...circle, ...spot! }, wall.pushGap)).toBe(false);
  });

  it("does not mutate its inputs", () => {
    const shapes = Object.freeze([Object.freeze(centeredAt("a", rectSize, near.x, near.y))]) as unknown as Shape[];
    const frozenWall = Object.freeze({ ...wall });
    expect(() => findFreeSpot(rectSize, shapes, frozenWall, near)).not.toThrow();
  });
});
