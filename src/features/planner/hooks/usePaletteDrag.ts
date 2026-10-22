import { animate, useMotionValue, useMotionValueEvent, useReducedMotion, useVelocity, type MotionValue } from "motion/react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useWallContext } from "../components/wall/WallContext";
import { newlyEngagedAxes } from "../lib/dragMath";
import { clampSize } from "../lib/geometry";
import { ghostCenter, placeGhost, type GhostPlacement } from "../lib/paletteMath";
import {
  dragStartPx,
  flyBack,
  flyBackFadeDelayMs,
  flyBackFadeMs,
  ghostFollow,
  ghostOffWallOpacity,
  lift,
  reducedMotion,
  snapHapticMs,
  tilt,
  tiltFromVelocity,
  tween,
} from "../lib/physics";
import type { SnapGuide } from "../lib/snap";
import { useDragUi } from "../state/dragUi";
import { usePlannerStore } from "../state/store";
import type { FrameColor, Point, ShapeKind } from "../types";
import { startPointerSession } from "./pointerSession";

/** The ghost being drawn: which frame, at what size in cm, in which finish. `key` changes per drag. */
export interface GhostState {
  kind: ShapeKind;
  size: { w: number; h: number };
  color: FrameColor;
  key: number;
}

/** Ghost motion values: x/y are the client-px top-left of its true-size box; scale grows it from the source rect. */
export interface GhostMotion {
  x: MotionValue<number>;
  y: MotionValue<number>;
  scale: MotionValue<number>;
  opacity: MotionValue<number>;
  liftOpacity: MotionValue<number>;
  rotate: MotionValue<number>;
}

/** Tap-to-add (§5.1): the kind becomes current and a frame goes to the nearest free spot, unselected. */
export function addFromPalette(kind: ShapeKind) {
  const store = usePlannerStore.getState();
  store.setPaletteKind(kind);
  store.addShape(kind, undefined, { select: false });
}

/**
 * Drag a new frame from any source element onto the wall (design-system.md §5.15, §6.3). A
 * press that moves less than `dragStartPx` is a tap and adds at the nearest free spot. Past it,
 * a true-size ghost follows the pointer, snaps over the wall (drawn where it will land) and
 * publishes guides; a drop on the wall adds the frame there, anything else flies the ghost back
 * to the source. Only motion values change during the drag; the store is written once, on release.
 */
export function usePaletteDrag() {
  const { pxPerCm, wallRef } = useWallContext();
  const reduced = useReducedMotion() === true;
  const [ghost, setGhost] = useState<GhostState | null>(null);
  const motion: GhostMotion = {
    x: useMotionValue(0),
    y: useMotionValue(0),
    scale: useMotionValue(1),
    opacity: useMotionValue(1),
    liftOpacity: useMotionValue(0),
    rotate: useMotionValue(0),
  };
  const vx = useVelocity(motion.x);
  const latest = useRef({ pxPerCm, reduced, motion });
  useLayoutEffect(() => {
    latest.current = { pxPerCm, reduced, motion };
  });
  const stopSession = useRef<(() => void) | null>(null);
  const overWall = useRef(false);
  const ghostKey = useRef(0);

  useMotionValueEvent(vx, "change", (v) => {
    if (stopSession.current && overWall.current && !latest.current.reduced) animate(motion.rotate, tiltFromVelocity(v), tilt);
  });

  useEffect(
    () => () => {
      if (!stopSession.current) return;
      stopSession.current();
      useDragUi.getState().endDrag();
    },
    [],
  );

  /** `source` is where the ghost grows from and flies back to; the pressed element by default. */
  const onPointerDown = useCallback(
    (kind: ShapeKind, e: ReactPointerEvent<HTMLElement>, source?: Element | null) => {
      if (stopSession.current || !e.isPrimary || e.button !== 0) return;
      const coarse = e.pointerType === "touch" || e.pointerType === "pen";
      const touch = e.pointerType === "touch";
      const slop = coarse ? dragStartPx.coarse : dragStartPx.fine;
      const origin = { x: e.clientX, y: e.clientY };
      const from = (source ?? e.currentTarget).getBoundingClientRect();
      const fromCenter = { x: from.left + from.width / 2, y: from.top + from.height / 2 };
      const mv = latest.current.motion;
      let started = false;
      let size = { w: 0, h: 0 };
      let color: FrameColor = 1;
      let fromScale = 1;
      let key = 0;
      let placement: GhostPlacement = { overWall: false };
      let guides: SnapGuide[] = [];

      const px = () => ({ w: size.w * latest.current.pxPerCm, h: size.h * latest.current.pxPerCm });
      const follow = (value: MotionValue<number>, to: number) => {
        if (latest.current.reduced) value.set(to);
        else animate(value, to, ghostFollow);
      };
      const fade = () => (latest.current.reduced ? tween(reducedMotion.tweenShortMs) : lift);

      const begin = () => {
        started = true;
        const { wall, paletteSizes, creatorColor, setPaletteKind } = usePlannerStore.getState();
        setPaletteKind(kind);
        size = clampSize(kind, paletteSizes[kind].w, paletteSizes[kind].h, wall);
        // The drop adds a frame in the creator color, so the ghost wears it too.
        color = creatorColor;
        const { w, h } = px();
        fromScale = w > 0 && h > 0 ? Math.min(from.width / w, from.height / h) : 1;
        mv.x.jump(fromCenter.x - w / 2);
        mv.y.jump(fromCenter.y - h / 2);
        mv.scale.jump(fromScale);
        mv.opacity.jump(ghostOffWallOpacity);
        mv.liftOpacity.jump(0);
        mv.rotate.jump(0);
        overWall.current = false;
        key = ++ghostKey.current;
        setGhost({ kind, size, color, key });
        if (latest.current.reduced) mv.scale.jump(1);
        else animate(mv.scale, 1, ghostFollow);
      };

      const update = (pointer: Point) => {
        const { w, h } = px();
        const centerPx = ghostCenter(pointer, h, coarse);
        const wallRect = wallRef.current?.getBoundingClientRect();
        const { wall, grid } = usePlannerStore.getState();
        placement = wallRect
          ? placeGhost({ centerPx, wallRect, size, pxPerCm: latest.current.pxPerCm, wall, grid, coarse })
          : { overWall: false };
        const topLeft = placement.overWall ? placement.topLeftPx : { x: centerPx.x - w / 2, y: centerPx.y - h / 2 };
        follow(mv.x, topLeft.x);
        follow(mv.y, topLeft.y);

        if (placement.overWall !== overWall.current) {
          overWall.current = placement.overWall;
          animate(mv.opacity, placement.overWall ? 1 : ghostOffWallOpacity, fade());
          animate(mv.liftOpacity, placement.overWall ? 1 : 0, fade());
          if (!placement.overWall) animate(mv.rotate, 0, latest.current.reduced ? tween(reducedMotion.tweenMs) : tilt);
        }
        const next = placement.overWall ? placement.guides : [];
        if (touch && newlyEngagedAxes(guides, next).length > 0) navigator.vibrate?.(snapHapticMs);
        guides = next;
        useDragUi.getState().setGuides(next);
      };

      const flyHome = () => {
        const { w, h } = px();
        const r = latest.current.reduced;
        const move = r ? tween(reducedMotion.tweenMs) : flyBack;
        animate(mv.x, fromCenter.x - w / 2, move);
        animate(mv.y, fromCenter.y - h / 2, move);
        animate(mv.rotate, 0, move);
        animate(mv.liftOpacity, 0, move);
        animate(mv.scale, fromScale, {
          ...move,
          onComplete: () => setGhost((g) => (g?.key === key ? null : g)),
        });
        animate(mv.opacity, 0, r ? tween(reducedMotion.tweenMs) : tween(flyBackFadeMs, flyBackFadeDelayMs / 1000));
      };

      stopSession.current = startPointerSession(e.currentTarget, e.pointerId, {
        onMove(ev) {
          const pointer = { x: ev.clientX, y: ev.clientY };
          if (!started) {
            if (Math.hypot(pointer.x - origin.x, pointer.y - origin.y) < slop) return;
            begin();
          }
          update(pointer);
        },
        onEnd(ev, cancelled) {
          stopSession.current = null;
          if (!started) {
            if (!cancelled) addFromPalette(kind);
            return;
          }
          // A cancel may carry no coordinates; it flies back regardless.
          if (!cancelled) update({ x: ev.clientX, y: ev.clientY });
          useDragUi.getState().endDrag();
          overWall.current = false;
          if (!cancelled && placement.overWall) {
            setGhost(null);
            usePlannerStore.getState().addShape(kind, placement.centerCm);
          } else {
            flyHome();
          }
        },
      });
    },
    [wallRef],
  );

  return { onPointerDown, ghost, motion };
}
