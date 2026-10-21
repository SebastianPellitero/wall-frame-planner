import type { MotionValue } from "motion/react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { computeDrag, newlyEngagedAxes } from "../lib/dragMath";
import { dragStartPx, snapHapticMs } from "../lib/physics";
import type { SnapGuide } from "../lib/snap";
import { useDragUi } from "../state/dragUi";
import { usePlannerStore } from "../state/store";
import type { Point } from "../types";
import { startPointerSession } from "./pointerSession";

export interface FrameDragOptions {
  id: string;
  size: { w: number; h: number };
  pxPerCm: number;
  /** Arrange mode only. */
  enabled: boolean;
  x: MotionValue<number>;
  y: MotionValue<number>;
  onLift(): void;
  /** Called once per drag, on release or cancel, with the spot to commit. */
  onDrop(commitCm: Point): void;
}

/**
 * Pointer Events drag for a frame (mouse, touch and pen share one path). A press that moves
 * less than `dragStartPx` is a tap and only selects. During a drag only the x/y motion values
 * change; the store is written once, through `onDrop`.
 */
export function useFrameDrag(options: FrameDragOptions) {
  const [dragging, setDragging] = useState(false);
  const latest = useRef(options);
  useLayoutEffect(() => {
    latest.current = options;
  });
  const stopSession = useRef<(() => void) | null>(null);

  useEffect(
    () => () => {
      if (!stopSession.current) return;
      stopSession.current();
      if (useDragUi.getState().draggingId === latest.current.id) useDragUi.getState().endDrag();
    },
    [],
  );

  const onPointerDown = useCallback((e: ReactPointerEvent<HTMLElement>) => {
    const { id, enabled } = latest.current;
    if (!enabled || stopSession.current || !e.isPrimary || e.button !== 0) return;
    const shape = usePlannerStore.getState().shapes.find((s) => s.id === id);
    if (!shape) return;
    e.stopPropagation();

    const coarse = e.pointerType === "touch" || e.pointerType === "pen";
    const touch = e.pointerType === "touch";
    const slop = coarse ? dragStartPx.coarse : dragStartPx.fine;
    const origin = { x: e.clientX, y: e.clientY };
    const startCm = { x: shape.x, y: shape.y };
    let delta = { x: 0, y: 0 };
    let started = false;
    let guides: SnapGuide[] = [];

    const compute = () => {
      const { wall, grid } = usePlannerStore.getState();
      const { size, pxPerCm } = latest.current;
      return computeDrag({ startCm, deltaPx: delta, size, pxPerCm, wall, grid, coarse });
    };

    stopSession.current = startPointerSession(e.currentTarget, e.pointerId, {
      onMove(ev) {
        delta = { x: ev.clientX - origin.x, y: ev.clientY - origin.y };
        if (!started) {
          if (Math.hypot(delta.x, delta.y) < slop) return;
          started = true;
          usePlannerStore.getState().select(id);
          useDragUi.getState().startDrag(id);
          setDragging(true);
          latest.current.onLift();
        }
        const r = compute();
        latest.current.x.set(r.displayPx.x);
        latest.current.y.set(r.displayPx.y);
        if (touch && newlyEngagedAxes(guides, r.guides).length > 0) navigator.vibrate?.(snapHapticMs);
        guides = r.guides;
        useDragUi.getState().setGuides(r.guides);
      },
      onEnd(ev, cancelled) {
        stopSession.current = null;
        if (!started) {
          if (!cancelled) usePlannerStore.getState().select(id);
          return;
        }
        // A cancel may carry no coordinates, so it lands where the last move was.
        if (!cancelled) delta = { x: ev.clientX - origin.x, y: ev.clientY - origin.y };
        const { commitCm } = compute();
        useDragUi.getState().endDrag();
        setDragging(false);
        latest.current.onDrop(commitCm);
      },
    });
  }, []);

  return { onPointerDown, dragging };
}
