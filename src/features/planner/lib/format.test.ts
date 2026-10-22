import { describe, expect, it } from "vitest";
import { formatCm, gridOriginReadout } from "./format";

describe("formatCm", () => {
  it("shows at most one decimal and drops a trailing .0", () => {
    expect(formatCm(300)).toBe("300");
    expect(formatCm(42.5)).toBe("42.5");
    expect(formatCm(42.04)).toBe("42");
    expect(formatCm(42.06)).toBe("42.1");
  });
});

describe("gridOriginReadout", () => {
  it("reads the origin as x × y cm (§4.6)", () => {
    expect(gridOriginReadout(20, 40)).toBe("Grid starts at 20 × 40 cm");
    expect(gridOriginReadout(0, 12.26)).toBe("Grid starts at 0 × 12.3 cm");
  });
});
