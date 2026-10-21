import { AnimatePresence, motion } from "motion/react";
import { guideFadeInMs, guideFadeOutMs, tween } from "../../lib/physics";
import { useDragUi } from "../../state/dragUi";
import { useWallContext } from "./WallContext";

/**
 * Laser guides for the axes the current drag snapped to (design-system.md §5.12): 2px lines
 * across the whole wall, clipped to it, drawn above the dragged frame so a center guide shows.
 */
export function SnapGuides() {
  const { pxPerCm } = useWallContext();
  const guides = useDragUi((s) => s.guides);
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-guides-live overflow-hidden">
      <AnimatePresence>
        {guides.map((g) => (
          <motion.div
            key={`${g.axis}:${g.position}`}
            data-testid="snap-guide"
            data-axis={g.axis}
            className={g.axis === "x" ? "absolute inset-y-0 -ml-px w-0.5 bg-laser shadow-laser" : "absolute inset-x-0 -mt-px h-0.5 bg-laser shadow-laser"}
            style={g.axis === "x" ? { left: g.position * pxPerCm } : { top: g.position * pxPerCm }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: tween(guideFadeInMs) }}
            exit={{ opacity: 0, transition: tween(guideFadeOutMs) }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
