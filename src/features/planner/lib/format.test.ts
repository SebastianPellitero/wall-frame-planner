import { describe, expect, it } from "vitest";
import { formatCm } from "./format";

describe("formatCm", () => {
  it("shows at most one decimal and drops a trailing .0", () => {
    expect(formatCm(300)).toBe("300");
    expect(formatCm(42.5)).toBe("42.5");
    expect(formatCm(42.04)).toBe("42");
    expect(formatCm(42.06)).toBe("42.1");
  });
});
