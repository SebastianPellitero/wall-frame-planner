export interface PointerSessionHandlers {
  onMove(e: PointerEvent): void;
  /** Called once, on pointerup or pointercancel (`cancelled`), after the listeners are gone. */
  onEnd(e: PointerEvent, cancelled: boolean): void;
}

/**
 * Follows one pointer from its pointerdown until it lifts or is cancelled. Capture is
 * requested, but it can fail (synthetic events, an element that unmounted), so moves are
 * read from `window`, filtered by `pointerId`, either way. Captured events bubble there too.
 * Returns `stop`, which removes the listeners without calling `onEnd`.
 */
export function startPointerSession(target: Element, pointerId: number, handlers: PointerSessionHandlers): () => void {
  try {
    target.setPointerCapture(pointerId);
  } catch {
    // The window listeners below keep the session alive without capture.
  }

  const move = (e: PointerEvent) => {
    if (e.pointerId === pointerId) handlers.onMove(e);
  };
  const end = (e: PointerEvent) => {
    if (e.pointerId !== pointerId) return;
    stop();
    handlers.onEnd(e, e.type === "pointercancel");
  };

  function stop() {
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", end);
    window.removeEventListener("pointercancel", end);
    try {
      if (target.hasPointerCapture(pointerId)) target.releasePointerCapture(pointerId);
    } catch {
      // Already released.
    }
  }

  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", end);
  window.addEventListener("pointercancel", end);
  return stop;
}
