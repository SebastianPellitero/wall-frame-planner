import { useCallback, useState } from "react";
import { computePxPerCm } from "../lib/wallScale";
import type { Wall } from "../types";

type Size = { width: number; height: number };

/**
 * Watches the stage's content box (its CSS padding holds the safe-area insets that no bar or
 * rail absorbs, §4.1) and fits the wall inside it with `padding` px to spare on every side.
 * `pxPerCm` is 0 until the first measure. Attach `stageRef` to the stage element.
 */
export function useWallScale(wall: Pick<Wall, "width" | "height">, padding: number) {
  const [size, setSize] = useState<Size | null>(null);

  // A callback ref, so a new stage element (another shell after rotating) is observed too.
  const stageRef = useCallback((el: HTMLElement | null) => {
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize((prev) => (prev && prev.width === width && prev.height === height ? prev : { width, height }));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const pxPerCm = size ? computePxPerCm(size, wall, padding) : 0;
  return { stageRef, pxPerCm, wallPx: { w: wall.width * pxPerCm, h: wall.height * pxPerCm } };
}
