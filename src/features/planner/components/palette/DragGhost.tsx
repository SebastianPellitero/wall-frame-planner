import { motion, useReducedMotion } from "motion/react";
import { createPortal } from "react-dom";
import type { GhostMotion, GhostState } from "../../hooks/usePaletteDrag";
import { liftScale } from "../../lib/physics";
import { cx } from "../ui/cx";
import { FrameVisual } from "../wall/FrameVisual";

/**
 * The palette drag ghost (design-system.md §5.15): a full frame at its true on-wall size,
 * portalled to `body` at `z-ghost`. Every change during the drag is a motion value.
 */
export function DragGhost({ ghost, motion: mv, pxPerCm }: { ghost: GhostState; motion: GhostMotion; pxPerCm: number }) {
  const reduced = useReducedMotion() === true;
  const wPx = ghost.size.w * pxPerCm;
  const hPx = ghost.size.h * pxPerCm;
  const circle = ghost.kind === "circle";

  return createPortal(
    <motion.div
      aria-hidden="true"
      data-testid="drag-ghost"
      data-kind={ghost.kind}
      className="pointer-events-none fixed top-0 left-0 z-ghost"
      style={{ x: mv.x, y: mv.y, width: wPx, height: hPx, scale: mv.scale, opacity: mv.opacity }}
    >
      <motion.div className="relative size-full" style={{ scale: reduced ? 1 : liftScale }}>
        <motion.div className="relative size-full" style={{ rotate: mv.rotate, originX: 0.5, originY: 0 }}>
          <motion.div
            className={cx("pointer-events-none absolute inset-0 shadow-frame-lift", circle && "rounded-full")}
            style={{ opacity: mv.liftOpacity }}
          />
          <FrameVisual kind={ghost.kind} wCm={ghost.size.w} hCm={ghost.size.h} wPx={wPx} hPx={hPx} selected={false} hoverable={false} />
        </motion.div>
      </motion.div>
    </motion.div>,
    document.body,
  );
}
