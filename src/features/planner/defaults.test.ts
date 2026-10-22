import { describe, expect, it } from "vitest";
import {
  DEFAULT_BACKGROUND,
  DEFAULT_GRID,
  DEFAULT_PALETTE_SIZES,
  DEFAULT_WALL,
  MIN_SIZE_CM,
} from "./defaults";

describe("defaults", () => {
  it("DEFAULT_WALL is 300 x 250 cm with a 3 cm push gap, painted the default wall color", () => {
    expect(DEFAULT_WALL).toEqual({ width: 300, height: 250, pushGap: 3, color: "#f4f5f1" });
  });

  it("DEFAULT_GRID is off, snapping, 10 cm spacing, origin at the wall corner", () => {
    expect(DEFAULT_GRID).toEqual({
      enabled: false,
      snap: true,
      spacingX: 10,
      spacingY: 10,
      originX: 0,
      originY: 0,
    });
  });

  it("DEFAULT_BACKGROUND has no image and spans the default wall width", () => {
    expect(DEFAULT_BACKGROUND).toEqual({
      hasImage: false,
      x: 0,
      y: 0,
      width: 300,
      aspect: 1,
      opacity: 1,
      visible: true,
    });
    expect(DEFAULT_BACKGROUND.width).toBe(DEFAULT_WALL.width);
  });

  it("DEFAULT_PALETTE_SIZES has a size for every kind, square and circle with w === h", () => {
    expect(DEFAULT_PALETTE_SIZES).toEqual({
      rect: { w: 40, h: 50 },
      square: { w: 30, h: 30 },
      circle: { w: 30, h: 30 },
    });
    expect(DEFAULT_PALETTE_SIZES.square.w).toBe(DEFAULT_PALETTE_SIZES.square.h);
    expect(DEFAULT_PALETTE_SIZES.circle.w).toBe(DEFAULT_PALETTE_SIZES.circle.h);
  });

  it("every default palette size fits the default wall and the minimum", () => {
    for (const { w, h } of Object.values(DEFAULT_PALETTE_SIZES)) {
      expect(w).toBeGreaterThanOrEqual(MIN_SIZE_CM);
      expect(h).toBeGreaterThanOrEqual(MIN_SIZE_CM);
      expect(w).toBeLessThanOrEqual(DEFAULT_WALL.width);
      expect(h).toBeLessThanOrEqual(DEFAULT_WALL.height);
    }
  });

  it("MIN_SIZE_CM is 1", () => {
    expect(MIN_SIZE_CM).toBe(1);
  });
});
