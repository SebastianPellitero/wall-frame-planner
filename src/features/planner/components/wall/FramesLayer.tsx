import { AnimatePresence } from "motion/react";
import { usePlannerStore } from "../../state/store";
import { FrameNode } from "./FrameNode";
import { useWallContext } from "./WallContext";

/** Every frame on the wall. `initial={false}`: frames restored on load don't pop in. */
export function FramesLayer() {
  const { pxPerCm } = useWallContext();
  const shapes = usePlannerStore((s) => s.shapes);
  return (
    <AnimatePresence initial={false}>
      {shapes.map((shape) => (
        <FrameNode key={shape.id} shape={shape} pxPerCm={pxPerCm} />
      ))}
    </AnimatePresence>
  );
}
