import { describe, expect, it } from "vitest";
import { bracketArmPx, frameLabel, frameName, labelTier, matPx, mouldingPx } from "./frameLook";

describe("mouldingPx", () => {
  it("is 6% of the short side, clamped to 2..10 px", () => {
    expect(mouldingPx(20)).toBe(2);
    expect(mouldingPx(73)).toBe(4);
    expect(mouldingPx(100)).toBe(6);
    expect(mouldingPx(400)).toBe(10);
  });
});

describe("matPx", () => {
  it("is 10% of the short side, clamped to 3..24 px, and dropped below 48 px", () => {
    expect(matPx(47)).toBe(0);
    expect(matPx(48)).toBe(5);
    expect(matPx(100)).toBe(10);
    expect(matPx(400)).toBe(24);
  });
});

describe("bracketArmPx", () => {
  it("is 20% of the short side, clamped to 8..14 px", () => {
    expect(bracketArmPx(20)).toBe(8);
    expect(bracketArmPx(50)).toBe(10);
    expect(bracketArmPx(300)).toBe(14);
  });
});

describe("frameLabel", () => {
  it("reads w × h for rectangles and squares, Ø d for circles, without a trailing .0", () => {
    expect(frameLabel("rect", 40, 50, "full")).toBe("40 × 50");
    expect(frameLabel("square", 30.5, 30.5, "compact")).toBe("30.5×30.5");
    expect(frameLabel("circle", 40, 40, "full")).toBe("Ø 40");
    expect(frameLabel("circle", 40, 40, "compact")).toBe("Ø40");
  });
});

describe("frameName", () => {
  it("names the kind and the full size in cm", () => {
    expect(frameName("rect", 40, 50)).toBe("Rectangle 40 × 50 cm");
    expect(frameName("square", 30, 30)).toBe("Square 30 × 30 cm");
    expect(frameName("circle", 25.5, 25.5)).toBe("Circle Ø 25.5 cm");
  });
});

describe("labelTier", () => {
  const PHONE = 1.46; // px/cm, phone landscape (design-system.md §3.3)
  const tier = (kind: "rect" | "square" | "circle", w: number, h: number, ppc = PHONE) =>
    labelTier(kind, w, h, w * ppc, h * ppc);

  it("matches the documented phone-landscape examples", () => {
    expect(tier("rect", 50, 70)).toBe("full");
    expect(tier("square", 40, 40)).toBe("compact");
    expect(tier("rect", 30, 40)).toBe("compact");
    expect(tier("rect", 20, 25)).toBe("hidden");
  });

  it("grows a tier as the scale grows", () => {
    expect(tier("square", 40, 40, 1)).toBe("compact");
    expect(tier("square", 40, 40, 2)).toBe("full");
    expect(tier("square", 40, 40, 0.5)).toBe("hidden");
  });

  it("needs enough height too", () => {
    // Available height is h − 2t (t = 2 here): 11 px is under compact's 16, 17 px under full's 18
    expect(labelTier("rect", 100, 10, 150, 15)).toBe("hidden");
    expect(labelTier("rect", 100, 14, 150, 21)).toBe("compact");
  });

  it("uses 80% of the inner diameter for circles", () => {
    expect(labelTier("circle", 40, 40, 70, 70)).toBe("full"); // 0.8 × (70 − 8) = 49.6 ≥ "Ø 40" 34.4
    expect(labelTier("circle", 40, 40, 30, 30)).toBe("compact"); // 0.8 × 26 = 20.8 ≥ "Ø40" 20.5
    expect(labelTier("circle", 40, 40, 28, 28)).toBe("hidden"); // 0.8 × 24 = 19.2
  });
});
