import { create } from "zustand";
import { sameGuides } from "../lib/dragMath";
import type { SnapGuide } from "../lib/snap";
import type { Point } from "../types";

/** Transient drag UI. Not persisted, not in history; written only when a value really changes. */
export interface DragUiState {
  /** The frame being dragged, or `PALETTE_DRAG_ID` for a palette ghost; null when no drag is live. */
  draggingId: string | null;
  guides: SnapGuide[];
  /**
   * A duplicate about to mount: it starts at `from` (the original's top-left, cm) and springs
   * to its own spot instead of popping in (§6.3).
   */
  spawnFrom: { id: string; from: Point } | null;
  startDrag(id: string): void;
  setGuides(guides: SnapGuide[]): void;
  endDrag(): void;
  setSpawnFrom(id: string, from: Point): void;
  /** The spawn point if it is for `id`, cleared once taken; otherwise null. */
  takeSpawnFrom(id: string): Point | null;
}

const NO_GUIDES: SnapGuide[] = [];

/** `draggingId` while a palette ghost (a frame not on the wall yet) is being dragged. */
export const PALETTE_DRAG_ID = "palette-ghost";

export const useDragUi = create<DragUiState>()((set, get) => ({
  draggingId: null,
  guides: NO_GUIDES,
  spawnFrom: null,
  startDrag: (id) => {
    if (get().draggingId !== id) set({ draggingId: id });
  },
  setGuides: (guides) => {
    if (!sameGuides(get().guides, guides)) set({ guides: guides.length ? guides : NO_GUIDES });
  },
  endDrag: () => {
    const { draggingId, guides } = get();
    if (draggingId !== null || guides.length > 0) set({ draggingId: null, guides: NO_GUIDES });
  },
  setSpawnFrom: (id, from) => set({ spawnFrom: { id, from: { ...from } } }),
  takeSpawnFrom: (id) => {
    const spawn = get().spawnFrom;
    if (spawn?.id !== id) return null;
    set({ spawnFrom: null });
    return spawn.from;
  },
}));
