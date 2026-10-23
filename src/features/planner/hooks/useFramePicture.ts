import { useMemo } from "react";
import { openingBox } from "../lib/frameLook";
import { photoLayout, zoomPhotoAt } from "../lib/framePhoto";
import { useSelectionUi } from "../state/selectionUi";
import type { Shape } from "../types";
import { useAdjustGesture } from "./useAdjustGesture";
import { useFramePhotoUrl } from "./useFramePhotoUrl";
import { usePhotoMotion } from "./usePhotoMotion";

const NO_LAYOUT = { width: 0, height: 0, left: 0, top: 0 };

/**
 * Everything a frame needs to show its photo (design-system.md §3.8, §5.17): the shared object
 * URL and its load state, the opening box, the layout motion values (following the store, or
 * the Zoom slider's live value while adjusting) and adjust mode's pointer gesture.
 *
 * `state`: "none" (no photo), "loading" (also the hook's first, idle render, so the frame
 * never flashes plain), "ready", or "failed" (plain-frame rules, the photo data is kept).
 */
export function useFramePicture(shape: Shape, wPx: number, hPx: number) {
  const photo = shape.photo;
  const { url, status } = useFramePhotoUrl(photo?.imageId);
  const adjusting = useSelectionUi((s) => s.adjustingId === shape.id && photo !== undefined);
  const previewZoom = useSelectionUi((s) => (s.adjustingId === shape.id ? s.previewZoom : null));
  const opening = useMemo(() => openingBox(wPx, hPx, shape.mat), [wPx, hPx, shape.mat]);

  const target = useMemo(() => {
    if (!photo) return NO_LAYOUT;
    const crop = previewZoom === null ? photo : { ...photo, ...zoomPhotoAt(photo, previewZoom, opening) };
    return photoLayout(opening.w, opening.h, crop);
  }, [photo, previewZoom, opening]);
  const motion = usePhotoMotion(target, `${photo?.imageId}|${opening.w}|${opening.h}`, previewZoom !== null);
  const gesture = useAdjustGesture({ id: shape.id, enabled: adjusting, opening, motion });

  const state = !photo ? "none" : status === "ready" && url ? "ready" : status === "failed" ? "failed" : "loading";
  return { state, url: state === "ready" ? url : null, opening, motion, adjusting, gesture } as const;
}
