/**
 * Frame photo crop geometry (design-system.md §3.8, §5.17). All sizes are screen px of the
 * opening; the photo is stored resolution-free (zoom and a focus point), so the same crop holds
 * at any wall scale.
 */
import type { FramePhoto, Point } from "../types";
import { clamp, rubberBandPosition } from "./geometry";
import { rubberBandFactor, rubberBandMaxPx } from "./physics";

export type PhotoCrop = Pick<FramePhoto, "aspect" | "zoom" | "focusX" | "focusY">;
export type Focus = Pick<FramePhoto, "focusX" | "focusY">;
export interface Opening {
  w: number;
  h: number;
}

export const ZOOM_MIN = 1;
export const ZOOM_MAX = 4;
/** `+` / `-` in adjust mode. */
export const ZOOM_STEP = 0.1;
/** Arrow keys in adjust mode, as a fraction of the image; Shift uses the large step. */
export const FOCUS_STEP = 0.02;
export const FOCUS_STEP_LARGE = 0.1;

const round2 = (v: number) => Math.round(v * 100) / 100;

/**
 * The image's drawn size: `zoom` × the size that just covers the opening. Defensive, so the
 * no-empty-band guarantee holds here whatever the caller passes: zoom is clamped to 1–4 and a
 * non-positive or non-finite aspect is treated as square.
 */
function drawnSize(openingW: number, openingH: number, photo: PhotoCrop): { width: number; height: number } {
  const aspect = Number.isFinite(photo.aspect) && photo.aspect > 0 ? photo.aspect : 1;
  const zoom = Number.isFinite(photo.zoom) ? clamp(photo.zoom, ZOOM_MIN, ZOOM_MAX) : ZOOM_MIN;
  const coverW = Math.max(openingW, openingH / aspect);
  return { width: coverW * zoom, height: coverW * aspect * zoom };
}

/** The focus range that keeps the opening covered (no empty band). */
export function focusBounds(photo: PhotoCrop, opening: Opening): { minX: number; maxX: number; minY: number; maxY: number } {
  const { width, height } = drawnSize(opening.w, opening.h, photo);
  const halfX = width > 0 ? Math.min(0.5, opening.w / (2 * width)) : 0.5;
  const halfY = height > 0 ? Math.min(0.5, opening.h / (2 * height)) : 0.5;
  return { minX: halfX, maxX: 1 - halfX, minY: halfY, maxY: 1 - halfY };
}

/** The focus actually shown: the stored one, clamped into `focusBounds`. */
export function clampFocus(photo: PhotoCrop, opening: Opening): Focus {
  const b = focusBounds(photo, opening);
  return { focusX: clamp(photo.focusX, b.minX, b.maxX), focusY: clamp(photo.focusY, b.minY, b.maxY) };
}

/** Size and offset of the `<img>` inside an opening of `openingW` × `openingH` px: cover, zoomed, focus centered, clamped. */
export function photoLayout(
  openingW: number,
  openingH: number,
  photo: PhotoCrop,
): { width: number; height: number; left: number; top: number } {
  const { width, height } = drawnSize(openingW, openingH, photo);
  const { focusX, focusY } = clampFocus(photo, { w: openingW, h: openingH });
  return { width, height, left: openingW / 2 - focusX * width, top: openingH / 2 - focusY * height };
}

/** Drag by (dx, dy) px: the image follows the pointer. Starts from the visible crop and is clamped. */
export function panFocus(photo: PhotoCrop, dxPx: number, dyPx: number, opening: Opening): Focus {
  const { width, height } = drawnSize(opening.w, opening.h, photo);
  const start = clampFocus(photo, opening);
  return clampFocus(
    {
      ...photo,
      focusX: width > 0 ? start.focusX - dxPx / width : start.focusX,
      focusY: height > 0 ? start.focusY - dyPx / height : start.focusY,
    },
    opening,
  );
}

/**
 * The live layout while dragging by (dx, dy) px (§5.17, §6.3): the image follows the pointer 1:1
 * from the visible crop, and past the no-empty-band clamp it rubber-bands per axis (§6.2 curve,
 * in image px). The commit is `panFocus`, which clamps; the band springs back on release.
 */
export function rubberPanLayout(photo: PhotoCrop, dxPx: number, dyPx: number, opening: Opening): ReturnType<typeof photoLayout> {
  const base = photoLayout(opening.w, opening.h, photo);
  const band = (pos: number, size: number, room: number) =>
    rubberBandPosition(pos, Math.min(0, room - size), 0, rubberBandFactor, rubberBandMaxPx);
  return { ...base, left: band(base.left + dxPx, base.width, opening.w), top: band(base.top + dyPx, base.height, opening.h) };
}

/** Tap to center (WCAG 2.5.7): the image point under `point` (px from the opening's top-left) moves to the center, clamped. */
export function centerFocusOn(photo: PhotoCrop, point: Point, opening: Opening): Focus {
  const l = photoLayout(opening.w, opening.h, photo);
  return clampFocus(
    {
      ...photo,
      focusX: l.width > 0 ? (point.x - l.left) / l.width : photo.focusX,
      focusY: l.height > 0 ? (point.y - l.top) / l.height : photo.focusY,
    },
    opening,
  );
}

/**
 * Sets `zoom` (clamped 1–4), keeping the image point under `point` in place: the pinch midpoint,
 * or the opening's center by default (the Zoom slider). The focus is re-clamped for the new zoom.
 */
export function zoomPhotoAt(photo: PhotoCrop, zoom: number, opening: Opening, point?: Point): Pick<FramePhoto, "zoom" | "focusX" | "focusY"> {
  const nextZoom = clamp(zoom, ZOOM_MIN, ZOOM_MAX);
  const at = point ?? { x: opening.w / 2, y: opening.h / 2 };
  const before = photoLayout(opening.w, opening.h, photo);
  const after = drawnSize(opening.w, opening.h, { ...photo, zoom: nextZoom });
  const u = before.width > 0 ? (at.x - before.left) / before.width : 0.5;
  const v = before.height > 0 ? (at.y - before.top) / before.height : 0.5;
  // The image's new left edge keeps u under at.x; the focus is the image point at the center.
  const focusX = after.width > 0 ? (opening.w / 2 - (at.x - u * after.width)) / after.width : photo.focusX;
  const focusY = after.height > 0 ? (opening.h / 2 - (at.y - v * after.height)) / after.height : photo.focusY;
  return { zoom: nextZoom, ...clampFocus({ ...photo, zoom: nextZoom, focusX, focusY }, opening) };
}

/** Arrow keys: moves the visible focus by (dx, dy) fractions of the image, clamped. */
export function stepFocus(photo: PhotoCrop, dx: number, dy: number, opening: Opening): Focus {
  const start = clampFocus(photo, opening);
  return clampFocus({ ...photo, focusX: start.focusX + dx, focusY: start.focusY + dy }, opening);
}

/** `+` / `-`: one zoom step in direction `dir` (1 or −1), clamped 1–4. */
export const stepZoom = (zoom: number, dir: 1 | -1): number => clamp(round2(zoom + dir * ZOOM_STEP), ZOOM_MIN, ZOOM_MAX);
