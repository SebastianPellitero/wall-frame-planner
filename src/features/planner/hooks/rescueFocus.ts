/** Where focus goes when the control or frame holding it disappears: the Frame creator's checked shape. */
const FALLBACK = '[role="radiogroup"][aria-label="Shape"] [role="radio"][aria-checked="true"]';

/**
 * Call just before an action that can remove the focused element (Delete, Deselect, Esc).
 * Once the UI has updated, if focus fell to <body> or still sits on the frame being removed
 * (it lingers during its exit animation), it moves to the Frame creator (§7). Focus that was
 * never on a control is left alone.
 */
export function rescueFocus(removedId?: string): void {
  const before = document.activeElement;
  if (!before || before === document.body) return;
  requestAnimationFrame(() => {
    const active = document.activeElement;
    const lost =
      !active ||
      active === document.body ||
      !active.isConnected ||
      (removedId !== undefined && active.closest<HTMLElement>("[data-shape-id]")?.dataset.shapeId === removedId);
    if (lost) document.querySelector<HTMLElement>(FALLBACK)?.focus();
  });
}
