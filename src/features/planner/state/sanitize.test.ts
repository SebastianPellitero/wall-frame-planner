import { describe, expect, it } from "vitest";
import { DEFAULT_BACKGROUND, DEFAULT_GRID, DEFAULT_PALETTE_SIZES, DEFAULT_WALL } from "../defaults";
import { colorFromId } from "../lib/frameColors";
import { sanitizeProject } from "./sanitize";

const defaults = {
  wall: DEFAULT_WALL,
  grid: DEFAULT_GRID,
  background: DEFAULT_BACKGROUND,
  shapes: [],
  paletteSizes: DEFAULT_PALETTE_SIZES,
  paletteKind: "rect",
  creatorColor: 1,
};

describe("sanitizeProject", () => {
  it.each([null, undefined, 42, "x", []])("returns defaults for %j", (raw) => {
    expect(sanitizeProject(raw)).toEqual(defaults);
  });

  it("fills missing fields from the defaults", () => {
    const out = sanitizeProject({ wall: { width: 400 }, grid: { enabled: true } });
    expect(out.wall).toEqual({ ...DEFAULT_WALL, width: 400 });
    expect(out.grid).toEqual({ ...DEFAULT_GRID, enabled: true });
    expect(out.background).toEqual(DEFAULT_BACKGROUND);
    expect(out.shapes).toEqual([]);
    expect(out.paletteSizes).toEqual(DEFAULT_PALETTE_SIZES);
  });

  it("clamps wall, grid and background values", () => {
    const out = sanitizeProject({
      wall: { width: 2, height: "tall", pushGap: 99 },
      grid: { spacingX: 0, spacingY: -3, originX: 9999, originY: -5 },
      background: { opacity: 7, width: 0, aspect: 0 },
    });
    expect(out.wall).toEqual({ width: 10, height: DEFAULT_WALL.height, pushGap: 50 });
    expect(out.grid).toMatchObject({ spacingX: 0.5, spacingY: 0.5, originX: 10, originY: 0 });
    expect(out.background).toMatchObject({ opacity: 1, width: 1, aspect: DEFAULT_BACKGROUND.aspect });
  });

  it("drops shapes with bad ids, kinds or non-finite numbers", () => {
    const good = { id: "a", kind: "rect", x: 10, y: 10, w: 20, h: 30 };
    const out = sanitizeProject({
      shapes: [
        good,
        null,
        "str",
        { ...good, id: "" },
        { ...good, id: undefined },
        { ...good, id: "b", kind: "triangle" },
        { ...good, id: "c", x: NaN },
        { ...good, id: "d", y: "5" },
        { ...good, id: "e", w: Infinity },
        { ...good, id: "f", h: undefined },
        { ...good, id: "a", x: 50 },
      ],
    });
    expect(out.shapes).toEqual([{ ...good, color: colorFromId("a") }]);
  });

  it("coerces square and circle to w === h", () => {
    const out = sanitizeProject({
      shapes: [
        { id: "s", kind: "square", x: 0, y: 0, w: 30, h: 50 },
        { id: "c", kind: "circle", x: 0, y: 0, w: 20, h: 10 },
      ],
    });
    expect(out.shapes.map((s) => [s.w, s.h])).toEqual([
      [30, 30],
      [20, 20],
    ]);
  });

  it("clamps sizes and positions to the wall and rounds to 0.1", () => {
    const out = sanitizeProject({
      wall: { width: 100, height: 100, pushGap: 3 },
      shapes: [
        { id: "a", kind: "rect", x: 95, y: -20, w: 500, h: 0.01 },
        { id: "b", kind: "rect", x: 10.04, y: 10.06, w: 20, h: 20 },
      ],
    });
    expect(out.shapes[0]).toEqual({ id: "a", kind: "rect", x: 0, y: 0, w: 100, h: 1, color: colorFromId("a") });
    expect(out.shapes[1]).toMatchObject({ x: 10, y: 10.1 });
  });

  it("sanitizes palette sizes per kind", () => {
    const out = sanitizeProject({ paletteSizes: { rect: { w: 60, h: 80 }, square: { w: "x" }, circle: { w: 0, h: 0 } } });
    expect(out.paletteSizes.rect).toEqual({ w: 60, h: 80 });
    expect(out.paletteSizes.square).toEqual(DEFAULT_PALETTE_SIZES.square);
    expect(out.paletteSizes.circle).toEqual({ w: 1, h: 1 });
  });

  it("keeps a valid frame color and gives a missing or invalid one a stable color from the id", () => {
    const base = { kind: "rect", x: 0, y: 0, w: 10, h: 10 };
    const raw = {
      shapes: [
        { ...base, id: "kept", color: 7 },
        { ...base, id: "missing" },
        { ...base, id: "zero", color: 0 },
        { ...base, id: "big", color: 11 },
        { ...base, id: "frac", color: 2.5 },
        { ...base, id: "str", color: "frame-3" },
      ],
    };
    const colors = sanitizeProject(raw).shapes.map((s) => [s.id, s.color]);
    expect(colors).toEqual([
      ["kept", 7],
      ["missing", colorFromId("missing")],
      ["zero", colorFromId("zero")],
      ["big", colorFromId("big")],
      ["frac", colorFromId("frac")],
      ["str", colorFromId("str")],
    ]);
    // Deterministic: the same save always gets the same colors.
    expect(sanitizeProject(raw).shapes.map((s) => s.color)).toEqual(colors.map(([, c]) => c));
  });

  it("keeps a valid creator color and shape, otherwise uses the given fallback color and rect", () => {
    expect(sanitizeProject({ creatorColor: 4, paletteKind: "circle" })).toMatchObject({ creatorColor: 4, paletteKind: "circle" });
    expect(sanitizeProject({ creatorColor: 12, paletteKind: "hexagon" }, 6)).toMatchObject({ creatorColor: 6, paletteKind: "rect" });
    expect(sanitizeProject({}).creatorColor).toBe(1);
  });
});
