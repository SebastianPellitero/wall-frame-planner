import { describe, expect, it } from "vitest";
import { MIN_SIZE_CM } from "../defaults";
import {
  clamp,
  clampSize,
  clampToWall,
  cmToPx,
  pxToCm,
  round1,
  rubberBand,
  rubberBandPosition,
  shapeCenter,
} from "./geometry";

describe("cmToPx / pxToCm", () => {
  it("scales by pxPerCm", () => {
    expect(cmToPx(10, 3.5)).toBe(35);
    expect(pxToCm(35, 3.5)).toBe(10);
  });

  it("round-trips", () => {
    expect(pxToCm(cmToPx(37.3, 2.2), 2.2)).toBeCloseTo(37.3, 10);
  });
});

describe("round1", () => {
  it("rounds to 0.1 cm", () => {
    expect(round1(1.24)).toBe(1.2);
    expect(round1(1.26)).toBe(1.3);
    expect(round1(10)).toBe(10);
  });

  it("removes float noise", () => {
    expect(round1(0.1 + 0.2)).toBe(0.3);
    expect(round1(130.00000000000003)).toBe(130);
  });

  it("rounds negatives", () => {
    expect(round1(-1.26)).toBe(-1.3);
  });

  it("never returns -0", () => {
    expect(Object.is(round1(-0.04), 0)).toBe(true);
    expect(Object.is(round1(-0), 0)).toBe(true);
  });
});

describe("clamp", () => {
  it("limits a value to [lo, hi]", () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-5, 0, 10)).toBe(0);
    expect(clamp(15, 0, 10)).toBe(10);
  });
});

describe("shapeCenter", () => {
  it("returns the middle of the rect", () => {
    expect(shapeCenter({ x: 10, y: 20, w: 40, h: 50 })).toEqual({ x: 30, y: 45 });
  });
});

describe("clampToWall", () => {
  const wall = { width: 300, height: 250 };

  it("leaves an inside rect alone", () => {
    expect(clampToWall({ x: 10, y: 20, w: 40, h: 50 }, wall)).toEqual({ x: 10, y: 20 });
  });

  it("clamps to the top-left", () => {
    expect(clampToWall({ x: -15, y: -1, w: 40, h: 50 }, wall)).toEqual({ x: 0, y: 0 });
  });

  it("clamps to the bottom-right so the whole rect stays inside", () => {
    expect(clampToWall({ x: 290, y: 240, w: 40, h: 50 }, wall)).toEqual({ x: 260, y: 200 });
  });

  it("returns 0 on an axis where the shape is bigger than the wall", () => {
    expect(clampToWall({ x: 50, y: 20, w: 400, h: 50 }, wall)).toEqual({ x: 0, y: 20 });
    expect(clampToWall({ x: 50, y: 20, w: 40, h: 500 }, wall)).toEqual({ x: 50, y: 0 });
  });

  it("never returns -0", () => {
    const p = clampToWall({ x: -0, y: -0, w: 400, h: 500 }, wall);
    expect(Object.is(p.x, 0)).toBe(true);
    expect(Object.is(p.y, 0)).toBe(true);
  });
});

describe("rubberBand", () => {
  const factor = 0.35;
  const maxPx = 30;

  it("is 0 at 0 (and never -0)", () => {
    expect(Object.is(rubberBand(0, factor, maxPx), 0)).toBe(true);
    expect(Object.is(rubberBand(-0, factor, maxPx), 0)).toBe(true);
  });

  it("has slope = factor at 0", () => {
    const o = 0.001;
    expect(rubberBand(o, factor, maxPx) / o).toBeCloseTo(factor, 3);
  });

  it("follows the documented curve", () => {
    // 30 * (1 - 1 / (100 * 0.35 / 30 + 1)) = 16.153...
    expect(rubberBand(100, factor, maxPx)).toBeCloseTo(16.1538, 3);
  });

  it("never exceeds maxPx, even for huge pulls", () => {
    expect(rubberBand(1e9, factor, maxPx)).toBeLessThan(maxPx);
    expect(rubberBand(1e9, factor, maxPx)).toBeCloseTo(maxPx, 3);
  });

  it("is monotonic increasing", () => {
    let prev = 0;
    for (const o of [1, 5, 20, 80, 300, 1000]) {
      const v = rubberBand(o, factor, maxPx);
      expect(v).toBeGreaterThan(prev);
      prev = v;
    }
  });

  it("is odd-symmetric", () => {
    expect(rubberBand(-40, factor, maxPx)).toBe(-rubberBand(40, factor, maxPx));
  });

  it("returns 0 for a non-positive maxPx instead of NaN", () => {
    expect(rubberBand(50, factor, 0)).toBe(0);
  });
});

describe("rubberBandPosition", () => {
  const factor = 0.35;
  const maxPx = 30;

  it("returns pos unchanged inside [min, max]", () => {
    expect(rubberBandPosition(50, 0, 100, factor, maxPx)).toBe(50);
    expect(rubberBandPosition(0, 0, 100, factor, maxPx)).toBe(0);
    expect(rubberBandPosition(100, 0, 100, factor, maxPx)).toBe(100);
  });

  it("pulls back below min", () => {
    const shown = rubberBandPosition(-40, 0, 100, factor, maxPx);
    expect(shown).toBe(-rubberBand(40, factor, maxPx));
    expect(shown).toBeLessThan(0);
    expect(shown).toBeGreaterThan(-maxPx);
  });

  it("pulls back above max", () => {
    const shown = rubberBandPosition(160, 0, 100, factor, maxPx);
    expect(shown).toBe(100 + rubberBand(60, factor, maxPx));
    expect(shown).toBeGreaterThan(100);
    expect(shown).toBeLessThan(100 + maxPx);
  });

  it("uses min when the range is inverted (frame bigger than the wall)", () => {
    expect(rubberBandPosition(-5, 0, -10, factor, maxPx)).toBe(-rubberBand(5, factor, maxPx));
  });
});

describe("clampSize", () => {
  const wall = { width: 300, height: 250 };

  it("keeps an in-range rect size", () => {
    expect(clampSize("rect", 40, 50, wall)).toEqual({ w: 40, h: 50 });
  });

  it("clamps rect sides independently to [MIN_SIZE_CM, wall dimension]", () => {
    expect(clampSize("rect", 0, 999, wall)).toEqual({ w: MIN_SIZE_CM, h: 250 });
    expect(clampSize("rect", 999, -3, wall)).toEqual({ w: 300, h: MIN_SIZE_CM });
  });

  it("forces square and circle to w === h from w, capped by the shorter wall side", () => {
    expect(clampSize("square", 30, 99, wall)).toEqual({ w: 30, h: 30 });
    expect(clampSize("circle", 400, 10, wall)).toEqual({ w: 250, h: 250 });
    expect(clampSize("square", 0, 0, wall)).toEqual({ w: MIN_SIZE_CM, h: MIN_SIZE_CM });
  });

  it("rounds with round1", () => {
    expect(clampSize("rect", 40.04, 50.06, wall)).toEqual({ w: 40, h: 50.1 });
    expect(clampSize("circle", 30.26, 0, wall)).toEqual({ w: 30.3, h: 30.3 });
  });
});
