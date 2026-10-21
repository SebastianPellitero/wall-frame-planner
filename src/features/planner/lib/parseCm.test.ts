import { describe, expect, it } from "vitest";
import { parseCm } from "./parseCm";

describe("parseCm", () => {
  it("accepts a dot or a comma as the decimal separator", () => {
    expect(parseCm("42.5", 1, 300)).toEqual({ ok: true, value: 42.5 });
    expect(parseCm("42,5", 1, 300)).toEqual({ ok: true, value: 42.5 });
    expect(parseCm(".5", 0, 300)).toEqual({ ok: true, value: 0.5 });
  });

  it("trims surrounding whitespace", () => {
    expect(parseCm("  60 ", 1, 300)).toEqual({ ok: true, value: 60 });
  });

  it("rounds to one decimal", () => {
    expect(parseCm("42.04", 1, 300)).toEqual({ ok: true, value: 42 });
    expect(parseCm("42,06", 1, 300)).toEqual({ ok: true, value: 42.1 });
  });

  it("accepts the bounds and rejects values outside them", () => {
    expect(parseCm("1", 1, 300)).toEqual({ ok: true, value: 1 });
    expect(parseCm("300", 1, 300)).toEqual({ ok: true, value: 300 });
    expect(parseCm("0.9", 1, 300)).toEqual({ ok: false });
    expect(parseCm("300.1", 1, 300)).toEqual({ ok: false });
    expect(parseCm("-5", 1, 300)).toEqual({ ok: false });
  });

  it("checks the bounds after rounding", () => {
    expect(parseCm("300.04", 1, 300)).toEqual({ ok: true, value: 300 });
    expect(parseCm("0.96", 1, 300)).toEqual({ ok: true, value: 1 });
  });

  it("rejects garbage", () => {
    for (const text of ["", "   ", "abc", "4o", "1.2.3", "1,2,3", "1e2", "0x10", "12 cm", "Infinity", "NaN", "--1", "."]) {
      expect(parseCm(text, 0, 1000), text).toEqual({ ok: false });
    }
  });
});
