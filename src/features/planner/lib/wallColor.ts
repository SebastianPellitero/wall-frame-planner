/**
 * Wall paint (design-system.md §5.18, §5.19). The store keeps a `#rrggbb` hex, so the swatches
 * live here as data: the one documented exception to "tokens only".
 */

export interface WallSwatch {
  name: string;
  hex: string;
}

/** The default wall paint, equal to the `wall-paint` token's default. */
export const DEFAULT_WALL_COLOR = "#f4f5f1";

/** Light to dark; the order is the radio group's grid order. */
export const WALL_SWATCHES: readonly WallSwatch[] = [
  { name: "Gallery white", hex: DEFAULT_WALL_COLOR },
  { name: "Warm linen", hex: "#ebe3d3" },
  { name: "Plaster pink", hex: "#e6cdc1" },
  { name: "Pale sage", hex: "#d3dbcb" },
  { name: "Mist blue", hex: "#cdd7dd" },
  { name: "Stone", hex: "#a9a79f" },
  { name: "Forest green", hex: "#2f4a3f" },
  { name: "Charcoal", hex: "#34383b" },
];

/** Relative luminance at and above which a wall is light (§5.19): where `ink` and `on-inverse` tie. */
export const LIGHT_WALL_LUMINANCE = 0.2;

const HEX = /^#[0-9a-f]{6}$/i;

export const isHexColor = (v: unknown): v is string => typeof v === "string" && HEX.test(v);

/** WCAG relative luminance of a `#rrggbb` color, 0 (black) to 1 (white). */
export function relativeLuminance(hex: string): number {
  const channel = (i: number) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

/** Whether a wall of this color takes the light-wall set (dark ink) of §5.19. */
export const isLightColor = (hex: string): boolean => relativeLuminance(hex) >= LIGHT_WALL_LUMINANCE;
