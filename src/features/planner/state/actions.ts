import { DEFAULT_BACKGROUND, DEFAULT_GRID, DEFAULT_PALETTE_SIZES, DEFAULT_WALL } from "../defaults";
import { resolveOverlaps } from "../lib/collision";
import { findFreeSpot } from "../lib/freeSpot";
import { clamp, clampSize, clampToWall, round1 } from "../lib/geometry";
import { newId } from "../lib/id";
import type { PersistedSlice, Point, Shape, ShapeKind, Wall } from "../types";
import type { PlannerActions, PlannerState, PlannerUiSlice } from "./storeTypes";

type Set = (partial: Partial<PlannerState> | ((s: PlannerState) => Partial<PlannerState>)) => void;
type Get = () => PlannerState;

export function initialProject(): PersistedSlice {
  return {
    wall: { ...DEFAULT_WALL },
    grid: { ...DEFAULT_GRID },
    background: { ...DEFAULT_BACKGROUND },
    shapes: [],
    paletteSizes: {
      rect: { ...DEFAULT_PALETTE_SIZES.rect },
      square: { ...DEFAULT_PALETTE_SIZES.square },
      circle: { ...DEFAULT_PALETTE_SIZES.circle },
    },
  };
}

export const initialUi: PlannerUiSlice = { selectedId: null, mode: "arrange", paletteKind: "rect" };

/** A shape of `kind` and `size` whose center is at `center`, kept inside the wall. */
function centeredShape(id: string, kind: ShapeKind, size: { w: number; h: number }, center: Point, wall: Wall): Shape {
  const pos = clampToWall({ x: center.x - size.w / 2, y: center.y - size.h / 2, ...size }, wall);
  return { id, kind, ...size, x: round1(pos.x), y: round1(pos.y) };
}

/** Places `shape` at the free spot nearest its center, or where it is (clamped) when the wall is full. */
function placeNear(shape: Shape, near: Point, shapes: Shape[], wall: Wall): Shape {
  const spot = findFreeSpot(shape, shapes, wall, near);
  if (!spot) return centeredShape(shape.id, shape.kind, shape, near, wall);
  return { ...shape, x: round1(spot.x), y: round1(spot.y) };
}

export function createActions(set: Set, get: Get, clearHistory: () => void): PlannerActions {
  const insert = (shape: Shape, select: boolean): string => {
    const { shapes, wall, selectedId } = get();
    set({ shapes: resolveOverlaps([...shapes, shape], shape.id, wall), selectedId: select ? shape.id : selectedId });
    return shape.id;
  };

  return {
    addShape(kind, at, opts) {
      const { wall, paletteSizes, shapes } = get();
      const size = clampSize(kind, paletteSizes[kind].w, paletteSizes[kind].h, wall);
      const id = newId();
      const shape = at
        ? centeredShape(id, kind, size, at, wall)
        : placeNear({ id, kind, x: 0, y: 0, ...size }, { x: wall.width / 2, y: wall.height / 2 }, shapes, wall);
      return insert(shape, opts?.select !== false);
    },

    commitShape(id, patch) {
      const { shapes, wall } = get();
      const current = shapes.find((s) => s.id === id);
      if (!current) return;
      const merged = { ...current, ...patch };
      // A square or circle only has one side: take it from whichever of w/h the patch changed.
      const side = current.kind !== "rect" && patch.w === undefined && patch.h !== undefined ? merged.h : merged.w;
      const size = clampSize(current.kind, side, merged.h, wall);
      const pos = clampToWall({ x: merged.x, y: merged.y, ...size }, wall);
      const next: Shape = { ...current, ...size, x: round1(pos.x), y: round1(pos.y) };
      const moved = next.x !== current.x || next.y !== current.y || next.w !== current.w || next.h !== current.h;
      if (!moved) return;
      const updated = shapes.map((s) => (s.id === id ? next : s));
      set({ shapes: resolveOverlaps(updated, id, wall) });
    },

    duplicateShape(id) {
      const { shapes, wall } = get();
      const original = shapes.find((s) => s.id === id);
      if (!original) return null;
      const near = { x: original.x + original.w / 2 + original.w + wall.pushGap, y: original.y + original.h / 2 };
      const copy = placeNear({ ...original, id: newId() }, near, shapes, wall);
      return insert(copy, true);
    },

    deleteShape(id) {
      set((s) => ({
        shapes: s.shapes.filter((shape) => shape.id !== id),
        selectedId: s.selectedId === id ? null : s.selectedId,
      }));
    },

    select: (id) => set({ selectedId: id }),
    setMode: (mode) => set({ mode }),
    setPaletteKind: (paletteKind) => set({ paletteKind }),

    setPaletteSize(kind, size) {
      const clamped = clampSize(kind, size.w, size.h, get().wall);
      set((s) => ({ paletteSizes: { ...s.paletteSizes, [kind]: clamped } }));
    },

    setWall(patch) {
      const { wall: old, shapes } = get();
      const wall: Wall = {
        width: Math.max(10, patch.width ?? old.width),
        height: Math.max(10, patch.height ?? old.height),
        pushGap: clamp(patch.pushGap ?? old.pushGap, 0, 50),
      };
      let changed = false;
      const clamped = shapes.map((s) => {
        const pos = clampToWall(s, wall);
        if (pos.x === s.x && pos.y === s.y) return s;
        changed = true;
        return { ...s, x: round1(pos.x), y: round1(pos.y) };
      });
      set({ wall, ...(changed ? { shapes: clamped } : {}) });
    },

    setGrid(patch) {
      set((s) => ({
        grid: {
          ...s.grid,
          ...patch,
          spacingX: Math.max(0.5, patch.spacingX ?? s.grid.spacingX),
          spacingY: Math.max(0.5, patch.spacingY ?? s.grid.spacingY),
        },
      }));
    },

    setGridOrigin(point) {
      const { wall } = get();
      set((s) => ({
        grid: {
          ...s.grid,
          originX: round1(clamp(point.x, 0, wall.width)),
          originY: round1(clamp(point.y, 0, wall.height)),
        },
      }));
    },

    setBackground(patch) {
      set((s) => ({
        background: {
          ...s.background,
          ...patch,
          opacity: clamp(patch.opacity ?? s.background.opacity, 0, 1),
          width: Math.max(1, patch.width ?? s.background.width),
        },
      }));
    },

    resetProject() {
      set({ ...initialProject(), selectedId: null, mode: "arrange" });
      clearHistory();
    },
  };
}
