import { beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_GRID, DEFAULT_PALETTE_SIZES, DEFAULT_WALL } from "../defaults";
import { overlaps } from "../lib/collision";
import { isFrameColor } from "../lib/frameColors";
import { createPlannerStore } from "./store";

let n = 0;
const fresh = () => createPlannerStore({ name: `test-store-${n++}` });
type Store = ReturnType<typeof createPlannerStore>;

const shapeOf = (store: Store, id: string) => {
  const found = store.getState().shapes.find((s) => s.id === id);
  if (!found) throw new Error(`missing shape ${id}`);
  return found;
};
const undo = (store: Store) => store.temporal.getState().undo();
const redo = (store: Store) => store.temporal.getState().redo();
const history = (store: Store) => store.temporal.getState().pastStates.length;

let store: Store;
beforeEach(() => {
  store = fresh();
});

describe("initial state", () => {
  it("starts from the defaults", () => {
    const s = store.getState();
    expect(s.wall).toEqual(DEFAULT_WALL);
    expect(s.grid).toEqual(DEFAULT_GRID);
    expect(s.shapes).toEqual([]);
    expect(s.paletteSizes).toEqual(DEFAULT_PALETTE_SIZES);
    expect(s.selectedId).toBeNull();
    expect(s.mode).toBe("arrange");
    expect(s.paletteKind).toBe("rect");
    expect(isFrameColor(s.creatorColor)).toBe(true);
  });
});

describe("frame colors", () => {
  it("addShape uses the creator color, then rolls a different one", () => {
    store.setState({ creatorColor: 4 });
    const first = store.getState().addShape("rect", { x: 50, y: 50 });
    expect(shapeOf(store, first).color).toBe(4);
    const next = store.getState().creatorColor;
    expect(next).not.toBe(4);
    const second = store.getState().addShape("rect", { x: 200, y: 150 }, { select: false });
    expect(shapeOf(store, second).color).toBe(next);
    expect(store.getState().creatorColor).not.toBe(next);
  });

  it("consecutive adds always differ in color", () => {
    let prev = 0;
    for (let i = 0; i < 12; i++) {
      const id = store.getState().addShape("square", undefined, { select: false });
      const { color } = shapeOf(store, id);
      expect(color).not.toBe(prev);
      prev = color;
    }
  });

  it("duplicateShape copies the original's color and leaves the creator color alone", () => {
    store.setState({ creatorColor: 2 });
    const a = store.getState().addShape("rect", { x: 100, y: 100 });
    const creator = store.getState().creatorColor;
    const copy = store.getState().duplicateShape(a) as string;
    expect(shapeOf(store, copy).color).toBe(2);
    expect(store.getState().creatorColor).toBe(creator);
  });

  it("keeps the creator color out of undo history", () => {
    store.getState().addShape("rect", undefined, { select: false });
    const past = history(store);
    const before = store.getState().creatorColor;
    store.getState().generate("rect", { w: 20, h: 30 });
    expect(history(store)).toBe(past);
    const rolled = store.getState().creatorColor;
    expect(rolled).not.toBe(before);
    undo(store);
    expect(store.getState().shapes).toEqual([]);
    expect(store.getState().creatorColor).toBe(rolled);
  });
});

describe("generate", () => {
  it("sets the kind's size, makes it the current shape and rolls a new color", () => {
    store.setState({ creatorColor: 5 });
    store.getState().generate("circle", { w: 44, h: 44 });
    const s = store.getState();
    expect(s.paletteSizes.circle).toEqual({ w: 44, h: 44 });
    expect(s.paletteKind).toBe("circle");
    expect(s.creatorColor).not.toBe(5);
    expect(isFrameColor(s.creatorColor)).toBe(true);
  });

  it("clamps the size to the wall (square and circle by the shorter side)", () => {
    store.getState().generate("square", { w: 9999, h: 5 });
    expect(store.getState().paletteSizes.square).toEqual({ w: 250, h: 250 });
    store.getState().generate("rect", { w: 0.2, h: 900 });
    expect(store.getState().paletteSizes.rect).toEqual({ w: 1, h: 250 });
  });

  it("makes the next added frame that size and color", () => {
    store.getState().generate("rect", { w: 40, h: 60 });
    const color = store.getState().creatorColor;
    const id = store.getState().addShape("rect", { x: 100, y: 100 });
    expect(shapeOf(store, id)).toMatchObject({ w: 40, h: 60, color });
  });
});

describe("addShape", () => {
  it("tap-to-add: centers on the wall, selects the shape", () => {
    const id = store.getState().addShape("rect");
    const s = shapeOf(store, id);
    expect(s).toMatchObject({ kind: "rect", w: 40, h: 50, x: 130, y: 100 });
    expect(store.getState().selectedId).toBe(id);
  });

  it("tap-to-add: lands on a free spot near the center when the center is taken", () => {
    const first = store.getState().addShape("rect");
    const second = store.getState().addShape("rect");
    expect(overlaps(shapeOf(store, first), shapeOf(store, second), DEFAULT_WALL.pushGap)).toBe(false);
  });

  it("does not select when select is false", () => {
    store.getState().addShape("circle", undefined, { select: false });
    expect(store.getState().selectedId).toBeNull();
  });

  it("add at a point: centered there", () => {
    const id = store.getState().addShape("square", { x: 100, y: 100 });
    expect(shapeOf(store, id)).toMatchObject({ x: 85, y: 85, w: 30, h: 30 });
  });

  it("add at a point: clamped at the wall edge", () => {
    const id = store.getState().addShape("rect", { x: 1000, y: -50 });
    expect(shapeOf(store, id)).toMatchObject({ x: 260, y: 0 });
  });

  it("add at a point: pushes the neighbor, not the new shape", () => {
    const a = store.getState().addShape("rect", { x: 100, y: 100 });
    const b = store.getState().addShape("rect", { x: 110, y: 100 });
    expect(shapeOf(store, b)).toMatchObject({ x: 90, y: 75 });
    expect(overlaps(shapeOf(store, a), shapeOf(store, b), DEFAULT_WALL.pushGap)).toBe(false);
  });

  it("uses the palette size, clamped to the wall", () => {
    store.getState().generate("rect", { w: 40, h: 50 });
    store.getState().setWall({ width: 20, height: 20 });
    const id = store.getState().addShape("rect");
    expect(shapeOf(store, id)).toMatchObject({ w: 20, h: 20, x: 0, y: 0 });
  });
});

describe("commitShape", () => {
  it("pushes a neighbor and leaves the anchor exactly where it was committed", () => {
    const a = store.getState().addShape("rect", { x: 50, y: 100 });
    const b = store.getState().addShape("rect", { x: 200, y: 100 });
    store.getState().commitShape(a, { x: 190.3, y: 100 });
    const anchor = shapeOf(store, a);
    expect(anchor).toMatchObject({ x: 190.3, y: 100 });
    expect(overlaps(anchor, shapeOf(store, b), DEFAULT_WALL.pushGap)).toBe(false);
  });

  it("clamps to the wall and rounds to 0.1", () => {
    const a = store.getState().addShape("rect", { x: 100, y: 100 });
    store.getState().commitShape(a, { x: 12.345, y: 9999 });
    expect(shapeOf(store, a)).toMatchObject({ x: 12.3, y: 200 });
  });

  it("keeps a square equal-sided and clamped to the wall when resized", () => {
    const id = store.getState().addShape("square", { x: 100, y: 100 });
    store.getState().commitShape(id, { w: 500 });
    expect(shapeOf(store, id)).toMatchObject({ w: 250, h: 250 });
    store.getState().commitShape(id, { h: 40 });
    expect(shapeOf(store, id)).toMatchObject({ w: 40, h: 40 });
  });

  it("is a no-op, with no history entry, when the clamped and rounded result equals the shape", () => {
    const id = store.getState().addShape("rect", { x: 20, y: 25 });
    store.getState().commitShape(id, { x: 0, y: 0 });
    store.temporal.getState().clear();
    const before = store.getState().shapes;
    store.getState().commitShape(id, { x: -5 });
    store.getState().commitShape(id, { x: 0.04, y: -1 });
    expect(store.getState().shapes).toBe(before);
    expect(history(store)).toBe(0);
  });

  it("is a no-op for an unknown id", () => {
    store.getState().addShape("rect");
    const before = store.getState().shapes;
    const past = history(store);
    store.getState().commitShape("nope", { x: 5 });
    expect(store.getState().shapes).toBe(before);
    expect(history(store)).toBe(past);
  });

  it("records no history when nothing changes", () => {
    const id = store.getState().addShape("rect", { x: 100, y: 100 });
    const past = history(store);
    store.getState().commitShape(id, { x: shapeOf(store, id).x });
    expect(history(store)).toBe(past);
  });
});

describe("duplicateShape", () => {
  it("puts the copy to the right without overlap and selects it", () => {
    const a = store.getState().addShape("rect", { x: 100, y: 100 });
    const copyId = store.getState().duplicateShape(a);
    expect(copyId).not.toBeNull();
    const original = shapeOf(store, a);
    const copy = shapeOf(store, copyId as string);
    expect(copy.kind).toBe("rect");
    expect([copy.w, copy.h]).toEqual([original.w, original.h]);
    expect(copy.x).toBeGreaterThan(original.x);
    expect(overlaps(original, copy, DEFAULT_WALL.pushGap)).toBe(false);
    expect(store.getState().selectedId).toBe(copyId);
  });

  it("returns null for an unknown id", () => {
    expect(store.getState().duplicateShape("nope")).toBeNull();
  });
});

describe("deleteShape", () => {
  it("removes the shape and clears the selection when it was selected", () => {
    const id = store.getState().addShape("rect");
    store.getState().deleteShape(id);
    expect(store.getState().shapes).toEqual([]);
    expect(store.getState().selectedId).toBeNull();
  });

  it("keeps the selection of another shape", () => {
    const a = store.getState().addShape("rect", { x: 50, y: 50 });
    const b = store.getState().addShape("rect", { x: 200, y: 150 });
    store.getState().deleteShape(a);
    expect(store.getState().selectedId).toBe(b);
  });
});

describe("settings actions", () => {
  it("setWall enforces minimums and pushGap range, and clamps shapes inside (sizes kept)", () => {
    const id = store.getState().addShape("rect", { x: 280, y: 230 });
    store.getState().setWall({ width: 100, height: 80 });
    expect(shapeOf(store, id)).toMatchObject({ x: 60, y: 30, w: 40, h: 50 });
    store.getState().setWall({ width: 1, height: 1, pushGap: 80 });
    expect(store.getState().wall).toEqual({ width: 10, height: 10, pushGap: 50 });
    store.getState().setWall({ pushGap: -4 });
    expect(store.getState().wall.pushGap).toBe(0);
  });

  it("setGrid enforces the spacing minimum", () => {
    store.getState().setGrid({ spacingX: 0.1, spacingY: 20, enabled: true });
    expect(store.getState().grid).toMatchObject({ spacingX: 0.5, spacingY: 20, enabled: true });
  });

  it("setGridOrigin clamps to the wall and rounds", () => {
    store.getState().setGridOrigin({ x: 12.34, y: -5 });
    expect(store.getState().grid).toMatchObject({ originX: 12.3, originY: 0 });
    store.getState().setGridOrigin({ x: 9999, y: 9999 });
    expect(store.getState().grid).toMatchObject({ originX: 300, originY: 250 });
  });

  it("setBackground clamps opacity and width", () => {
    store.getState().setBackground({ opacity: 3, width: 0 });
    expect(store.getState().background).toMatchObject({ opacity: 1, width: 1 });
    store.getState().setBackground({ opacity: -1 });
    expect(store.getState().background.opacity).toBe(0);
  });

  it("select, setMode and setPaletteKind update the UI slice", () => {
    store.getState().select("x");
    store.getState().setMode("photo");
    store.getState().setPaletteKind("circle");
    expect(store.getState()).toMatchObject({ selectedId: null, mode: "photo", paletteKind: "circle" });
    const id = store.getState().addShape("rect");
    store.getState().select(null);
    store.getState().select(id);
    expect(store.getState().selectedId).toBe(id);
  });
});

describe("undo / redo", () => {
  it("restores shapes and re-applies them", () => {
    const id = store.getState().addShape("rect", { x: 100, y: 100 });
    store.getState().commitShape(id, { x: 200 });
    undo(store);
    expect(shapeOf(store, id).x).toBe(80);
    undo(store);
    expect(store.getState().shapes).toEqual([]);
    redo(store);
    redo(store);
    expect(shapeOf(store, id).x).toBe(200);
  });

  it("clears the selection when undo removes the selected shape", () => {
    store.getState().addShape("rect");
    expect(store.getState().selectedId).not.toBeNull();
    undo(store);
    expect(store.getState().selectedId).toBeNull();
  });

  it("records no history for select, mode, palette, grid, wall-only and background changes", () => {
    store.getState().addShape("rect", undefined, { select: false });
    const past = history(store);
    store.getState().select("x");
    store.getState().setMode("gridOrigin");
    store.getState().setPaletteKind("square");
    store.getState().generate("rect", { w: 20, h: 20 });
    store.getState().setGrid({ enabled: true, spacingX: 5 });
    store.getState().setGridOrigin({ x: 10, y: 10 });
    store.getState().setBackground({ opacity: 0.5 });
    store.getState().setWall({ width: 400 });
    expect(history(store)).toBe(past);
  });

  it("caps history at 50 entries", () => {
    const id = store.getState().addShape("rect", { x: 100, y: 100 });
    for (let i = 0; i < 60; i++) store.getState().commitShape(id, { x: 10 + i });
    expect(history(store)).toBe(50);
  });

  it("resetProject restores defaults and clears history", () => {
    store.getState().addShape("rect");
    store.getState().setWall({ width: 500 });
    store.getState().setGrid({ enabled: true });
    store.getState().setMode("photo");
    store.getState().resetProject();
    const s = store.getState();
    expect(s.shapes).toEqual([]);
    expect(s.wall).toEqual(DEFAULT_WALL);
    expect(s.grid).toEqual(DEFAULT_GRID);
    expect(s.selectedId).toBeNull();
    expect(s.mode).toBe("arrange");
    expect(isFrameColor(s.creatorColor)).toBe(true);
    expect(history(store)).toBe(0);
    expect(store.temporal.getState().futureStates).toHaveLength(0);
  });
});

describe("pushedIds", () => {
  it("starts empty", () => {
    expect(store.getState().pushedIds).toEqual([]);
  });

  it("commitShape lists the pushed neighbors, nearest to the anchor first", () => {
    const rect = (id: string, x: number) => ({ id, kind: "rect" as const, x, y: 75, w: 40, h: 50, color: 1 as const });
    // A row: far is listed first so array order can't pass for distance order.
    store.setState({ shapes: [rect("far", 175), rect("a", 10), rect("near", 130), { ...rect("untouched", 250), y: 190 }] });
    // The anchor at 112..152 overlaps near (130..170), which is pushed right into far (175..215).
    store.getState().commitShape("a", { x: 112 });
    expect(shapeOf(store, "near").x).toBeGreaterThan(130);
    expect(shapeOf(store, "far").x).toBeGreaterThan(175);
    expect(store.getState().pushedIds).toEqual(["near", "far"]);
  });

  it("commitShape with no overlap leaves it empty", () => {
    const a = store.getState().addShape("rect", { x: 30, y: 30 });
    store.getState().addShape("rect", { x: 230, y: 100 });
    store.getState().commitShape(a, { x: 60 });
    expect(store.getState().pushedIds).toEqual([]);
  });

  it("addShape at a point lists the neighbor it pushed", () => {
    const a = store.getState().addShape("rect", { x: 100, y: 100 });
    store.getState().addShape("rect", { x: 110, y: 100 });
    expect(store.getState().pushedIds).toEqual([a]);
  });

  it("duplicateShape sets it (empty when the copy lands on a free spot)", () => {
    const a = store.getState().addShape("rect", { x: 100, y: 100 });
    store.setState({ pushedIds: ["stale"] });
    store.getState().duplicateShape(a);
    expect(store.getState().pushedIds).toEqual([]);
  });

  it("is cleared when shapes change any other way (undo, delete)", () => {
    const a = store.getState().addShape("rect", { x: 100, y: 100 });
    store.getState().addShape("rect", { x: 110, y: 100 });
    expect(store.getState().pushedIds).toEqual([a]);
    undo(store);
    expect(store.getState().pushedIds).toEqual([]);
    redo(store);
    expect(store.getState().pushedIds).toEqual([]);
    store.setState({ pushedIds: [a] });
    store.getState().deleteShape(a);
    expect(store.getState().pushedIds).toEqual([]);
  });

  it("is neither persisted nor recorded in history", () => {
    const name = `test-pushed-${n++}`;
    const persisted = createPlannerStore({ name });
    persisted.getState().addShape("rect", { x: 100, y: 100 });
    persisted.getState().addShape("rect", { x: 110, y: 100 });
    expect(persisted.getState().pushedIds).toHaveLength(1);
    expect(localStorage.getItem(name) ?? "").not.toMatch(/pushedIds/);
    const past = history(persisted);
    persisted.setState({ pushedIds: [] });
    expect(history(persisted)).toBe(past);
  });
});
