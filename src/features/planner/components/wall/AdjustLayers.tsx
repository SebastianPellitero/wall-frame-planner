import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { createPortal } from "react-dom";
import { VEIL_ATTR } from "../../hooks/useAdjustGesture";
import type { PhotoMotionValues } from "../../hooks/usePhotoMotion";
import { adjustEnterMs, adjustExitMs, adjustOverflowOpacity, easeInSoft, reducedMotion, tween } from "../../lib/physics";
import { cx } from "../ui/cx";
import { FramePhotoImage } from "./FramePhotoImage";

/** Enter over `duration-base` `ease-out-soft`, exit over `duration-quick` `ease-in-soft`; reduced motion: 120ms (§6.3, §6.4). */
function fades(reduced: boolean) {
  if (reduced) return { enter: tween(reducedMotion.tweenShortMs), exit: tween(reducedMotion.tweenShortMs) };
  return { enter: tween(adjustEnterMs), exit: { ...tween(adjustExitMs), ease: easeInSoft } };
}

/**
 * The rest of the zoomed photo around the frame while adjusting (§5.17), at 0.45 and not
 * clipped. Rendered before the frame body, so the moulding and mat paint over it; through the
 * opening the full-opacity photo shows.
 */
export function AdjustOverflow({ show, url, layout, opening }: { show: boolean; url: string | null; layout: PhotoMotionValues; opening: { offset: number; w: number; h: number } }) {
  const reduced = useReducedMotion() === true;
  const { enter, exit } = fades(reduced);
  return (
    <AnimatePresence>
      {show && url && (
        <motion.div
          key="overflow"
          aria-hidden="true"
          className="pointer-events-none absolute"
          style={{ left: opening.offset, top: opening.offset, width: opening.w, height: opening.h }}
          initial={{ opacity: 0 }}
          animate={{ opacity: adjustOverflowOpacity, transition: enter }}
          exit={{ opacity: 0, transition: exit }}
        >
          <FramePhotoImage url={url} layout={layout} testId="frame-photo-overflow" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * The veil over the room while a frame's photo is adjusted (§5.17): a child of the wall (a
 * portal, so its presses still reach the frame's handlers through React), above resting frames
 * and below the adjusted one. It takes every press outside the frame: a drag pans, a tap exits.
 * `onGone` runs once its exit fade is over, so the frame can drop back to `z-frames`.
 */
export function AdjustVeil({ show, wall, panning, onGone }: { show: boolean; wall: HTMLElement | null; panning: boolean; onGone(): void }) {
  const reduced = useReducedMotion() === true;
  if (!wall) return null;
  const { enter, exit } = fades(reduced);
  return createPortal(
    <AnimatePresence onExitComplete={onGone}>
      {show && (
        <motion.div
          key="veil"
          data-testid="adjust-veil"
          {...{ [VEIL_ATTR]: "" }}
          aria-hidden="true"
          className={cx("absolute inset-[-100vmax] z-adjust-veil touch-none bg-adjust-veil", panning ? "cursor-grabbing" : "cursor-grab")}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: enter }}
          exit={{ opacity: 0, transition: exit }}
        />
      )}
    </AnimatePresence>,
    wall,
  );
}
