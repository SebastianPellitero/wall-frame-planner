import { describe, expect, it } from "vitest";
import type { Shape, ShapeKind } from "../types";
import { EPS, overlaps } from "./collisionMath";

const shape = (kind: ShapeKind, x: number, y: number, w: number, h: number = w): Shape => ({
  id: `${kind}-${x}-${y}`,
  kind,
  x,
  y,
  w,
  h,
  color: 1,
});
const rect = (x: number, y: number, w: number, h: number) => shape("rect", x, y, w, h);
const circle = (x: number, y: number, d: number) => shape("circle", x, y, d, d);

describe("EPS", () => {
  it("is 0.1 cm", () => {
    expect(EPS).toBe(0.1);
  });
});

describe("overlaps", () => {
  describe("rect / rect", () => {
    const a = rect(0, 0, 20, 20);

    it("is true when the rects intersect", () => {
      expect(overlaps(a, rect(10, 10, 20, 20))).toBe(true);
    });

    it("is true when one contains the other", () => {
      expect(overlaps(a, rect(5, 5, 4, 4))).toBe(true);
    });

    it("is false when apart", () => {
      expect(overlaps(a, rect(30, 0, 20, 20))).toBe(false);
    });

    it("is false when edges touch (distance exactly 0 with no gap)", () => {
      expect(overlaps(a, rect(20, 0, 20, 20))).toBe(false);
      expect(overlaps(a, rect(0, 20, 20, 20))).toBe(false);
    });

    it("treats a distance of exactly gap as not overlapping", () => {
      expect(overlaps(a, rect(23, 0, 20, 20), 3)).toBe(false);
      expect(overlaps(a, rect(0, 23, 20, 20), 3)).toBe(false);
    });

    it("is true when closer than gap", () => {
      expect(overlaps(a, rect(22, 0, 20, 20), 3)).toBe(true);
    });

    it("ignores a shortfall under EPS but not over it", () => {
      expect(overlaps(a, rect(22.95, 0, 20, 20), 3)).toBe(false); // 0.05 short
      expect(overlaps(a, rect(22.85, 0, 20, 20), 3)).toBe(true); // 0.15 short
    });

    it("inflates by gap on both axes, so diagonal neighbors within gap overlap", () => {
      expect(overlaps(a, rect(22, 22, 20, 20), 3)).toBe(true);
      expect(overlaps(a, rect(22, 24, 20, 20), 3)).toBe(false); // y apart by 4 >= gap
    });

    it("is symmetric", () => {
      const b = rect(15, 5, 20, 20);
      expect(overlaps(a, b, 3)).toBe(overlaps(b, a, 3));
      const c = rect(40, 40, 5, 5);
      expect(overlaps(a, c, 3)).toBe(overlaps(c, a, 3));
    });
  });

  describe("circle / circle", () => {
    const a = circle(0, 0, 20); // center (10, 10), r 10

    it("is true when centers are closer than the radii sum", () => {
      expect(overlaps(a, circle(15, 0, 20))).toBe(true);
    });

    it("is true for coincident circles", () => {
      expect(overlaps(a, circle(0, 0, 20))).toBe(true);
    });

    it("is false when tangent", () => {
      expect(overlaps(a, circle(20, 0, 20))).toBe(false);
    });

    it("is false when bounding boxes overlap but the circles do not", () => {
      // centers (10,10) and (25,25): distance 21.2 > 20
      expect(overlaps(a, circle(15, 15, 20))).toBe(false);
    });

    it("uses gap on the center distance", () => {
      expect(overlaps(a, circle(23, 0, 20), 3)).toBe(false); // distance 23 = 10 + 10 + 3
      expect(overlaps(a, circle(22, 0, 20), 3)).toBe(true);
    });

    it("handles different radii", () => {
      const small = circle(20, 5, 10); // center (25, 10), r 5: distance 15 = 10 + 5, tangent
      expect(overlaps(a, small)).toBe(false);
      expect(overlaps(a, circle(19, 5, 10))).toBe(true);
    });
  });

  describe("circle / rect", () => {
    const c = circle(0, 0, 20); // center (10, 10), r 10

    it("is true when the rect reaches into the circle (either order)", () => {
      const r = rect(15, 0, 20, 20);
      expect(overlaps(c, r)).toBe(true);
      expect(overlaps(r, c)).toBe(true);
    });

    it("is false when the rect is tangent to the circle (either order)", () => {
      const r = rect(20, 0, 20, 20);
      expect(overlaps(c, r)).toBe(false);
      expect(overlaps(r, c)).toBe(false);
    });

    it("measures to the rect's closest point, so a clipped corner does not overlap", () => {
      // corner (18, 18) is 11.3 from the center; bounding boxes overlap
      const r = rect(18, 18, 20, 20);
      expect(overlaps(c, r)).toBe(false);
      expect(overlaps(r, c)).toBe(false);
      // corner (16, 16) is 8.5 from the center
      expect(overlaps(c, rect(16, 16, 20, 20))).toBe(true);
    });

    it("always overlaps when the circle center is inside the rect", () => {
      const big = rect(-10, -10, 60, 60); // contains the whole circle
      expect(overlaps(c, big)).toBe(true);
      expect(overlaps(big, c)).toBe(true);
      const holdsCenter = rect(9, 9, 2, 2); // inside the circle, around its center
      expect(overlaps(c, holdsCenter)).toBe(true);
      expect(overlaps(holdsCenter, c)).toBe(true);
    });

    it("uses gap on the distance to the closest point", () => {
      expect(overlaps(c, rect(23, 0, 20, 20), 3)).toBe(false); // 13 = 10 + 3
      expect(overlaps(c, rect(22, 0, 20, 20), 3)).toBe(true);
      expect(overlaps(rect(23, 0, 20, 20), c, 3)).toBe(false);
      expect(overlaps(rect(22, 0, 20, 20), c, 3)).toBe(true);
    });
  });
});
