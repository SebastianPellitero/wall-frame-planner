import { DEFAULT_BACKGROUND } from "../defaults";
import {
  deleteBackgroundImage,
  downscaleImage,
  ImageStoreUnavailableError,
  loadBackgroundImage,
  saveBackgroundImage,
} from "../lib/imageStore";
import { initialPlacement } from "../lib/photoTransform";
import { setPhotoBlob, usePhotoImage } from "./photoImage";
import { storageEvents } from "./storageEvents";
import { usePlannerStore } from "./store";

/**
 * Background photo commands shared by Photo tools and Settings > Photo (design-system.md §4.6),
 * so upload and remove have one implementation each.
 */

/**
 * Upload or Replace: downscale, save to IndexedDB, cover the wall, then enter Photo mode so the
 * user can line it up right away. If IndexedDB is unavailable the photo stays in memory for
 * this tab and an `image-session-only` event says so. Rejects (changing nothing) when the file
 * can't be decoded.
 */
export async function uploadPhoto(file: Blob): Promise<void> {
  const { blob, width, height } = await downscaleImage(file);
  try {
    await saveBackgroundImage(blob);
  } catch (error) {
    if (!(error instanceof ImageStoreUnavailableError)) throw error;
    storageEvents.emit({ type: "image-session-only" });
  }
  setPhotoBlob(blob);
  const { wall, setBackground, setMode } = usePlannerStore.getState();
  setBackground({ hasImage: true, ...initialPlacement(width, height, wall), opacity: 1, visible: true });
  setMode("photo");
}

/** Remove photo (after the confirm dialog): forget the image and reset the background to defaults. */
export async function removePhoto(): Promise<void> {
  setPhotoBlob(null);
  usePlannerStore.getState().setBackground(DEFAULT_BACKGROUND);
  try {
    await deleteBackgroundImage();
  } catch (error) {
    // Nothing was stored if IndexedDB is unavailable.
    if (!(error instanceof ImageStoreUnavailableError)) throw error;
  }
}

/**
 * Reads the saved image into memory after a reload. If the project has a photo but its image is
 * gone (storage cleared, or IndexedDB unavailable now), the photo is dropped and an
 * `image-missing` event is emitted. A photo uploaded meanwhile wins.
 */
export async function restorePhoto(): Promise<void> {
  if (!usePlannerStore.getState().background.hasImage || usePhotoImage.getState().blob) return;
  let blob: Blob | undefined;
  try {
    blob = await loadBackgroundImage();
  } catch (error) {
    if (!(error instanceof ImageStoreUnavailableError)) throw error;
  }
  if (usePhotoImage.getState().blob || !usePlannerStore.getState().background.hasImage) return;
  if (blob) {
    setPhotoBlob(blob);
    return;
  }
  usePlannerStore.getState().setBackground({ hasImage: false });
  storageEvents.emit({ type: "image-missing" });
}
