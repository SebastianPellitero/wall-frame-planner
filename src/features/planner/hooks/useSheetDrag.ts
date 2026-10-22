import { animate, type MotionValue } from "motion/react";
import { useLayoutEffect, useRef, type PointerEvent } from "react";
import { sheetDragOffset, sheetRelease } from "../lib/sheetGesture";
import type { SpringPreset, TweenPreset } from "../lib/physics";

interface SheetDragOptions {
  /** The sheet's vertical offset, px (0 = open). Only this changes during the drag. */
  offset: MotionValue<number>;
  /** The sheet's current height on screen, px. */
  heightPx(): number;
  expanded: boolean;
  /** How the sheet springs back to rest (`sheet`, or a tween under reduced motion). */
  transition: SpringPreset | TweenPreset;
  onClose(): void;
  /** Before the sheet grows; receives the offset it was drawn at on release. */
  onExpand(releasedAtPx: number): void;
}

/**
 * Drag-to-dismiss from the bottom sheet's header (design-system.md §5.6), with Pointer Events
 * so mouse, touch and pen share one path. Down follows the finger, up rubber-bands; a release
 * closes, expands or springs back (`sheetRelease`). `pointercancel` counts as a release.
 * Presses on the header's buttons (Close) stay plain clicks.
 */
export function useSheetDrag({ offset, heightPx, expanded, transition, onClose, onExpand }: SheetDragOptions) {
  const latest = useRef({ heightPx, expanded, transition, onClose, onExpand });
  useLayoutEffect(() => {
    latest.current = { heightPx, expanded, transition, onClose, onExpand };
  });

  const onPointerDown = (e: PointerEvent<HTMLElement>) => {
    if (!e.isPrimary || e.button !== 0 || (e.target as Element).closest("button")) return;
    const el = e.currentTarget;
    const pointerId = e.pointerId;
    const startY = e.clientY;
    let travel = 0;
    el.setPointerCapture(pointerId);
    offset.stop();

    const onMove = (ev: globalThis.PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      travel = ev.clientY - startY;
      offset.set(sheetDragOffset(travel));
    };
    const onEnd = (ev: globalThis.PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onEnd);
      el.removeEventListener("pointercancel", onEnd);
      if (el.hasPointerCapture(pointerId)) el.releasePointerCapture(pointerId);
      const { heightPx: measure, expanded: isExpanded, transition: t, onClose: close, onExpand: expand } = latest.current;
      const release = sheetRelease({ offsetPx: travel, velocityPxPerS: offset.getVelocity(), heightPx: measure(), expanded: isExpanded });
      if (release === "close") close();
      else if (release === "expand") expand(offset.get());
      else animate(offset, 0, t);
    };
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onEnd);
    el.addEventListener("pointercancel", onEnd);
  };

  return { onPointerDown };
}
