import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { STAGE_PADDING_PX, computePxPerCm } from "./wallScale";

describe("computePxPerCm", () => {
  it("fits the wall inside the stage minus the padding on both sides", () => {
    // 451 x 375 stage (phone landscape), 12px padding: min(427/300, 351/250)
    expect(computePxPerCm({ width: 451, height: 375 }, { width: 300, height: 250 }, 12)).toBeCloseTo(1.404, 3);
  });

  it("is width-limited on a portrait stage", () => {
    expect(computePxPerCm({ width: 390, height: 600 }, { width: 300, height: 250 }, 12)).toBeCloseTo(366 / 300, 10);
  });

  it("is 0 before the first measure or when the stage is smaller than its padding", () => {
    expect(computePxPerCm({ width: 0, height: 0 }, { width: 300, height: 250 }, 12)).toBe(0);
    expect(computePxPerCm({ width: 20, height: 400 }, { width: 300, height: 250 }, 12)).toBe(0);
  });

  it("is 0 for a degenerate wall", () => {
    expect(computePxPerCm({ width: 400, height: 400 }, { width: 0, height: 250 }, 12)).toBe(0);
    expect(computePxPerCm({ width: 400, height: 400 }, { width: 300, height: Number.NaN }, 12)).toBe(0);
  });
});

describe("STAGE_PADDING_PX", () => {
  it("matches the --spacing-stage tokens in globals.css", () => {
    const css = readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf8");
    const rem = (name: string) => Number(css.match(new RegExp(`--spacing-${name}:\\s*([\\d.]+)rem`))?.[1]) * 16;
    expect(STAGE_PADDING_PX.phone).toBe(rem("stage"));
    expect(STAGE_PADDING_PX.desktop).toBe(rem("stage-lg"));
  });
});
