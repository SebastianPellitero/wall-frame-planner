import { announce } from "./announcer";
import { useDragUi } from "./dragUi";
import { usePlannerStore } from "./store";

/**
 * Frame commands shared by the selection bar, the history buttons and the keyboard shortcuts,
 * so each action has one implementation. Duplicates and deletes are announced (§7).
 */

/** Duplicates `id` (selected, same color) and has the copy spring out from the original (§6.3). */
export function duplicateFrame(id: string): string | null {
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
  if (!usePlannerStore.getState().shapes.some((s) => s.id === id)) return;
  usePlannerStore.getState().deleteShape(id);
  announce("Frame deleted");
}

/**
 * Moves `id` by (dx, dy) cm through the single commit path (clamped, pushes neighbors).
 * `repeat` (a held key's auto-repeat) moves the frame and saves it but records no history
 * step, so a whole hold is the first press's single step: undo returns to where it started.
 */
export function nudgeFrame(id: string, dx: number, dy: number, { repeat = false }: { repeat?: boolean } = {}): void {
  const shape = usePlannerStore.getState().shapes.find((s) => s.id === id);
  if (!shape) return;
  const commit = () => usePlannerStore.getState().commitShape(id, { x: shape.x + dx, y: shape.y + dy });
  if (!repeat) return commit();
  const temporal = usePlannerStore.temporal.getState();
  temporal.pause();
  try {
    commit();
  } finally {
    temporal.resume();
  }
}

export const undo = () => usePlannerStore.temporal.getState().undo();
export const redo = () => usePlannerStore.temporal.getState().redo();
