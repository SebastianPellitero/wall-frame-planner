import { announce } from "./announcer";
import { useDragUi } from "./dragUi";
import type { FramePhoto } from "../types";
import { usePlannerStore } from "./store";

/**
 * Frame commands shared by the selection bar, the history buttons and the keyboard shortcuts,
 * so each action has one implementation. Duplicates and deletes are announced (§7). Each one is a
 * no-op while a drag (a frame or a palette ghost) is live: the drop is the only write then.
 */

const dragLive = () => useDragUi.getState().draggingId !== null;

/** Duplicates `id` (selected, same color) and has the copy spring out from the original (§6.3). */
export function duplicateFrame(id: string): string | null {
  if (dragLive()) return null;
  const original = usePlannerStore.getState().shapes.find((s) => s.id === id);
  if (!original) return null;
  const copyId = usePlannerStore.getState().duplicateShape(id);
  // Set before React renders the copy (it renders after this handler returns).
  if (copyId) {
    useDragUi.getState().setSpawnFrom(copyId, { x: original.x, y: original.y });
    announce("Frame duplicated");
  }
  return copyId;
}

/** Deletes `id`. Callers that hold focus on the frame call `rescueFocus` first. */
export function deleteFrame(id: string): void {
  if (dragLive() || !usePlannerStore.getState().shapes.some((s) => s.id === id)) return;
  usePlannerStore.getState().deleteShape(id);
  announce("Frame deleted");
}

/**
 * Moves `id` by (dx, dy) cm through the single commit path (clamped, pushes neighbors).
 * `repeat` (a held key's auto-repeat) moves the frame and saves it but records no history
 * step, so a whole hold is the first press's single step: undo returns to where it started.
 */
export function nudgeFrame(id: string, dx: number, dy: number, { repeat = false }: { repeat?: boolean } = {}): void {
  if (dragLive()) return;
  const shape = usePlannerStore.getState().shapes.find((s) => s.id === id);
  if (!shape) return;
  stepOrRepeat(() => usePlannerStore.getState().commitShape(id, { x: shape.x + dx, y: shape.y + dy }), repeat);
}

/** A key press is one history step; its auto-repeats change and save without adding steps. */
function stepOrRepeat(commit: () => void, repeat: boolean): void {
  if (!repeat) return commit();
  const temporal = usePlannerStore.temporal.getState();
  temporal.pause();
  try {
    commit();
  } finally {
    temporal.resume();
  }
}

/** Adjust mode's arrow and +/- keys (§5.17): one step per press, a hold is one step, as with the nudge. */
export function adjustPhotoStep(id: string, patch: Partial<Pick<FramePhoto, "zoom" | "focusX" | "focusY">>, { repeat = false }: { repeat?: boolean } = {}): void {
  if (dragLive()) return;
  stepOrRepeat(() => usePlannerStore.getState().adjustFramePhoto(id, patch), repeat);
}

/** Remove frame photo (§4.7): no confirm, one undo step; the image stays stored for undo. */
export function removeFramePhoto(id: string): void {
  if (dragLive() || !usePlannerStore.getState().shapes.find((s) => s.id === id)?.photo) return;
  usePlannerStore.getState().clearFramePhoto(id);
  announce("Photo removed");
}

/**
 * History holds frames only, not the wall, so a step from before a wall shrink may put frames
 * off the wall: they are fitted to the current wall again, without a history step of their own.
 */
function step(apply: () => void): void {
  if (dragLive()) return;
  apply();
  usePlannerStore.getState().fitToWall();
}

export const undo = () => step(() => usePlannerStore.temporal.getState().undo());
export const redo = () => step(() => usePlannerStore.temporal.getState().redo());
