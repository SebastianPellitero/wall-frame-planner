import { describe, expect, it } from "vitest";
import type { Shape, ShapeKind } from "../types";
import { overlaps, separationCandidates } from "./collisionMath";

const shape = (kind: ShapeKind, x: number, y: number, w: number, h: number = w): Shape => ({
  id: `${kind}-${x}-${y}`,
  kind,
  x,
  y,
  w,
  h,
  color: 1,
  mat: true,
});
const rect = (x: number, y: number, w: number, h: number) => shape("rect", x, y, w, h);
const circle = (x: number, y: number, d: number) => shape("circle", x, y, d, d);

const moved = (s: Shape, t: { x: number; y: number }): Shape => ({ ...s, x: s.x + t.x, y: s.y + t.y });

describe("separationCandidates", () => {
  it("returns [] when the shapes do not overlap", () => {
    expect(separationCandidates(rect(0, 0, 20, 20), rect(30, 0, 20, 20), 3)).toEqual([]);
    expect(separationCandidates(circle(0, 0, 20), circle(30, 0, 20), 3)).toEqual([]);
    expect(separationCandidates(rect(0, 0, 20, 20), circle(30, 0, 20), 3)).toEqual([]);
    expect(separationCandidates(circle(0, 0, 20), rect(30, 0, 20, 20), 3)).toEqual([]);
  });

  it("returns [] when the shapes only touch at the gap", () => {
    expect(separationCandidates(rect(0, 0, 20, 20), rect(23, 0, 20, 20), 3)).toEqual([]);
  });

  describe("rect / rect", () => {
    const a = rect(0, 0, 20, 20);
    const b = rect(15, 5, 20, 20);

    it("returns the 4 axis pushes with exact amounts, shortest first", () => {
      expect(separationCandidates(a, b, 0)).toEqual([
        { x: 5, y: 0 }, // right: b.x -> 20
        { x: 0, y: 15 }, // down: b.y -> 20
        { x: 0, y: -25 }, // up: b.bottom -> 0
        { x: -35, y: 0 }, // left: b.right -> 0
      ]);
    });

    it("includes the gap in every push", () => {
      expect(separationCandidates(a, b, 3)).toEqual([
        { x: 8, y: 0 },
        { x: 0, y: 18 },
        { x: 0, y: -28 },
        { x: -38, y: 0 },
      ]);
    });

    it("pushes b away from a, not the other way round", () => {
      // b is left of a's center: pushing left is the shortest exit
      expect(separationCandidates(a, rect(-15, 5, 20, 20), 0)[0]).toEqual({ x: -5, y: 0 });
    });

    it("never emits -0", () => {
      for (const c of separationCandidates(a, b, 0)) {
        expect(Object.is(c.x, -0)).toBe(false);
        expect(Object.is(c.y, -0)).toBe(false);
      }
    });
  });

  describe("circle / circle", () => {
    it("pushes radially first, along a -> b", () => {
      const a = circle(0, 0, 20);
      const b = circle(10, 0, 20); // centers (10,10) and (20,10)
      const [first] = separationCandidates(a, b, 0);
      expect(first).toEqual({ x: 10, y: 0 });
    });

    it("pushes along the diagonal when the centers are diagonal", () => {
      const a = circle(0, 0, 20);
      const b = circle(10, 10, 20); // centers 14.14 apart, need 20
      const [first] = separationCandidates(a, b, 0);
      expect(first.x).toBeCloseTo(4.142, 3);
      expect(first.y).toBeCloseTo(4.142, 3);
    });

    it("pushes toward -x/-y when b is up-left of a", () => {
      const a = circle(10, 10, 20);
      const b = circle(0, 0, 20);
      const [first] = separationCandidates(a, b, 0);
      expect(first.x).toBeCloseTo(-4.142, 3);
      expect(first.y).toBeCloseTo(-4.142, 3);
    });

    it("uses (1, 0) when the centers coincide", () => {
      const [first] = separationCandidates(circle(0, 0, 20), circle(0, 0, 20), 0);
      expect(first).toEqual({ x: 20, y: 0 });
    });

    it("includes the gap in the radial push", () => {
      const [first] = separationCandidates(circle(0, 0, 20), circle(10, 0, 20), 3);
      expect(first).toEqual({ x: 13, y: 0 });
    });

    it("follows the radial push with the 4 bounding-box axis pushes, shortest first", () => {
      const a = circle(0, 0, 20);
      const b = circle(10, 0, 20);
      const all = separationCandidates(a, b, 0);
      expect(all).toHaveLength(5);
      const lengths = all.slice(1).map((p) => Math.hypot(p.x, p.y));
      expect(lengths).toEqual([...lengths].sort((m, n) => m - n));
      expect(all[1]).toEqual({ x: 10, y: 0 }); // bounding-box right push
    });
  });

  describe("circle / rect", () => {
    it("rect a, circle b: pushes b along the closest-point normal first", () => {
      const a = rect(0, 0, 20, 20);
      const b = circle(15, 0, 20); // center (25, 10); closest point on a is (20, 10), 5 away
      const [first] = separationCandidates(a, b, 0);
      expect(first).toEqual({ x: 5, y: 0 });
    });

    it("rect a, circle b: pushes diagonally off a corner", () => {
      const a = rect(0, 0, 20, 20);
      const b = circle(14, 14, 20); // center (24, 24); closest point (20, 20), 5.657 away
      const [first] = separationCandidates(a, b, 0);
      expect(first.x).toBeCloseTo(3.071, 3);
      expect(first.y).toBeCloseTo(3.071, 3);
    });

    it("circle a, rect b: moves the rect away from the circle", () => {
      const a = circle(0, 0, 20); // center (10, 10)
      const b = rect(15, 0, 20, 20); // closest point (15, 10), 5 away
      const [first] = separationCandidates(a, b, 0);
      expect(first).toEqual({ x: 5, y: 0 });
    });

    it("circle a, rect b: moves the rect diagonally off the circle", () => {
      const a = circle(14, 14, 20); // center (24, 24)
      const b = rect(0, 0, 20, 20); // closest point (20, 20)
      const [first] = separationCandidates(a, b, 0);
      expect(first.x).toBeCloseTo(-3.071, 3);
      expect(first.y).toBeCloseTo(-3.071, 3);
    });

    it("includes the gap", () => {
      const [first] = separationCandidates(rect(0, 0, 20, 20), circle(15, 0, 20), 3);
      expect(first).toEqual({ x: 8, y: 0 });
    });

    it("circle b with its center inside rect a: exits by the shortest axis", () => {
      const a = rect(0, 0, 40, 40);
      const b = circle(2, 10, 20); // center (12, 20): left exit -22, right 38, up -30, down 30
      const [first] = separationCandidates(a, b, 0);
      expect(first).toEqual({ x: -22, y: 0 });
    });

    it("rect b containing circle a's center: the rect moves the opposite way", () => {
      const a = circle(2, 10, 20); // center (12, 20)
      const b = rect(0, 0, 40, 40); // moving b right by 22 clears the circle
      const [first] = separationCandidates(a, b, 0);
      expect(first).toEqual({ x: 22, y: 0 });
    });

    it("follows the normal push with the 4 bounding-box axis pushes", () => {
      const all = separationCandidates(rect(0, 0, 20, 20), circle(15, 0, 20), 0);
      expect(all).toHaveLength(5);
      const lengths = all.slice(1).map((p) => Math.hypot(p.x, p.y));
      expect(lengths).toEqual([...lengths].sort((m, n) => m - n));
    });
  });

  describe("every candidate separates the pair", () => {
    const pairs: Array<[string, Shape, Shape]> = [
      ["rect/rect", rect(0, 0, 20, 30), rect(12, 18, 25, 10)],
      ["circle/circle", circle(0, 0, 24), circle(9, 7, 18)],
      ["circle/circle (coincident)", circle(5, 5, 20), circle(5, 5, 20)],
      ["rect/circle", rect(0, 0, 30, 20), circle(22, 4, 16)],
      ["circle/rect", circle(10, 10, 26), rect(24, 18, 12, 30)],
      ["rect/circle (center inside)", rect(0, 0, 50, 50), circle(15, 15, 20)],
      ["circle/rect (center inside)", circle(15, 15, 20), rect(0, 0, 50, 50)],
    ];

    for (const gap of [0, 3]) {
      for (const [name, a, b] of pairs) {
        it(`${name}, gap ${gap}`, () => {
          expect(overlaps(a, b, gap)).toBe(true);
          const candidates = separationCandidates(a, b, gap);
          expect(candidates.length).toBeGreaterThanOrEqual(4);
          for (const c of candidates) {
            expect(overlaps(a, moved(b, c), gap)).toBe(false);
          }
        });
      }
    }
  });
});
