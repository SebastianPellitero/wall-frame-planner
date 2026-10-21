import type { Wall } from "../types";

/**
 * Space between the stage edge and the wall, in px: the `--spacing-stage` (phones) and
 * `--spacing-stage-lg` (desktop) tokens. A unit test keeps these equal to globals.css.
 */
export const STAGE_PADDING_PX = { phone: 12, desktop: 40 } as const;

/** Largest scale at which the wall fits the stage with `padding` px on every side; 0 when nothing fits. */
export function computePxPerCm(
  stage: { width: number; height: number },
  wall: Pick<Wall, "width" | "height">,
  padding: number,
): number {
  if (!(wall.width > 0) || !(wall.height > 0)) return 0;
  const scale = Math.min((stage.width - 2 * padding) / wall.width, (stage.height - 2 * padding) / wall.height);
  return Number.isFinite(scale) && scale > 0 ? scale : 0;
}
