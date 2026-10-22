/**
 * The stacked bottom sheet's header drag (design-system.md §5.6): what a release does, and
 * how far the sheet follows the finger. Pure; the sheet component feeds it px and px/s.
 */
import { rubberBand } from "./geometry";
import { rubberBandFactor, rubberBandMaxPx } from "./physics";

/** Dragged down past this fraction of the sheet's height, a release closes it. */
export const SHEET_DISMISS_FRACTION = 0.25;
/** A release faster than this (px/s) is a flick: down closes, up expands. */
export const SHEET_FLICK_PX_PER_S = 500;
/** Dragged up this far (finger travel, px), a release expands the sheet from 60dvh to 85dvh. */
export const SHEET_EXPAND_PX = 48;

export type SheetRelease = "close" | "expand" | "rest";

export interface SheetReleaseInput {
  /** Finger travel since the press, px; positive is down. */
  offsetPx: number;
  /** Release velocity, px/s; positive is down. */
  velocityPxPerS: number;
  /** The sheet's height on screen, px. */
  heightPx: number;
  expanded: boolean;
}

export function sheetRelease({ offsetPx, velocityPxPerS, heightPx, expanded }: SheetReleaseInput): SheetRelease {
  if (!(heightPx > 0)) return "rest";
  if (offsetPx > 0 && (offsetPx > heightPx * SHEET_DISMISS_FRACTION || velocityPxPerS > SHEET_FLICK_PX_PER_S)) return "close";
  if (!expanded && (offsetPx < -SHEET_EXPAND_PX || (offsetPx < 0 && velocityPxPerS < -SHEET_FLICK_PX_PER_S))) return "expand";
  return "rest";
}

/** Where the sheet is drawn for a finger travel: 1:1 downward, rubber-banded upward (§6.2 curve). */
export function sheetDragOffset(offsetPx: number): number {
  return offsetPx >= 0 ? offsetPx : -rubberBand(-offsetPx, rubberBandFactor, rubberBandMaxPx);
}
