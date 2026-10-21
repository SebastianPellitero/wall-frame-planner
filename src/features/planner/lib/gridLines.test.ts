import { describe, expect, it } from "vitest";
import { DEFAULT_GRID } from "../defaults";
import { gridLinePositions, gridLines } from "./gridLines";

describe("gridLinePositions", () => {
  it("starts at the origin and steps by the spacing", () => {
    expect(gridLinePositions(50, 10, 0)).toEqual([0, 10, 20, 30, 40, 50]);
  });

  it("extends left of (or above) an offset origin", () => {
    expect(gridLinePositions(50, 20, 15)).toEqual([15, 35]);
    expect(gridLinePositions(50, 20, 25)).toEqual([5, 25, 45]);
  });

  it("covers the wall when the origin is past the far edge or before the start", () => {
    expect(gridLinePositions(30, 10, 45)).toEqual([5, 15, 25]);
    expect(gridLinePositions(30, 10, -12)).toEqual([8, 18, 28]);
  });

  it("includes both wall edges when lines land on them", () => {
    expect(gridLinePositions(30, 15, 0)).toEqual([0, 15, 30]);
  });

  it("has no floating-point drift on fractional spacing", () => {
    expect(gridLinePositions(1, 0.1, 0)).toEqual([0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1]);
    expect(gridLinePositions(10, 2.5, 1.2)).toEqual([1.2, 3.7, 6.2, 8.7]);
  });

  it("returns only the lines inside the wall when spacing exceeds it", () => {
    expect(gridLinePositions(30, 100, 10)).toEqual([10]);
    expect(gridLinePositions(30, 100, 40)).toEqual([]);
  });

  it("returns nothing for unusable spacing or length", () => {
    expect(gridLinePositions(30, 0, 0)).toEqual([]);
    expect(gridLinePositions(30, -5, 0)).toEqual([]);
    expect(gridLinePositions(30, Number.NaN, 0)).toEqual([]);
    expect(gridLinePositions(0, 10, 0)).toEqual([]);
    expect(gridLinePositions(30, 10, Number.NaN)).toEqual([]);
  });
});

describe("gridLines", () => {
  it("returns vertical (xs) and horizontal (ys) lines for a wall and grid", () => {
    const lines = gridLines({ width: 40, height: 25 }, { ...DEFAULT_GRID, spacingX: 20, spacingY: 10, originX: 10, originY: 5 });
    expect(lines.xs).toEqual([10, 30]);
    expect(lines.ys).toEqual([5, 15, 25]);
  });
});
