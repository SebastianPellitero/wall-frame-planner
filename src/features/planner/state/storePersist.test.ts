import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_GRID, DEFAULT_PALETTE_SIZES, DEFAULT_WALL } from "../defaults";
import { storageEvents, type StorageEvent } from "./storageEvents";
import { createPlannerStore } from "./store";

let n = 0;
const nextName = () => `test-persist-${n++}`;
const saved = (name: string) => JSON.parse(localStorage.getItem(name) ?? "null");

let events: StorageEvent[];
let unsubscribe: () => void;
beforeEach(() => {
  events = [];
  unsubscribe = storageEvents.subscribe((e) => events.push(e));
});
afterEach(() => {
  unsubscribe();
  vi.restoreAllMocks();
});

describe("persistence", () => {
  it("saves only the project slice: no selection, mode, palette kind or history", () => {
    const name = nextName();
    const store = createPlannerStore({ name });
    store.getState().addShape("rect");
    store.getState().setMode("photo");
    store.getState().setPaletteKind("circle");
    store.getState().setGrid({ enabled: true });

    const blob = saved(name);
    expect(blob.version).toBe(1);
    expect(Object.keys(blob.state).sort()).toEqual(["background", "grid", "paletteSizes", "shapes", "wall"]);
    expect(blob.state.shapes).toHaveLength(1);
    expect(blob.state.grid.enabled).toBe(true);
    const raw = localStorage.getItem(name) ?? "";
    expect(raw).not.toMatch(/selectedId|paletteKind|pastStates|futureStates|"mode"/);
  });

  it("uses the app key by default", () => {
    // The singleton uses "wallplanner:project"; the factory default must match.
    const store = createPlannerStore();
    store.getState().addShape("square");
    expect(saved("wallplanner:project").state.shapes).toHaveLength(1);
  });

  it("rehydrates from a valid save, with an empty undo history and no selection", () => {
    const name = nextName();
    const shape = { id: "s1", kind: "circle", x: 10, y: 20, w: 30, h: 30 };
    localStorage.setItem(
      name,
      JSON.stringify({
        version: 1,
        state: {
          wall: { width: 400, height: 300, pushGap: 5 },
          grid: { ...DEFAULT_GRID, enabled: true },
          background: { hasImage: true, x: 1, y: 2, width: 300, aspect: 0.5, opacity: 0.4, visible: false },
          shapes: [shape],
          paletteSizes: DEFAULT_PALETTE_SIZES,
        },
      }),
    );
    const store = createPlannerStore({ name });
    const s = store.getState();
    expect(s.wall).toEqual({ width: 400, height: 300, pushGap: 5 });
    expect(s.grid.enabled).toBe(true);
    expect(s.background).toMatchObject({ hasImage: true, opacity: 0.4, visible: false });
    expect(s.shapes).toEqual([shape]);
    expect(s.selectedId).toBeNull();
    expect(s.mode).toBe("arrange");
    expect(store.temporal.getState().pastStates).toHaveLength(0);
    expect(typeof s.addShape).toBe("function");
  });

  it("sanitizes a half-broken save instead of crashing", () => {
    const name = nextName();
    localStorage.setItem(
      name,
      JSON.stringify({
        version: 1,
        state: { wall: { width: "x" }, shapes: [{ id: "ok", kind: "rect", x: 0, y: 0, w: 10, h: 10 }, { id: "bad" }] },
      }),
    );
    const s = createPlannerStore({ name }).getState();
    expect(s.wall).toEqual(DEFAULT_WALL);
    expect(s.shapes.map((x) => x.id)).toEqual(["ok"]);
  });

  it("falls back to defaults, backs up the raw text and emits corrupt for corrupt JSON", () => {
    const name = nextName();
    localStorage.setItem(name, "{oops");
    const store = createPlannerStore({ name });
    expect(store.getState().shapes).toEqual([]);
    expect(store.getState().wall).toEqual(DEFAULT_WALL);
    const corrupt = events.find((e) => e.type === "corrupt");
    expect(corrupt).toBeDefined();
    const key = (corrupt as Extract<StorageEvent, { type: "corrupt" }>).backupKey;
    expect(key).toMatch(/^wallplanner:corrupt-/);
    expect(localStorage.getItem(key)).toBe("{oops");
  });

  it("keeps working in memory and emits write-failed when localStorage is full", () => {
    const name = nextName();
    const store = createPlannerStore({ name });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("full", "QuotaExceededError");
    });
    expect(() => store.getState().addShape("rect")).not.toThrow();
    expect(store.getState().shapes).toHaveLength(1);
    expect(events.some((e) => e.type === "write-failed")).toBe(true);
  });
});
