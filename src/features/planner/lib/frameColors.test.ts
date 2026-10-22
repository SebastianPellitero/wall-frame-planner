import { describe, expect, it } from "vitest";
import { colorFromId, FRAME_COLORS, isFrameColor, pickFrameColor } from "./frameColors";

/** A small deterministic PRNG (mulberry32), so draws are repeatable. */
function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe("FRAME_COLORS", () => {
  it("is the ten curated finishes, 1 to 10 (design-system.md §3.2)", () => {
    expect(FRAME_COLORS).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });
});

describe("isFrameColor", () => {
  it.each([1, 5, 10])("accepts %j", (v) => expect(isFrameColor(v)).toBe(true));
  it.each([0, 11, 2.5, -1, "3", null, undefined, NaN])("rejects %j", (v) => expect(isFrameColor(v)).toBe(false));
});

describe("pickFrameColor", () => {
  it("picks uniformly from all ten without a previous color", () => {
    expect(pickFrameColor(undefined, () => 0)).toBe(1);
    expect(pickFrameColor(undefined, () => 0.999999)).toBe(10);
    expect(pickFrameColor(undefined, () => 0.45)).toBe(5);
  });

  it("never returns the previous color, even at the rng's edges", () => {
    expect(pickFrameColor(1, () => 0)).toBe(2);
    expect(pickFrameColor(10, () => 0.999999)).toBe(9);
    expect(pickFrameColor(4, () => 0.34)).toBe(5);
    // An rng that misbehaves and returns 1 still stays in range.
    expect(pickFrameColor(10, () => 1)).toBe(9);
  });

  it("over many seeded draws never repeats and covers the other nine", () => {
    const rng = seeded(42);
    let prev = pickFrameColor(undefined, rng);
    const seen = new Set<number>([prev]);
    for (let i = 0; i < 2000; i++) {
      const next = pickFrameColor(prev, rng);
      expect(next).not.toBe(prev);
      expect(isFrameColor(next)).toBe(true);
      seen.add(next);
      prev = next;
    }
    expect([...seen].sort((a, b) => a - b)).toEqual([...FRAME_COLORS]);
  });

  it("from a fixed previous color reaches every other color", () => {
    const rng = seeded(7);
    const seen = new Set<number>();
    for (let i = 0; i < 500; i++) seen.add(pickFrameColor(3, rng));
    expect([...seen].sort((a, b) => a - b)).toEqual([1, 2, 4, 5, 6, 7, 8, 9, 10]);
  });
});

describe("colorFromId", () => {
  it("is stable for an id", () => {
    expect(colorFromId("a")).toBe(colorFromId("a"));
    expect(colorFromId("legacy-frame-17")).toBe(colorFromId("legacy-frame-17"));
  });

  it("is always a frame color and spreads ids across the finishes", () => {
    const colors = new Set<number>();
    for (let i = 0; i < 200; i++) {
      const c = colorFromId(`shape-${i}`);
      expect(isFrameColor(c)).toBe(true);
      colors.add(c);
    }
    expect(colors.size).toBe(10);
  });
});
