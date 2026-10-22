import { DEFAULT_WALL_COLOR } from "./lib/wallColor";
import type { Background, Grid, ShapeKind, Wall } from "./types";

export const DEFAULT_WALL: Wall = { width: 300, height: 250, pushGap: 3, color: DEFAULT_WALL_COLOR };

export const DEFAULT_GRID: Grid = {
  enabled: false,
  snap: true,
  spacingX: 10,
  spacingY: 10,
  originX: 0,
  originY: 0,
};

export const DEFAULT_BACKGROUND: Background = {
  hasImage: false,
  x: 0,
  y: 0,
  width: 300,
  aspect: 1,
  opacity: 1,
  visible: true,
};

export const DEFAULT_PALETTE_SIZES: Record<ShapeKind, { w: number; h: number }> = {
  rect: { w: 40, h: 50 },
  square: { w: 30, h: 30 },
  circle: { w: 30, h: 30 },
};

/** Smallest frame side, in cm. */
export const MIN_SIZE_CM = 1;
