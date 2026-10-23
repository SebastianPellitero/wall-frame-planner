import { animate, useMotionValue, useReducedMotion, type MotionValue } from "motion/react";
import { useCallback, useLayoutEffect, useMemo, useRef } from "react";
import type { photoLayout } from "../lib/framePhoto";
import { reducedMotion, settle, tween } from "../lib/physics";

export type PhotoLayout = ReturnType<typeof photoLayout>;

/** The `<img>` box inside the opening, in px, as motion values. */
export interface PhotoMotionValues {
  left: MotionValue<number>;
  top: MotionValue<number>;
  width: MotionValue<number>;
  height: MotionValue<number>;
}

export interface PhotoMotion extends PhotoMotionValues {
  /** A live gesture: show `layout` now; the store-follow is paused until `release`. */
  show(layout: PhotoLayout): void;
  /** The gesture is over: settle onto the committed layout (rubber-band return, tap to center). */
  release(): void;
}

const KEYS = ["left", "top", "width", "height"] as const;

/**
 * A frame photo's layout as motion values (§5.17, §6.3). They follow `target`: a crop change
 * (keyboard pan, tap to center, undo) animates on `settle`; a new `scene` (another image, the
 * mat switch, a resize or rescale) or an `instant` change (the Zoom slider's live value) jumps,
 * since the layout depends on the opening and a tween would re-crop on every frame. During a
 * gesture only `show` writes them. Reduced motion: a 160ms tween instead of the spring.
 */
export function usePhotoMotion(target: PhotoLayout, scene: string, instant: boolean): PhotoMotion {
  const reduced = useReducedMotion() === true;
  const left = useMotionValue(target.left);
  const top = useMotionValue(target.top);
  const width = useMotionValue(target.width);
  const height = useMotionValue(target.height);
  const values = useMemo(() => ({ left, top, width, height }), [left, top, width, height]);
  const live = useRef(false);
  const shownScene = useRef(scene);
  const latest = useRef({ target, reduced });
  useLayoutEffect(() => {
    latest.current = { target, reduced };
  });

  const moveTo = useCallback(
    (to: PhotoLayout, jump: boolean) => {
      const transition = latest.current.reduced ? tween(reducedMotion.tweenMs) : settle;
      for (const k of KEYS) {
        if (jump) values[k].jump(to[k]);
        else animate(values[k], to[k], transition);
      }
    },
    [values],
  );

  useLayoutEffect(() => {
    if (live.current) return;
    const jump = instant || shownScene.current !== scene;
    shownScene.current = scene;
    moveTo({ left: target.left, top: target.top, width: target.width, height: target.height }, jump);
  }, [target.left, target.top, target.width, target.height, scene, instant, moveTo]);

  const show = useCallback(
    (layout: PhotoLayout) => {
      live.current = true;
      moveTo(layout, true);
    },
    [moveTo],
  );
  const release = useCallback(() => {
    live.current = false;
    moveTo(latest.current.target, false);
  }, [moveTo]);

  return useMemo(() => ({ ...values, show, release }), [values, show, release]);
}
