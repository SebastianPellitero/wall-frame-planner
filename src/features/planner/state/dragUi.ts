import { create } from "zustand";
import { sameGuides } from "../lib/dragMath";
import type { SnapGuide } from "../lib/snap";

/** Transient drag UI. Not persisted, not in history; written only when a value really changes. */
export interface DragUiState {
  draggingId: string | null;
  guides: SnapGuide[];
  startDrag(id: string): void;
  setGuides(guides: SnapGuide[]): void;
  endDrag(): void;
}

const NO_GUIDES: SnapGuide[] = [];

export const useDragUi = create<DragUiState>()((set, get) => ({
  draggingId: null,
  guides: NO_GUIDES,
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
}));
