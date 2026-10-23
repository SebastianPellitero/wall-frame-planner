import { motion, useReducedMotion, type MotionValue } from "motion/react";
import { useCallback, useState, type KeyboardEvent, type PointerEvent } from "react";
import { VEIL_ATTR } from "../../hooks/useAdjustGesture";
import { useFrameDrag } from "../../hooks/useFrameDrag";
import { useFrameMotion } from "../../hooks/useFrameMotion";
import { useFramePicture } from "../../hooks/useFramePicture";
import { frameName } from "../../lib/frameLook";
import {
  lift,
  photoModeFrameOpacity,
  popIn,
  popInFadeMs,
  popInFromScale,
  reducedMotion,
  remove,
  removeFadeMs,
  removeToScale,
  tween,
} from "../../lib/physics";
import { usePlannerStore } from "../../state/store";
import type { Point, Shape } from "../../types";
import { cx } from "../ui/cx";
import { AdjustOverflow, AdjustVeil } from "./AdjustLayers";
import { adjustKey } from "./adjustKeys";
import { FramePhotoImage } from "./FramePhotoImage";
import { FrameVisual, type FrameVisualPhoto } from "./FrameVisual";

/** Below this on-screen size a frame gets an invisible 44px hit extension (§7). */
const TOUCH_PX = 44;

/**
 * One frame on the wall: positioned by x/y motion values in px, sized from cm × pxPerCm.
 * Dragging lives in useFrameDrag, the springs in useFrameMotion, the look in FrameVisual.
 */
export function FrameNode({ shape, pxPerCm }: { shape: Shape; pxPerCm: number }) {
  const reduced = useReducedMotion() === true;
  const mode = usePlannerStore((s) => s.mode);
  const selected = usePlannerStore((s) => s.selectedId === shape.id);
  const motionValues = useFrameMotion(shape, pxPerCm);
  const arrange = mode === "arrange";
  // The wall element, the veil's portal target (frames are its children).
  const [wall, setWall] = useState<HTMLElement | null>(null);
  const findWall = useCallback((el: HTMLElement | null) => setWall(el?.parentElement ?? null), []);
  const wPx = shape.w * pxPerCm;
  const hPx = shape.h * pxPerCm;
  const picture = useFramePicture(shape, wPx, hPx);
  const { adjusting } = picture;
  // Raised from entering adjust mode until the veil has faded out (§6.3).
  const [adjustRaised, setAdjustRaised] = useState(false);
  if (adjusting && !adjustRaised) setAdjustRaised(true);
  // Without a wall to portal into there is no veil whose fade-out would lower the frame.
  if (!adjusting && adjustRaised && !wall) setAdjustRaised(false);

  const onDrop = (commitCm: Point) => {
    motionValues.drop(commitCm);
    usePlannerStore.getState().commitShape(shape.id, commitCm);
  };
  const { onPointerDown, dragging } = useFrameDrag({
    id: shape.id,
    size: { w: shape.w, h: shape.h },
    pxPerCm,
    enabled: arrange && !adjusting,
    x: motionValues.x,
    y: motionValues.y,
    onLift: motionValues.lift,
    onDrop,
  });

  const onPressDown = (e: PointerEvent<HTMLElement>) => {
    if (adjusting) return picture.gesture.onPointerDown(e);
    // A press on the veil as it fades out is not a press on this frame.
    if (e.target instanceof Element && e.target.hasAttribute(VEIL_ATTR)) return;
    onPointerDown(e);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    // In adjust mode the arrows pan and +/- zoom the photo (§5.17).
    if (adjusting && shape.photo && adjustKey(e, shape.id, shape.photo, picture.opening)) {
      e.preventDefault();
      return;
    }
    // Nudges, Delete and Esc act on the selection from anywhere: useShortcuts.
    switch (e.key) {
      case "Enter":
      case " ":
        e.preventDefault();
        usePlannerStore.getState().select(shape.id);
        break;
    }
  };

  const circle = shape.kind === "circle";
  // A photo that failed to load follows the plain-frame rules (§3.8); its data stays.
  const visualPhoto: FrameVisualPhoto | undefined =
    picture.state === "none" || picture.state === "failed"
      ? undefined
      : {
          image: picture.url && <FramePhotoImage key={picture.url} url={picture.url} layout={picture.motion} testId="frame-photo" />,
          plate: adjusting || !arrange ? "none" : selected || dragging ? "shown" : "rest",
          adjusting,
        };
  const fadeIn = tween(reduced ? reducedMotion.tweenShortMs : popInFadeMs);
  const fadeOut = tween(reduced ? reducedMotion.tweenShortMs : removeFadeMs);

  return (
    <motion.div
      ref={findWall}
      data-testid="frame"
      data-shape-id={shape.id}
      data-kind={shape.kind}
      data-x={shape.x.toFixed(1)}
      data-y={shape.y.toFixed(1)}
      data-w={shape.w.toFixed(1)}
      data-h={shape.h.toFixed(1)}
      data-frame-color={shape.color}
      data-has-photo={shape.photo !== undefined}
      data-mat={shape.mat}
      data-adjusting={adjusting || undefined}
      role="button"
      tabIndex={arrange ? 0 : -1}
      aria-label={frameName(shape.kind, shape.w, shape.h, shape.photo !== undefined)}
      aria-pressed={selected}
      onPointerDown={onPressDown}
      onKeyDown={arrange ? onKeyDown : undefined}
      // A duplicate springs out of its original instead of popping in (useFrameMotion).
      initial={motionValues.spawned ? false : reduced ? { opacity: 0 } : { opacity: 0, scale: popInFromScale }}
      animate={{ opacity: 1, scale: 1, transition: { opacity: fadeIn, scale: reduced ? fadeIn : popIn } }}
      exit={{
        opacity: 0,
        ...(reduced ? {} : { scale: removeToScale }),
        transition: { opacity: fadeOut, scale: remove },
      }}
      style={{ x: motionValues.x, y: motionValues.y, width: wPx, height: hPx }}
      className={cx(
        "group absolute top-0 left-0 touch-none select-none",
        "focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-dashed focus-visible:outline-focus",
        // Raised from lift until the settle lands (useFrameMotion), not only while dragging.
        dragging || motionValues.raised || adjustRaised ? "z-frame-lifted" : "z-frames",
        circle && "rounded-full",
        arrange ? (dragging || picture.gesture.panning ? "cursor-grabbing" : "cursor-grab") : "pointer-events-none",
        Math.min(wPx, hPx) < TOUCH_PX &&
          "before:absolute before:top-1/2 before:left-1/2 before:h-[max(100%,var(--spacing-touch))] before:w-[max(100%,var(--spacing-touch))] before:-translate-1/2",
      )}
    >
      <motion.div className="relative size-full" style={{ scale: motionValues.scale, opacity: mode === "photo" ? photoModeFrameOpacity : 1 }}>
        <motion.div className="relative size-full" style={{ rotate: motionValues.rotate, originX: 0.5, originY: 0 }}>
          <AdjustOverflow show={adjusting} url={picture.url} layout={picture.motion} opening={picture.opening} />
          <ShadowLayer className="shadow-frame-lift" circle={circle} opacity={motionValues.liftOpacity} />
          <ShadowLayer className="shadow-frame-nudge" circle={circle} opacity={motionValues.nudgeOpacity} />
          {/* Pop-in: placed against the wall, the lift shadow fades away. Skipped on restore. */}
          <motion.div
            aria-hidden="true"
            className={cx("pointer-events-none absolute inset-0 shadow-frame-lift", circle && "rounded-full")}
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            transition={reduced ? tween(reducedMotion.tweenShortMs) : lift}
          />
          <FrameVisual
            kind={shape.kind}
            wCm={shape.w}
            hCm={shape.h}
            wPx={wPx}
            hPx={hPx}
            selected={selected && arrange && !adjusting}
            hoverable={arrange && !dragging && !adjusting}
            mat={shape.mat}
            photo={visualPhoto}
          />
        </motion.div>
      </motion.div>
      <AdjustVeil show={adjusting} wall={wall} panning={picture.gesture.panning} onGone={() => setAdjustRaised(false)} />
    </motion.div>
  );
}

/** A shadow-only sibling whose opacity animates instead of the box-shadow (§2.5 performance rule). */
function ShadowLayer({ className, circle, opacity }: { className: string; circle: boolean; opacity: MotionValue<number> }) {
  return (
    <motion.div
      aria-hidden="true"
      className={cx("pointer-events-none absolute inset-0", circle && "rounded-full", className)}
      style={{ opacity }}
    />
  );
}
