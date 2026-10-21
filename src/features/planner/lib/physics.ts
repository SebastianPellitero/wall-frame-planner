/**
 * Motion presets and scalars. Values are the designer's, from docs/design/design-system.md §6.
 * Springs are plain `{ type: "spring", stiffness, damping, mass }` objects, so they can be
 * passed straight to motion's `transition`.
 *
 * Reduced motion (`useReducedMotion()` is true) is a single `reducedMotion` object of tween
 * values; consumers pick it instead of a spring (§6.4):
 * - tilt: off, rotation stays 0 (no `tilt`, no `settleRotate`)
 * - lift: `liftScale` becomes 1; only the shadow layer's opacity tweens, over `tweenShortMs`
 * - settle, push, rubber-band return, duplicate travel, fly-back: `tweenMs`, no overshoot
 * - `pushStaggerMs`: 0
 * - ghost: follows the pointer directly; size changes instantly
 * - pop-in and delete: opacity only, over `tweenShortMs`
 * - sheet: `tweenLongMs`; toast: a `tweenMs` fade
 * - snap guide and haptic are unchanged
 */
import { clamp } from "./geometry";

export interface SpringPreset {
  type: "spring";
  stiffness: number;
  damping: number;
  mass: number;
}

/** Scale to `liftScale` and lift-layer opacity. */
export const lift: SpringPreset = { type: "spring", stiffness: 520, damping: 30, mass: 1 };
/** Rotation following drag velocity (the nail swing). */
export const tilt: SpringPreset = { type: "spring", stiffness: 200, damping: 13, mass: 1 };
/** x/y to the final spot on drop, scale back to 1, rubber-band return. */
export const settle: SpringPreset = { type: "spring", stiffness: 360, damping: 32, mass: 1 };
/** Rotation back to 0 on drop, with one small overshoot. */
export const settleRotate: SpringPreset = { type: "spring", stiffness: 260, damping: 18, mass: 1 };
/** Neighbors sliding out of the way. */
export const push: SpringPreset = { type: "spring", stiffness: 240, damping: 28, mass: 1.2 };
/** Ghost position and size (about 65 ms of lag). */
export const ghostFollow: SpringPreset = { type: "spring", stiffness: 700, damping: 46, mass: 0.6 };
/** Ghost returning to its tile. */
export const flyBack: SpringPreset = { type: "spring", stiffness: 380, damping: 32, mass: 0.8 };
/** Tap-to-add appearance (scale). */
export const popIn: SpringPreset = { type: "spring", stiffness: 460, damping: 26, mass: 1 };
/** Delete shrink. */
export const remove: SpringPreset = { type: "spring", stiffness: 600, damping: 44, mass: 0.8 };
/** Copy springing out to its free spot. */
export const duplicate: SpringPreset = { type: "spring", stiffness: 340, damping: 24, mass: 1 };
/** Sheets, segment thumb, toast entrance. */
export const sheet: SpringPreset = { type: "spring", stiffness: 400, damping: 40, mass: 1 };

export const liftScale = 1.04;
/** Degrees per px/s of horizontal velocity. */
export const tiltFactor = 0.012;
export const maxTiltDeg = 8;
export const rubberBandFactor = 0.35;
export const rubberBandMaxPx = 30;
/** Per pushed frame, nearest to the anchor first, capped at 150 ms total. */
export const pushStaggerMs = 30;
/** Use `coarse` when `matchMedia("(pointer: coarse)")` matches. */
export const snapThresholdPx = { fine: 8, coarse: 12 };
/** Passed to `navigator.vibrate?.()`, once per axis engage. */
export const snapHapticMs = 8;

/** Movement before a press becomes a drag; anything less is a tap. */
export const dragStartPx = { fine: 3, coarse: 6 };
export const ghostTouchLiftPx = 12;
export const ghostOffWallOpacity = 0.6;
export const popInFromScale = 0.6;
export const removeToScale = 0.85;
export const guideFadeInMs = 60;
export const guideFadeOutMs = 120;
export const photoModeFrameOpacity = 0.35;
export const toastMs = 5000;

/** Tween values that replace the springs under reduced motion. `ease` is a cubic-bezier. */
export const reducedMotion: {
  tweenShortMs: number;
  tweenMs: number;
  tweenLongMs: number;
  ease: [number, number, number, number];
} = { tweenShortMs: 120, tweenMs: 160, tweenLongMs: 200, ease: [0.2, 0.8, 0.2, 1] };

/**
 * Frame rotation (deg) for a horizontal drag velocity (px/s): it swings against the
 * direction of travel, up to `maxDeg`. Never returns -0.
 */
export function tiltFromVelocity(
  vxPxPerSec: number,
  factor: number = tiltFactor,
  maxDeg: number = maxTiltDeg,
): number {
  return clamp(-vxPxPerSec * factor, -maxDeg, maxDeg) + 0;
}
