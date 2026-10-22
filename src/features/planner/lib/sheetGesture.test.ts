import { describe, expect, it } from "vitest";
import { sheetDragOffset, sheetRelease, SHEET_EXPAND_PX, SHEET_FLICK_PX_PER_S } from "./sheetGesture";

describe("sheetRelease", () => {
  const base = { heightPx: 400, velocityPxPerS: 0, expanded: false };

  it("closes past 25% of the sheet's height", () => {
    expect(sheetRelease({ ...base, offsetPx: 101 })).toBe("close");
    expect(sheetRelease({ ...base, offsetPx: 99 })).toBe("rest");
  });

  it("closes on a downward flick, even a short one", () => {
    expect(sheetRelease({ ...base, offsetPx: 20, velocityPxPerS: SHEET_FLICK_PX_PER_S + 1 })).toBe("close");
  });

  it("does not close on a flick that ends above where it started", () => {
    expect(sheetRelease({ ...base, offsetPx: -5, velocityPxPerS: SHEET_FLICK_PX_PER_S + 1 })).toBe("rest");
  });

  it("expands when dragged up far enough or flicked up", () => {
    expect(sheetRelease({ ...base, offsetPx: -SHEET_EXPAND_PX - 1 })).toBe("expand");
    expect(sheetRelease({ ...base, offsetPx: -10, velocityPxPerS: -SHEET_FLICK_PX_PER_S - 1 })).toBe("expand");
    expect(sheetRelease({ ...base, offsetPx: -10 })).toBe("rest");
  });

  it("an expanded sheet stays expanded when dragged up", () => {
    expect(sheetRelease({ ...base, expanded: true, offsetPx: -200 })).toBe("rest");
  });

  it("falls back to resting when nothing is measured yet", () => {
    expect(sheetRelease({ ...base, heightPx: 0, offsetPx: 30 })).toBe("rest");
  });
});

describe("sheetDragOffset", () => {
  it("follows the finger down 1:1", () => {
    expect(sheetDragOffset(80)).toBe(80);
  });

  it("rubber-bands upward travel, which never passes the cap", () => {
    const up = sheetDragOffset(-40);
    expect(up).toBeLessThan(0);
    expect(up).toBeGreaterThan(-40);
    expect(sheetDragOffset(-10_000)).toBeGreaterThan(-30);
  });
});
