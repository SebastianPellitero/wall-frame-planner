import { useMotionValue, type MotionValue } from "motion/react";
import { useCallback, useEffect, useLayoutEffect, useRef, type PointerEvent as ReactPointerEvent, type RefObject } from "react";
import { clientToWallCm } from "../lib/geometry";
import { panBy, pinchStep, wheelZoomFactor, zoomAround, type Placement } from "../lib/photoTransform";
import { usePlannerStore } from "../state/store";
import type { Point } from "../types";
import { startPointerSession } from "./pointerSession";

/**
 * Stage children that keep their own presses: controls, and overlays such as the rotate hint,
 * toasts and dialogs. A press on them never starts a pan, so their click still fires.
 */
const OWN_PRESSES = "button, a, input, select, textarea, [role=dialog], [role=alertdialog], [role=status], [role=alert]";

/** The wheel commits once it has been still this long. */
const WHEEL_COMMIT_MS = 150;

/** The photo's live placement in wall cm; equal to the store's except during a gesture. */
export interface LivePlacement {
  x: MotionValue<number>;
  y: MotionValue<number>;
  width: MotionValue<number>;
}

interface Gesture {
  /** The wall's on-screen top-left at gesture start; pointers are tracked in wall cm from it. */
  wallTopLeft: { left: number; top: number };
  pointers: Map<number, Point>;
  /** Each pointer's session; stopping one removes its listeners without ending the gesture. */
  stops: Map<number, () => void>;
}

/**
 * Photo mode's pan, pinch and wheel zoom on the stage (design-system.md §4.6). One pointer pans;
 * two pinch-zoom about their midpoint and pan with it; the wheel zooms about the cursor. During
 * a gesture only the `live` motion values move; the store gets one `setBackground` when the last
 * pointer lifts (or is cancelled), and the wheel commits once it has been still for 150ms.
 *
 * Attach `onPointerDown` and `stageRef` (for the non-passive wheel listener) to the stage.
 */
export function usePinchPan({ enabled, wallRef, pxPerCm }: { enabled: boolean; wallRef: RefObject<HTMLElement | null>; pxPerCm: number }) {
  const bg = usePlannerStore((s) => s.background);
  const wall = usePlannerStore((s) => s.wall);
  const x = useMotionValue(bg.x);
  const y = useMotionValue(bg.y);
  const width = useMotionValue(bg.width);
  const gesture = useRef<Gesture | null>(null);
  const wheelTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Read by the long-lived listeners, so they always see the latest render.
  const latest = useRef({ active: false, pxPerCm, wall, aspect: bg.aspect });
  useLayoutEffect(() => {
    latest.current = { active: enabled && bg.hasImage, pxPerCm, wall, aspect: bg.aspect };
  });

  const placement = useCallback((): Placement => ({ x: x.get(), y: y.get(), width: width.get(), aspect: latest.current.aspect }), [x, y, width]);
  const show = useCallback(
    (p: Placement) => {
      x.set(p.x);
      y.set(p.y);
      width.set(p.width);
    },
    [x, y, width],
  );
  const commit = useCallback(() => {
    usePlannerStore.getState().setBackground({ x: x.get(), y: y.get(), width: width.get() });
  }, [x, y, width]);

  const flushWheel = useCallback(() => {
    if (wheelTimer.current === null) return;
    clearTimeout(wheelTimer.current);
    wheelTimer.current = null;
    commit();
  }, [commit]);

  // Idle: follow the store (sliders, upload, undo of a reset). A store change also supersedes a
  // pending wheel commit.
  useLayoutEffect(() => {
    if (gesture.current) return;
    if (wheelTimer.current !== null) {
      clearTimeout(wheelTimer.current);
      wheelTimer.current = null;
    }
    x.jump(bg.x);
    y.jump(bg.y);
    width.jump(bg.width);
  }, [bg.x, bg.y, bg.width, x, y, width]);

  /** Ends a live pointer gesture early, keeping (committing) what the user sees. */
  const stopGesture = useCallback(() => {
    const g = gesture.current;
    if (!g) return;
    gesture.current = null;
    for (const stop of g.stops.values()) stop();
    commit();
  }, [commit]);

  // Leaving Photo mode or unmounting stops a live gesture and saves a pending wheel zoom.
  useEffect(() => {
    const end = () => {
      stopGesture();
      flushWheel();
    };
    if (!enabled) end();
    return end;
  }, [enabled, flushWheel, stopGesture]);

  const toCm = (g: Gesture, e: { clientX: number; clientY: number }) =>
    clientToWallCm({ x: e.clientX, y: e.clientY }, g.wallTopLeft, latest.current.pxPerCm);

  const onPointerDown = (e: ReactPointerEvent<HTMLElement>) => {
    if (!latest.current.active || !wallRef.current) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    if (e.target instanceof Element && e.target !== e.currentTarget && e.target.closest(OWN_PRESSES)) return;
    let g = gesture.current;
    if (!g) {
      flushWheel();
      const r = wallRef.current.getBoundingClientRect();
      g = gesture.current = { wallTopLeft: { left: r.left, top: r.top }, pointers: new Map(), stops: new Map() };
    }
    if (g.pointers.size >= 2 || g.pointers.has(e.pointerId)) return;
    const session = g;
    const id = e.pointerId;
    session.pointers.set(id, toCm(session, e));

    const stop = startPointerSession(e.currentTarget, id, {
      onMove(ev) {
        const before = [...session.pointers.values()];
        session.pointers.set(id, toCm(session, ev));
        const after = [...session.pointers.values()];
        const { wall: w } = latest.current;
        if (after.length === 2) {
          show(pinchStep(placement(), [before[0], before[1]], [after[0], after[1]], w));
        } else {
          const from = before[0];
          show(panBy(placement(), after[0].x - from.x, after[0].y - from.y));
        }
      },
      onEnd() {
        // pointercancel ends like a lift: what the user sees is kept.
        session.pointers.delete(id);
        session.stops.delete(id);
        if (session.pointers.size > 0) return;
        gesture.current = null;
        commit();
      },
    });
    session.stops.set(id, stop);
  };

  // Wheel zoom about the cursor. Non-passive, so the page itself never zooms or scrolls.
  const stageRef = useCallback(
    (el: HTMLElement | null) => {
      if (!el) return;
      const onWheel = (e: WheelEvent) => {
        if (!latest.current.active || !wallRef.current) return;
        e.preventDefault();
        if (gesture.current || e.deltaY === 0) return;
        const r = wallRef.current.getBoundingClientRect();
        const pivot = clientToWallCm({ x: e.clientX, y: e.clientY }, r, latest.current.pxPerCm);
        show(zoomAround(placement(), wheelZoomFactor(e.deltaY, e.deltaMode), pivot, latest.current.wall));
        if (wheelTimer.current !== null) clearTimeout(wheelTimer.current);
        wheelTimer.current = setTimeout(() => {
          wheelTimer.current = null;
          commit();
        }, WHEEL_COMMIT_MS);
      };
      el.addEventListener("wheel", onWheel, { passive: false });
      return () => el.removeEventListener("wheel", onWheel);
    },
    [wallRef, show, placement, commit],
  );

  const live: LivePlacement = { x, y, width };
  return { live, onPointerDown, stageRef };
}
