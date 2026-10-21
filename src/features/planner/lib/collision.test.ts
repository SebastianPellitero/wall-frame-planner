import { describe, expect, it } from "vitest";
import type { Shape, ShapeKind, Wall } from "../types";
import * as collision from "./collision";
import * as collisionMath from "./collisionMath";
import { resolveOverlaps } from "./collision";
import { round1 } from "./geometry";

const wall: Wall = { width: 200, height: 200, pushGap: 3 };

const shape = (id: string, kind: ShapeKind, x: number, y: number, w: number, h: number = w): Shape => ({
  id,
  kind,
  x,
  y,
  w,
  h,
});
const rect = (id: string, x: number, y: number, w: number, h: number) => shape(id, "rect", x, y, w, h);
const circle = (id: string, x: number, y: number, d: number) => shape(id, "circle", x, y, d, d);

const byId = (shapes: Shape[], id: string): Shape => {
  const found = shapes.find((s) => s.id === id);
  if (!found) throw new Error(`missing shape ${id}`);
  return found;
};

describe("collision module", () => {
  it("re-exports the pair math", () => {
    expect(collision.EPS).toBe(collisionMath.EPS);
    expect(collision.overlaps).toBe(collisionMath.overlaps);
    expect(collision.separationCandidates).toBe(collisionMath.separationCandidates);
  });
});

describe("resolveOverlaps", () => {
  it("returns a new array and keeps every shape when nothing overlaps", () => {
    const shapes = [rect("a", 0, 0, 40, 40), rect("b", 100, 100, 40, 40)];
    const out = resolveOverlaps(shapes, "a", wall);
    expect(out).not.toBe(shapes);
    expect(out).toHaveLength(2);
    expect(out[0]).toBe(shapes[0]);
    expect(out[1]).toBe(shapes[1]);
  });

  it("returns an empty array for no shapes", () => {
    expect(resolveOverlaps([], "a", wall)).toEqual([]);
  });

  it("pushes an overlapped frame out by the exact amount, leaving the anchor fixed", () => {
    const a = rect("a", 50, 50, 40, 40);
    const b = rect("b", 70, 50, 40, 40);
    const out = resolveOverlaps([a, b], "a", wall);
    expect(out[0]).toBe(a);
    expect(out[1]).not.toBe(b);
    expect(out[1]).toEqual({ id: "b", kind: "rect", x: 93, y: 50, w: 40, h: 40 }); // a.right 90 + gap 3
  });

  it("keeps the anchor fixed and the order intact when the anchor is not first", () => {
    const b = rect("b", 70, 50, 40, 40);
    const a = rect("a", 50, 50, 40, 40);
    const out = resolveOverlaps([b, a], "a", wall);
    expect(out.map((s) => s.id)).toEqual(["b", "a"]);
    expect(out[1]).toBe(a);
    expect(out[0]).toEqual({ ...b, x: 93 });
  });

  it("uses wall.pushGap by default and opts.gap when given", () => {
    const a = rect("a", 50, 50, 40, 40);
    const b = rect("b", 70, 50, 40, 40);
    expect(byId(resolveOverlaps([a, b], "a", { ...wall, pushGap: 10 }), "b").x).toBe(100);
    expect(byId(resolveOverlaps([a, b], "a", wall, { gap: 0 }), "b").x).toBe(90);
  });

  it("leaves a frame that sits exactly one gap away alone", () => {
    const a = rect("a", 50, 50, 40, 40);
    const b = rect("b", 93, 50, 40, 40);
    const out = resolveOverlaps([a, b], "a", wall);
    expect(out[1]).toBe(b);
  });

  it("passes a push along a chain (A pushes B into C, so C moves)", () => {
    const a = rect("a", 20, 50, 40, 40);
    const b = rect("b", 50, 50, 40, 40);
    const c = rect("c", 100, 50, 40, 40);
    const out = resolveOverlaps([a, b, c], "a", wall);
    expect(out[0]).toBe(a);
    expect(byId(out, "b").x).toBe(63);
    expect(byId(out, "c").x).toBe(106);
    expect(collision.overlaps(byId(out, "b"), byId(out, "c"), wall.pushGap)).toBe(false);
  });

  it("finishes a chain even when the array order needs more than one pass", () => {
    const a = rect("a", 20, 50, 40, 40);
    const b = rect("b", 50, 50, 40, 40);
    const c = rect("c", 100, 50, 40, 40);
    const out = resolveOverlaps([c, a, b], "a", wall);
    expect(byId(out, "b").x).toBe(63);
    expect(byId(out, "c").x).toBe(106);
  });

  it("stops after maxIter passes with a best-effort result", () => {
    const a = rect("a", 20, 50, 40, 40);
    const b = rect("b", 50, 50, 40, 40);
    const c = rect("c", 100, 50, 40, 40);
    const shapes = [c, a, b];
    const one = resolveOverlaps(shapes, "a", wall, { maxIter: 1 });
    expect(byId(one, "b").x).toBe(63); // first pass moved b
    expect(one[0]).toBe(c); // but c needed a second pass
    const two = resolveOverlaps(shapes, "a", wall, { maxIter: 2 });
    expect(byId(two, "c").x).toBe(106);
  });

  it("falls back to another direction when the shortest push runs into a wall edge", () => {
    const a = rect("a", 150, 80, 40, 40);
    const b = rect("b", 170, 80, 30, 40); // flush with the right wall edge
    const out = resolveOverlaps([a, b], "a", wall);
    // right (23 cm) clamps back onto a; up (43 cm) clears it: b.bottom 77 = a.top 80 - gap 3
    expect(byId(out, "b")).toEqual({ ...b, x: 170, y: 37 });
  });

  it("applies the first candidate, clamped, when no direction can clear the overlap", () => {
    const small: Wall = { width: 100, height: 100, pushGap: 3 };
    const a = rect("a", 0, 0, 100, 100);
    const b = rect("b", 10, 10, 20, 20);
    const out = resolveOverlaps([a, b], "a", small);
    expect(out[0]).toBe(a);
    expect(byId(out, "b")).toEqual({ ...b, x: 0, y: 10 }); // left (-33) clamped to the wall
  });

  it("terminates on a fully packed wall without throwing", () => {
    const packed: Wall = { width: 100, height: 100, pushGap: 3 };
    const shapes: Shape[] = [];
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        shapes.push(rect(`s${row}${col}`, col * 33, row * 33, 30, 30));
      }
    }
    shapes.push(rect("anchor", 35, 35, 30, 30)); // ten frames cannot fit
    const out = resolveOverlaps(shapes, "anchor", packed);
    expect(out).toHaveLength(10);
    expect(byId(out, "anchor")).toBe(byId(shapes, "anchor"));
    for (const s of out) {
      expect(s.x).toBeGreaterThanOrEqual(0);
      expect(s.y).toBeGreaterThanOrEqual(0);
      expect(s.x + s.w).toBeLessThanOrEqual(packed.width);
      expect(s.y + s.h).toBeLessThanOrEqual(packed.height);
    }
  });

  it("never throws on a crowded wall, even with a tiny maxIter", () => {
    const packed: Wall = { width: 100, height: 100, pushGap: 3 };
    const shapes = [
      rect("a", 30, 30, 40, 40),
      rect("b", 10, 10, 40, 40),
      rect("c", 50, 10, 40, 40),
      rect("d", 10, 50, 40, 40),
      rect("e", 50, 50, 40, 40),
    ];
    expect(() => resolveOverlaps(shapes, "a", packed, { maxIter: 1 })).not.toThrow();
    expect(() => resolveOverlaps(shapes, "a", packed, { maxIter: 0 })).not.toThrow();
  });

  it("leaves untouched frames that overlap each other exactly as they were", () => {
    const a = rect("a", 10, 10, 30, 30);
    const x = rect("x", 120, 120, 40, 40);
    const y = rect("y", 130, 130, 40, 40); // overlaps x, but neither is disturbed
    const out = resolveOverlaps([a, x, y], "a", wall);
    expect(out[1]).toBe(x);
    expect(out[2]).toBe(y);
  });

  it("does not disturb overlapping bystanders while resolving something else", () => {
    const a = rect("a", 10, 10, 30, 30);
    const b = rect("b", 30, 10, 30, 30); // overlaps a, gets pushed
    const x = rect("x", 120, 120, 40, 40);
    const y = rect("y", 130, 130, 40, 40);
    const out = resolveOverlaps([a, b, x, y], "a", wall);
    expect(byId(out, "b").x).toBe(43);
    expect(out[2]).toBe(x);
    expect(out[3]).toBe(y);
  });

  it("preserves identity for unmoved shapes and returns fresh objects for moved ones", () => {
    const a = rect("a", 50, 50, 40, 40);
    const b = rect("b", 70, 50, 40, 40);
    const far = rect("far", 150, 150, 20, 20);
    const out = resolveOverlaps([a, b, far], "a", wall);
    expect(out[0]).toBe(a);
    expect(out[1]).not.toBe(b);
    expect(out[2]).toBe(far);
  });

  it("moves only the later of two disturbed frames, and never the earlier one again", () => {
    const a = rect("a", 50, 50, 60, 60);
    const b = rect("b", 100, 50, 30, 30);
    const c = rect("c", 100, 60, 30, 30);
    const out = resolveOverlaps([a, b, c], "a", wall);
    expect(out[0]).toBe(a);
    expect(byId(out, "b")).toEqual({ ...b, x: 113 });
    expect(byId(out, "c")).toEqual({ ...c, x: 113, y: 83 });
  });

  it("pushes a circle out of a rect anchor", () => {
    const a = rect("a", 50, 50, 40, 40);
    const b = circle("b", 70, 50, 40); // center (90, 70) sits on a's right edge
    const out = resolveOverlaps([a, b], "a", wall);
    expect(byId(out, "b")).toEqual({ ...b, x: 93 });
  });

  it("pushes a rect out of a circle anchor", () => {
    const a = circle("a", 50, 50, 40); // center (70, 70), r 20
    const b = rect("b", 70, 60, 30, 30);
    const out = resolveOverlaps([a, b], "a", wall);
    expect(byId(out, "b")).toEqual({ ...b, x: 93 });
  });

  it("pushes a circle radially off a circle anchor and rounds to 0.1 cm", () => {
    const a = circle("a", 50, 50, 40);
    const b = circle("b", 60, 60, 40); // centers 14.14 apart; need 43
    const out = resolveOverlaps([a, b], "a", wall);
    const pushed = byId(out, "b");
    expect(pushed.x).toBe(80.4);
    expect(pushed.y).toBe(80.4);
    expect(pushed.x).toBe(round1(pushed.x));
    expect(collision.overlaps(a, pushed, wall.pushGap)).toBe(false);
  });

  it("never leaves a pushed frame overlapping the anchor when a neighbor is jammed against the wall (regression)", () => {
    // Found by fuzzing: the anchor pushes s1 away, and s2 (jammed against the left wall) pushed it straight back.
    const jammed: Wall = { width: 100, height: 100, pushGap: 3 };
    const shapes = [rect("s0", 5, 25, 32, 20), rect("s1", 5, 44, 26, 31), rect("s2", 5, 46, 20, 19)];
    const out = resolveOverlaps(shapes, "s0", jammed);
    for (const s of out.slice(1)) expect(collision.overlaps(byId(out, "s0"), s, jammed.pushGap)).toBe(false);
  });

  it("changes nothing when the anchor id is not in the list", () => {
    const shapes = [rect("a", 50, 50, 40, 40), rect("b", 70, 50, 40, 40)];
    const out = resolveOverlaps(shapes, "missing", wall);
    expect(out).not.toBe(shapes);
    expect(out[0]).toBe(shapes[0]);
    expect(out[1]).toBe(shapes[1]);
  });

  it("does not mutate its input", () => {
    const a = Object.freeze(rect("a", 50, 50, 40, 40));
    const b = Object.freeze(rect("b", 70, 50, 40, 40));
    const shapes = Object.freeze([a, b]) as unknown as Shape[];
    expect(() => resolveOverlaps(shapes, "a", wall)).not.toThrow();
    expect(b.x).toBe(70);
  });
});
