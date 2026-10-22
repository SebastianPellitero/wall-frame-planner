import { useDragUi } from "./dragUi";
import { usePlannerStore } from "./store";

/**
 * Frame commands shared by the selection bar, the history buttons and the keyboard shortcuts,
 * so each action has one implementation.
 */

/** Duplicates `id` (selected, same color) and has the copy spring out from the original (§6.3). */
export function duplicateFrame(id: string): string | null {
  const original = usePlannerStore.getState().shapes.find((s) => s.id === id);
  if (!original) return null;
  const copyId = usePlannerStore.getState().duplicateShape(id);
  // Set before React renders the copy (it renders after this handler returns).
  if (copyId) useDragUi.getState().setSpawnFrom(copyId, { x: original.x, y: original.y });
  return copyId;
}

/** Moves `id` by (dx, dy) cm through the single commit path (clamped, pushes neighbors). */
export function nudgeFrame(id: string, dx: number, dy: number): void {
  const shape = usePlannerStore.getState().shapes.find((s) => s.id === id);
  if (!shape) return;
  usePlannerStore.getState().commitShape(id, { x: shape.x + dx, y: shape.y + dy });
}

export const undo = () => usePlannerStore.temporal.getState().undo();
export const redo = () => usePlannerStore.temporal.getState().redo();
