import { DEFAULT_BACKGROUND, DEFAULT_GRID, DEFAULT_PALETTE_SIZES, DEFAULT_WALL } from "../defaults";
import { resolveOverlaps } from "../lib/collision";
import { pickFrameColor } from "../lib/frameColors";
import { findFreeSpot } from "../lib/freeSpot";
import { clamp, clampSize, clampToWall, fitShapesToWall, round1 } from "../lib/geometry";
import { newId } from "../lib/id";
import { pushOrder } from "../lib/pushOrder";
import { isHexColor } from "../lib/wallColor";
import type { FrameColor, PersistedSlice, Point, Shape, ShapeKind, Wall } from "../types";
import { createFramePhotoActions } from "./framePhotoActions";
import type { PlannerActions, PlannerState, PlannerUiSlice } from "./storeTypes";

type Set = (partial: Partial<PlannerState> | ((s: PlannerState) => Partial<PlannerState>)) => void;
type Get = () => PlannerState;

/** The undo history, as the actions see it. */
export interface History {
  clear(): void;
  /** Runs `fn` without recording its changes as a history step. */
  untracked(fn: () => void): void;
}

/**
 * Defaults. The creator color is rolled here, which only runs in the browser: the editor is
 * client-only (PlannerAppLoader), and a saved color replaces it on hydration (§5.1).
 */
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
    paletteKind: "rect",
    creatorColor: pickFrameColor(),
  };
}

export const initialUi: PlannerUiSlice = { selectedId: null, mode: "arrange", pushedIds: [] };

/** `shapes` with overlaps pushed away from `anchorId`, plus the stagger order of what moved. */
function resolveWithOrder(shapes: Shape[], anchorId: string, wall: Wall): Pick<PlannerState, "shapes" | "pushedIds"> {
  const resolved = resolveOverlaps(shapes, anchorId, wall);
  return { shapes: resolved, pushedIds: pushOrder(shapes, resolved, anchorId) };
}

/** A shape of `kind` and `size` whose center is at `center`, kept inside the wall. */
function centeredShape(
  base: Pick<Shape, "id" | "kind" | "color" | "mat">,
  size: { w: number; h: number },
  center: Point,
  wall: Wall,
): Shape {
  const pos = clampToWall({ x: center.x - size.w / 2, y: center.y - size.h / 2, ...size }, wall);
  return { ...base, ...size, x: round1(pos.x), y: round1(pos.y) };
}

/** Places `shape` at the free spot nearest its center, or where it is (clamped) when the wall is full. */
function placeNear(shape: Shape, near: Point, shapes: Shape[], wall: Wall): Shape {
  const spot = findFreeSpot(shape, shapes, wall, near);
  if (!spot) return centeredShape(shape, shape, near, wall);
  return { ...shape, x: round1(spot.x), y: round1(spot.y) };
}

export function createActions(set: Set, get: Get, history: History): PlannerActions {
  const insert = (shape: Shape, select: boolean, creatorColor?: FrameColor): string => {
    const { shapes, wall, selectedId } = get();
    set({
      ...resolveWithOrder([...shapes, shape], shape.id, wall),
      selectedId: select ? shape.id : selectedId,
      ...(creatorColor === undefined ? {} : { creatorColor }),
    });
    return shape.id;
  };

  return {
    ...createFramePhotoActions(set, get, history),

    addShape(kind, at, opts) {
      const { wall, paletteSizes, shapes, creatorColor: color } = get();
      const size = clampSize(kind, paletteSizes[kind].w, paletteSizes[kind].h, wall);
      const base = { id: newId(), kind, color, mat: true };
      const shape = at
        ? centeredShape(base, size, at, wall)
        : placeNear({ ...base, x: 0, y: 0, ...size }, { x: wall.width / 2, y: wall.height / 2 }, shapes, wall);
      // The next frame always gets a different finish.
      return insert(shape, opts?.select !== false, pickFrameColor(color));
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
      set(resolveWithOrder(updated, id, wall));
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
    // Grid origin mode shows the grid, so the user can see what they are placing (§4.6).
    setMode: (mode) => set((s) => (mode === "gridOrigin" && !s.grid.enabled ? { mode, grid: { ...s.grid, enabled: true } } : { mode })),
    setPaletteKind: (paletteKind) => set({ paletteKind }),

    generate(kind, size) {
      const { wall, creatorColor } = get();
      const clamped = clampSize(kind, size.w, size.h, wall);
      set((s) => ({
        paletteSizes: { ...s.paletteSizes, [kind]: clamped },
        paletteKind: kind,
        creatorColor: pickFrameColor(creatorColor),
      }));
    },

    setWall(patch) {
      const { wall: old, shapes, paletteSizes } = get();
      const wall: Wall = {
        width: Math.max(10, patch.width ?? old.width),
        height: Math.max(10, patch.height ?? old.height),
        pushGap: clamp(patch.pushGap ?? old.pushGap, 0, 50),
        color: isHexColor(patch.color) ? patch.color.toLowerCase() : old.color,
      };
      // Frames and creator sizes shrink and move to fit, as sanitize does on reload. The wall is
      // not in history, so neither is this: undo re-fits what it restores instead (fitToWall).
      const fitted = fitShapesToWall(shapes, wall);
      const palette = (kind: ShapeKind) => clampSize(kind, paletteSizes[kind].w, paletteSizes[kind].h, wall);
      history.untracked(() =>
        set({
          wall,
          paletteSizes: { rect: palette("rect"), square: palette("square"), circle: palette("circle") },
          ...(fitted === shapes ? {} : { shapes: fitted }),
        }),
      );
    },

    fitToWall() {
      const { shapes, wall } = get();
      const fitted = fitShapesToWall(shapes, wall);
      if (fitted !== shapes) history.untracked(() => set({ shapes: fitted }));
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
      history.clear();
    },
  };
}
