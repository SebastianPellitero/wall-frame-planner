import { describe, expect, it } from "vitest";
import { DEFAULT_WALL_COLOR, isHexColor, isLightColor, relativeLuminance, WALL_SWATCHES, wallTone } from "./wallColor";

describe("WALL_SWATCHES", () => {
  it("lists the eight paint chips of design-system.md §5.18, light to dark, starting with the default", () => {
    expect(WALL_SWATCHES.map((s) => s.name)).toEqual([
      "Gallery white",
      "Warm linen",
      "Plaster pink",
      "Pale sage",
      "Mist blue",
      "Stone",
      "Forest green",
      "Charcoal",
    ]);
    expect(WALL_SWATCHES[0].hex).toBe(DEFAULT_WALL_COLOR);
    expect(DEFAULT_WALL_COLOR).toBe("#f4f5f1");
    expect(WALL_SWATCHES.every((s) => isHexColor(s.hex))).toBe(true);
  });
});

describe("isHexColor", () => {
  it("accepts only #rrggbb", () => {
    expect(isHexColor("#a9a79f")).toBe(true);
    expect(isHexColor("#A9A79F")).toBe(true);
    for (const bad of ["a9a79f", "#abc", "#a9a79f00", "#g9a79f", "red", "", 0x123456, null, undefined]) {
      expect(isHexColor(bad)).toBe(false);
    }
  });
});

describe("relativeLuminance", () => {
  it("matches the WCAG values in the swatch table", () => {
    const expected = [0.909, 0.773, 0.643, 0.688, 0.668, 0.386, 0.059, 0.039];
    WALL_SWATCHES.forEach((s, i) => expect(relativeLuminance(s.hex)).toBeCloseTo(expected[i], 3));
    expect(relativeLuminance("#000000")).toBe(0);
    expect(relativeLuminance("#ffffff")).toBeCloseTo(1, 10);
  });
});

describe("isLightColor", () => {
  it("is light at relative luminance 0.2 and above (§5.19)", () => {
    expect(WALL_SWATCHES.map((s) => isLightColor(s.hex))).toEqual([true, true, true, true, true, true, false, false]);
    // #7c7c7c is L ≈ 0.202 and #7b7b7b is L ≈ 0.198: the two sides of the threshold.
    expect(isLightColor("#7c7c7c")).toBe(true);
    expect(isLightColor("#7b7b7b")).toBe(false);
  });

  it("is case-insensitive", () => {
    expect(isLightColor("#F4F5F1")).toBe(true);
    expect(isLightColor("#34383B")).toBe(false);
  });
});

describe("wallTone", () => {
  it("follows the paint when no photo covers the wall", () => {
    expect(wallTone("#f4f5f1", null)).toBe("light");
    expect(wallTone("#34383b", null)).toBe("dark");
  });

  it("forces the light set under a mostly opaque photo (opacity >= 0.5)", () => {
    expect(wallTone("#34383b", 0.5)).toBe("light");
    expect(wallTone("#34383b", 0.49)).toBe("dark");
  });
});
