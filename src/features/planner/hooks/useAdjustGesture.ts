import { useCallback, useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { centerFocusOn, panFocus, photoLayout, rubberPanLayout, zoomPhotoAt, type Opening, type PhotoCrop } from "../lib/framePhoto";
import { dragStartPx } from "../lib/physics";
import { exitAdjust } from "../state/selectionUi";
import { usePlannerStore } from "../state/store";
import type { Point } from "../types";
import type { PhotoMotion } from "./usePhotoMotion";
import { startPointerSession } from "./pointerSession";

/** Marks the adjust veil: a tap there ends adjust mode instead of centering. */
export const VEIL_ATTR = "data-adjust-veil";

export interface AdjustGestureOptions {
  id: string;
  /** Adjust mode is on for this frame. Turning it off mid-gesture commits what is shown. */
  enabled: boolean;
  /** The opening in px and its inset from the frame's edge. */
  opening: Opening & { offset: number };
  motion: PhotoMotion;
}

interface Gesture {
  /** The crop the current phase starts from (the pinch updates it as it goes). */
  crop: PhotoCrop;
  pointers: Map<number, Point>;
  stops: Map<number, () => void>;
  /** One-pointer phase: where the pan started. */
  origin: Point;
  /** Two-pointer phase: the last distance between the fingers. */
  spread: number;
  /** The frame's top-left on screen (scale 1, no tilt while adjusting). */
  frameTopLeft: Point;
  slop: number;
  moved: boolean;
  onVeil: boolean;
}

const pair = (g: Gesture) => [...g.pointers.values()];
const distance = (a: Point, b: Point) => Math.hypot(b.x - a.x, b.y - a.y);

/** Gesture state changes as the pointers move; it lives outside React. */
const update = (g: Gesture, patch: Partial<Gesture>) => Object.assign(g, patch);

/** A screen point in px from the opening's top-left. */
const local = (g: Gesture, p: Point, offset: number): Point => ({ x: p.x - g.frameTopLeft.x - offset, y: p.y - g.frameTopLeft.y - offset });

/** The crop on screen now, clamped, as the commit would store it. */
function shownCrop(g: Gesture, opening: Opening): PhotoCrop {
  if (g.pointers.size !== 1 || !g.moved) return g.crop;
  const p = pair(g)[0];
  return { ...g.crop, ...panFocus(g.crop, p.x - g.origin.x, p.y - g.origin.y, opening) };
}

/**
 * Adjust mode's pointer input on the frame and the veil (design-system.md §5.17). One pointer
 * pans the photo 1:1 (rubber-banding past the clamp); two pinch-zoom about their midpoint; a tap
 * inside the frame centers that image point (WCAG 2.5.7) and a tap on the veil ends adjust mode.
 * Only the photo's motion values change during the gesture; `adjustFramePhoto` is called once,
 * when the last pointer lifts or is cancelled.
 */
export function useAdjustGesture(options: AdjustGestureOptions) {
  const [panning, setPanning] = useState(false);
  const latest = useRef(options);
  useLayoutEffect(() => {
    latest.current = options;
  });
  const gesture = useRef<Gesture | null>(null);

  const finish = useCallback((g: Gesture, tapAt: Point | null) => {
    for (const stop of g.stops.values()) stop();
    gesture.current = null;
    setPanning(false);
    const { id, opening, motion } = latest.current;
    const store = usePlannerStore.getState();
    if (g.moved) {
      const { zoom, focusX, focusY } = g.crop;
      store.adjustFramePhoto(id, { zoom, focusX, focusY });
    } else if (tapAt && g.onVeil) {
      exitAdjust();
    } else if (tapAt) {
      store.adjustFramePhoto(id, centerFocusOn(g.crop, local(g, tapAt, opening.offset), opening));
    }
    motion.release();
  }, []);

  // Leaving adjust mode mid-gesture keeps (commits) what is shown.
  useEffect(() => {
    const g = gesture.current;
    if (!options.enabled && g) {
      update(g, { crop: shownCrop(g, latest.current.opening) });
      finish(g, null);
    }
  }, [options.enabled, finish]);

  const onPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLElement>) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      const photo = usePlannerStore.getState().shapes.find((s) => s.id === latest.current.id)?.photo;
      if (!photo) return;
      e.stopPropagation();
      const at = { x: e.clientX, y: e.clientY };
      let g = gesture.current;
      if (!g) {
        const r = e.currentTarget.getBoundingClientRect();
        const coarse = e.pointerType === "touch" || e.pointerType === "pen";
        g = gesture.current = {
          crop: { ...photo },
          pointers: new Map(),
          stops: new Map(),
          origin: at,
          spread: 0,
          frameTopLeft: { x: r.left, y: r.top },
          slop: coarse ? dragStartPx.coarse : dragStartPx.fine,
          moved: false,
          onVeil: e.target instanceof Element && e.target.hasAttribute(VEIL_ATTR),
        };
      }
      if (g.pointers.size >= 2 || g.pointers.has(e.pointerId)) return;
      const session = g;
      if (session.pointers.size === 1) {
        // A second finger: the pan so far becomes the base the pinch starts from.
        update(session, { crop: shownCrop(session, latest.current.opening), moved: true, spread: distance(pair(session)[0], at) });
      } else {
        update(session, { origin: at });
      }
      session.pointers.set(e.pointerId, at);

      const stop = startPointerSession(e.currentTarget, e.pointerId, {
        onMove(ev) {
          if (!session.pointers.has(ev.pointerId)) return;
          session.pointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
          const { opening, motion } = latest.current;
          if (session.pointers.size === 2) {
            const [a, b] = pair(session);
            const spread = distance(a, b);
            if (session.spread > 0 && spread > 0) {
              const mid = local(session, { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, opening.offset);
              update(session, { crop: { ...session.crop, ...zoomPhotoAt(session.crop, (session.crop.zoom * spread) / session.spread, opening, mid) } });
            }
            update(session, { spread: spread });
            motion.show(photoLayout(opening.w, opening.h, session.crop));
            return;
          }
          const p = pair(session)[0];
          const dx = p.x - session.origin.x;
          const dy = p.y - session.origin.y;
          if (!session.moved && Math.hypot(dx, dy) < session.slop) return;
          if (!session.moved) setPanning(true);
          update(session, { moved: true });
          motion.show(rubberPanLayout(session.crop, dx, dy, opening));
        },
        onEnd(ev, cancelled) {
          // A cancel may carry no coordinates: it ends where the last move was.
          if (!cancelled) session.pointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
          if (session.pointers.size === 1) {
            update(session, { crop: shownCrop(session, latest.current.opening) });
            finish(session, cancelled ? null : { x: ev.clientX, y: ev.clientY });
            return;
          }
          // One of two fingers lifted: the other pans on from here.
          session.pointers.delete(ev.pointerId);
          session.stops.delete(ev.pointerId);
          update(session, { origin: pair(session)[0] });
        },
      });
      session.stops.set(e.pointerId, stop);
    },
    [finish],
  );

  return { onPointerDown, panning };
}
