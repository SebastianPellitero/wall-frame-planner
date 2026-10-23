import type { KeyboardEvent } from "react";
import { FOCUS_STEP, FOCUS_STEP_LARGE, stepFocus, stepZoom, zoomPhotoAt, type Opening } from "../../lib/framePhoto";
import { adjustPhotoStep } from "../../state/frameCommands";
import type { FramePhoto } from "../../types";

const ARROWS: Record<string, [number, number]> = {
  ArrowRight: [-1, 0],
  ArrowLeft: [1, 0],
  ArrowUp: [0, 1],
  ArrowDown: [0, -1],
};

/**
 * Adjust mode's keys on the focused frame (design-system.md §5.17): an arrow moves the photo by
 * 0.02 of the image (Shift: 0.1) in that direction (the focus moves the opposite way), `+` / `=` and `-` zoom by 0.1 about the
 * opening's center, each clamped and one undo step per press. Returns whether the key was used.
 */
export function adjustKey(e: KeyboardEvent, id: string, photo: FramePhoto, opening: Opening): boolean {
  if (e.altKey || e.ctrlKey || e.metaKey) return false;
  const arrow = ARROWS[e.key];
  const repeat = { repeat: e.repeat };
  if (arrow) {
    const step = e.shiftKey ? FOCUS_STEP_LARGE : FOCUS_STEP;
    adjustPhotoStep(id, stepFocus(photo, arrow[0] * step, arrow[1] * step, opening), repeat);
    return true;
  }
  const dir = e.key === "+" || e.key === "=" ? 1 : e.key === "-" ? -1 : 0;
  if (dir === 0) return false;
  adjustPhotoStep(id, zoomPhotoAt(photo, stepZoom(photo.zoom, dir), opening), repeat);
  return true;
}
