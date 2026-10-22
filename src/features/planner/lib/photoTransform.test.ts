import { describe, expect, it } from "vitest";
import {
  initialPlacement,
  panBy,
  pinchStep,
  sliderToWidth,
  wheelZoomFactor,
  widthToSlider,
  zoomAround,
} from "./photoTransform";

const wall = { width: 300, height: 250 };
const bg = { x: 0, y: 0, width: 300, aspect: 0.75 };

/** The image point under `pivot`, as a fraction of the image box, before and after. */
const fractionAt = (p: { x: number; y: number; width: number; aspect: number }, pivot: { x: number; y: number }) => ({
  u: (pivot.x - p.x) / p.width,
  v: (pivot.y - p.y) / (p.width * p.aspect),
});

describe("initialPlacement", () => {
  it("covers the wall with a wide image: height fits, width overflows, centered", () => {
    // 2:1 image on a 300×250 wall: width = max(300, 250 / 0.5) = 500.
    expect(initialPlacement(2000, 1000, wall)).toEqual({ x: -100, y: 0, width: 500, aspect: 0.5 });
  });

  it("covers the wall with a tall image: width fits, height overflows, centered", () => {
    // 1:2 image: width = max(300, 250 / 2) = 300, height 600.
    expect(initialPlacement(1000, 2000, wall)).toEqual({ x: 0, y: -175, width: 300, aspect: 2 });
  });

  it("caps a panorama at 400% of the wall width, still centered, so the first zoom never jumps", () => {
    // 10:1 on a 300×250 wall: cover would be 2500 cm wide; the scale range stops at 1200.
    const p = initialPlacement(10000, 1000, wall);
    expect(p).toEqual({ x: -450, y: expect.closeTo(65), width: 1200, aspect: 0.1 });
    expect(zoomAround(p, 1.1, { x: 150, y: 125 }, wall)).toBe(p);
  });

  it("matches the wall exactly when the aspect is the wall's", () => {
    expect(initialPlacement(600, 500, wall)).toEqual({
      x: expect.closeTo(0),
      y: expect.closeTo(0),
      width: expect.closeTo(300),
      aspect: expect.closeTo(250 / 300),
    });
  });
});

describe("panBy", () => {
  it("moves the placement and keeps the rest", () => {
    expect(panBy({ ...bg, opacity: 0.5 }, 12, -7)).toEqual({ ...bg, opacity: 0.5, x: 12, y: -7 });
  });
});

describe("zoomAround", () => {
  it("keeps the pivot over the same image point", () => {
    const pivot = { x: 120, y: 80 };
    const before = fractionAt(bg, pivot);
    const after = zoomAround(bg, 1.5, pivot, wall);
    expect(after.width).toBeCloseTo(450);
    const f = fractionAt(after, pivot);
    expect(f.u).toBeCloseTo(before.u);
    expect(f.v).toBeCloseTo(before.v);
  });

  it("clamps the width to 25–400% of the wall width, still about the pivot", () => {
    const pivot = { x: 50, y: 40 };
    const big = zoomAround(bg, 10, pivot, wall);
    expect(big.width).toBe(1200);
    expect(fractionAt(big, pivot).u).toBeCloseTo(fractionAt(bg, pivot).u);
    expect(zoomAround(bg, 0.01, pivot, wall).width).toBe(75);
  });

  it("is a no-op when already at a clamp", () => {
    const max = { ...bg, x: -10, y: 5, width: 1200 };
    expect(zoomAround(max, 2, { x: 0, y: 0 }, wall)).toEqual(max);
  });
});

describe("pinchStep", () => {
  it("pans with the midpoint", () => {
    const next = pinchStep(bg, [{ x: 0, y: 0 }, { x: 100, y: 0 }], [{ x: 10, y: 5 }, { x: 110, y: 5 }], wall);
    expect(next).toEqual({ ...bg, x: 10, y: 5 });
  });

  it("zooms by the distance ratio around the new midpoint", () => {
    const next = pinchStep(bg, [{ x: 100, y: 100 }, { x: 200, y: 100 }], [{ x: 50, y: 100 }, { x: 250, y: 100 }], wall);
    expect(next.width).toBeCloseTo(600);
    // The image point under the old midpoint (150, 100) is still under the new one.
    expect(fractionAt(next, { x: 150, y: 100 })).toEqual(
      expect.objectContaining({ u: expect.closeTo(0.5), v: expect.closeTo(100 / 225) }),
    );
  });

  it("ignores a zero starting distance (both fingers on one spot)", () => {
    const next = pinchStep(bg, [{ x: 5, y: 5 }, { x: 5, y: 5 }], [{ x: 0, y: 5 }, { x: 10, y: 5 }], wall);
    expect(next.width).toBe(300);
  });
});

describe("slider mapping", () => {
  it("maps t ∈ [−2, 2] to 25–400% of the wall width on a log scale", () => {
    expect(sliderToWidth(0, wall)).toBe(300);
    expect(sliderToWidth(1, wall)).toBe(600);
    expect(sliderToWidth(-2, wall)).toBe(75);
    expect(sliderToWidth(2, wall)).toBe(1200);
  });

  it("clamps t", () => {
    expect(sliderToWidth(5, wall)).toBe(1200);
    expect(sliderToWidth(-5, wall)).toBe(75);
    expect(widthToSlider(5000, wall)).toBe(2);
    expect(widthToSlider(1, wall)).toBe(-2);
  });

  it("round-trips", () => {
    for (const t of [-2, -1.37, -0.5, 0, 0.01, 0.8, 1.99, 2]) {
      expect(widthToSlider(sliderToWidth(t, wall), wall)).toBeCloseTo(t);
    }
    for (const w of [75, 100, 300, 451.5, 1200]) {
      expect(sliderToWidth(widthToSlider(w, wall), wall)).toBeCloseTo(w);
    }
  });
});

describe("wheelZoomFactor", () => {
  it("zooms in on wheel up and out on wheel down, symmetrically", () => {
    const up = wheelZoomFactor(-100, 0);
    const down = wheelZoomFactor(100, 0);
    expect(up).toBeGreaterThan(1);
    expect(down).toBeLessThan(1);
    expect(up * down).toBeCloseTo(1);
  });

  it("treats line deltas as about 16px each", () => {
    expect(wheelZoomFactor(3, 1)).toBeCloseTo(wheelZoomFactor(48, 0));
  });
});
