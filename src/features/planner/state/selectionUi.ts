import { create } from "zustand";
import { announce } from "./announcer";
import { usePlannerStore } from "./store";

export type DetailsTab = "size" | "photo";

/**
 * Transient selected-frame UI (design-system.md §4.7, §5.17). Not persisted, not in history.
 * - `adjustingId`: the frame in adjust mode (its photo pans and zooms, the frame stays put).
 * - `previewZoom`: the Zoom slider's live value before it is released; the adjusted frame shows
 *   it, and the store gets one commit on release.
 * - `detailsTab`: the stacked dock's Size | Photo tab, kept across selections for the session.
 */
export interface SelectionUiState {
  adjustingId: string | null;
  previewZoom: number | null;
  detailsTab: DetailsTab;
  setPreviewZoom(zoom: number | null): void;
  setDetailsTab(tab: DetailsTab): void;
}

export const useSelectionUi = create<SelectionUiState>()((set, get) => ({
  adjustingId: null,
  previewZoom: null,
  detailsTab: "size",
  setPreviewZoom: (zoom) => {
    if (get().previewZoom !== zoom) set({ previewZoom: zoom });
  },
  setDetailsTab: (tab) => set({ detailsTab: tab }),
}));

export const ADJUST_ANNOUNCEMENT = "Adjusting photo. Drag or use the arrow keys to move it, Escape to finish.";

/** Enters adjust mode for `id` if it is the selected frame, holds a photo, and the mode is Arrange. */
export function enterAdjust(id: string): boolean {
  const { mode, selectedId, shapes } = usePlannerStore.getState();
  if (mode !== "arrange" || selectedId !== id || !shapes.find((s) => s.id === id)?.photo) return false;
  useSelectionUi.setState({ adjustingId: id, previewZoom: null });
  announce(ADJUST_ANNOUNCEMENT);
  return true;
}

export function exitAdjust(): void {
  const { adjustingId, previewZoom } = useSelectionUi.getState();
  if (adjustingId !== null || previewZoom !== null) useSelectionUi.setState({ adjustingId: null, previewZoom: null });
}

/** Adjust mode ends by itself when its frame stops being the selected photo frame in Arrange (§5.17). */
usePlannerStore.subscribe((s) => {
  const id = useSelectionUi.getState().adjustingId;
  if (id === null) return;
  if (s.mode !== "arrange" || s.selectedId !== id || !s.shapes.find((shape) => shape.id === id)?.photo) exitAdjust();
});
