import { animate, useMotionValue, useMotionValueEvent, useReducedMotion, useVelocity } from "motion/react";
import { useLayoutEffect, useRef, useState } from "react";
import {
  duplicate,
  lift as liftSpring,
  liftScale,
  push,
  pushDelayMs,
  reducedMotion,
  settle,
  settleRotate,
  tilt,
  tiltFromVelocity,
  tween,
} from "../lib/physics";
import { useDragUi } from "../state/dragUi";
import { usePlannerStore } from "../state/store";
import type { Point, Shape } from "../types";

/**
 * A frame's motion values (px, deg, opacity) and the springs that drive them (§6.3):
 * lift, velocity tilt, settle on drop, push for every other position change, and a plain
 * jump when `pxPerCm` changes (resize, rotation), so frames never fly around. A duplicate
 * mounts over its original, lifted, and springs out to its own spot.
 */
export function useFrameMotion(shape: Pick<Shape, "id" | "x" | "y">, pxPerCm: number) {
  const reduced = useReducedMotion() === true;
  // Read during render, taken (cleared) in the mount effect, so a double render keeps it.
  const [spawn] = useState(() => {
    const s = useDragUi.getState().spawnFrom;
    return s?.id === shape.id ? s.from : null;
  });
  const x = useMotionValue((spawn ?? shape).x * pxPerCm);
  const y = useMotionValue((spawn ?? shape).y * pxPerCm);
  const scale = useMotionValue(spawn && !reduced ? liftScale : 1);
  const rotate = useMotionValue(0);
  const liftOpacity = useMotionValue(spawn ? 1 : 0);
  const nudgeOpacity = useMotionValue(0);
  const vx = useVelocity(x);

  const dragging = useRef(false);
  /** The committed spot x/y are at or heading to, and the scale it was converted with. */
  const shown = useRef({ x: shape.x, y: shape.y, pxPerCm });
  const latest = useRef({ pxPerCm, reduced });
  useLayoutEffect(() => {
    latest.current = { pxPerCm, reduced };
  });

  useMotionValueEvent(vx, "change", (v) => {
    if (dragging.current && !reduced) animate(rotate, tiltFromVelocity(v), tilt);
  });

  // Duplicate (§6.3): from the original, at liftScale with the lift layer, out to its own spot.
  useLayoutEffect(() => {
    if (!spawn) return;
    useDragUi.getState().takeSpawnFrom(shape.id);
    const { pxPerCm: ppc, reduced: r } = latest.current;
    const to = shown.current;
    const travel = r ? tween(reducedMotion.tweenMs) : duplicate;
    const fade = r ? tween(reducedMotion.tweenShortMs) : duplicate;
    animate(x, to.x * ppc, travel);
    animate(y, to.y * ppc, travel);
    animate(scale, 1, fade);
    animate(liftOpacity, 0, fade);
  }, [spawn, shape.id, x, y, scale, liftOpacity]);

  // Position changes from outside the drag: push-apart, undo/redo, numeric edits, rescale.
  useLayoutEffect(() => {
    if (dragging.current) return;
    const prev = shown.current;
    shown.current = { x: shape.x, y: shape.y, pxPerCm };
    if (prev.pxPerCm !== pxPerCm) {
      x.jump(shape.x * pxPerCm);
      y.jump(shape.y * pxPerCm);
      return;
    }
    if (prev.x === shape.x && prev.y === shape.y) return;
    const delay = pushDelayMs(usePlannerStore.getState().pushedIds.indexOf(shape.id), reduced) / 1000;
    const move = reduced ? tween(reducedMotion.tweenMs, delay) : { ...push, delay };
    const fade = reduced ? tween(reducedMotion.tweenShortMs) : liftSpring;
    animate(nudgeOpacity, 1, { ...fade, delay });
    animate(y, shape.y * pxPerCm, move);
    animate(x, shape.x * pxPerCm, { ...move, onComplete: () => void animate(nudgeOpacity, 0, fade) });
  }, [shape.id, shape.x, shape.y, pxPerCm, reduced, x, y, nudgeOpacity]);

  /** Pick-up: from here until `drop`, only the drag writes x/y. */
  function lift() {
    dragging.current = true;
    x.stop();
    y.stop();
    nudgeOpacity.jump(0);
    const t = latest.current.reduced ? tween(reducedMotion.tweenShortMs) : liftSpring;
    animate(scale, latest.current.reduced ? 1 : liftScale, t);
    animate(liftOpacity, 1, t);
  }

  /** Release: spring from wherever the drag left the frame to its committed spot. */
  function drop(commitCm: Point) {
    dragging.current = false;
    const { pxPerCm: ppc, reduced: r } = latest.current;
    shown.current = { ...commitCm, pxPerCm: ppc };
    const move = r ? tween(reducedMotion.tweenMs) : settle;
    animate(x, commitCm.x * ppc, move);
    animate(y, commitCm.y * ppc, move);
    animate(scale, 1, r ? tween(reducedMotion.tweenShortMs) : settle);
    animate(liftOpacity, 0, r ? tween(reducedMotion.tweenShortMs) : settle);
    if (r) rotate.jump(0);
    else animate(rotate, 0, settleRotate);
  }

  return { x, y, scale, rotate, liftOpacity, nudgeOpacity, lift, drop, spawned: spawn !== null };
}
