import { deleteFramePhotos, downscaleImage, ImageStoreUnavailableError, listFramePhotoIds, saveFramePhoto } from "../lib/imageStore";
import { newId } from "../lib/id";
import type { Shape } from "../types";
import { framePhotoUrls } from "./framePhotoUrls";
import { safeStorage } from "./safeStorage";
import { storageEvents } from "./storageEvents";
import { usePlannerStore } from "./store";

/** Frame photo commands (spec "Storage"): upload and startup garbage collection. */

/** Frame photos are stored at most this long on their long edge, as JPEG 0.85. */
export const FRAME_PHOTO_MAX_EDGE = 1600;
const FRAME_PHOTO_QUALITY = 0.85;

/** What an upload did: the frame had no photo, had one, or was deleted (or the wall reset) meanwhile. */
export type FramePhotoUploadResult = "added" | "replaced" | "frame-gone";

const frameOf = (id: string) => usePlannerStore.getState().shapes.find((s) => s.id === id);

/**
 * Add or Replace photo on frame `id`: downscale, save under a new `imageId`, then set the photo
 * (one undo step, cover and centered). The old image stays stored so undo can bring it back. If
 * IndexedDB is unavailable the image lives in memory for this tab and an `image-session-only`
 * event says so. If the frame goes away while the photo is processed, nothing is kept. Rejects,
 * changing nothing, when the file can't be decoded (the caller shows the `photo-unreadable`
 * toast, as the wall photo's upload does).
 */
export async function uploadFramePhoto(id: string, file: Blob): Promise<FramePhotoUploadResult> {
  if (!frameOf(id)) return "frame-gone";
  const { blob, width, height } = await downscaleImage(file, FRAME_PHOTO_MAX_EDGE, FRAME_PHOTO_QUALITY);
  if (!frameOf(id)) return "frame-gone";
  const imageId = newId();
  // Remembered first, so it shows without a read and garbage collection never takes it.
  framePhotoUrls.remember(imageId, blob);
  try {
    await saveFramePhoto(imageId, blob);
  } catch (error) {
    if (!(error instanceof ImageStoreUnavailableError)) throw error;
    storageEvents.emit({ type: "image-session-only" });
  }
  const frame = frameOf(id);
  if (!frame) {
    framePhotoUrls.forget(imageId);
    await deleteFramePhotos([imageId]).catch(() => {});
    return "frame-gone";
  }
  usePlannerStore.getState().setFramePhoto(id, { imageId, aspect: height / width });
  return frame.photo ? "replaced" : "added";
}

const imageIdsOf = (shapes: readonly Shape[]) => shapes.flatMap((s) => (s.photo ? [s.photo.imageId] : []));

/** Every image a frame on the wall, an undo or redo step, or this session's uploads still use. */
function imageIdsInUse(): Set<string> {
  const { pastStates, futureStates } = usePlannerStore.temporal.getState();
  return new Set([
    ...imageIdsOf(usePlannerStore.getState().shapes),
    ...[...pastStates, ...futureStates].flatMap((step) => imageIdsOf(step.shapes ?? [])),
    ...framePhotoUrls.rememberedIds(),
  ]);
}

const hydrated = () =>
  new Promise<void>((resolve) => {
    if (usePlannerStore.persist.hasHydrated()) resolve();
    else usePlannerStore.persist.onFinishHydration(() => resolve());
  });

/**
 * Run once after hydration: deletes every stored frame photo nothing uses, since removing a photo
 * or a frame never deletes its image right away (undo may need it). Skipped when the save could
 * not be read (corrupt or storage unavailable): the wall then started empty, and the backed-up
 * save may still use every stored photo. Silent if IndexedDB fails.
 */
export async function gcFramePhotos(): Promise<void> {
  await hydrated();
  if (safeStorage.lastReadFailed()) return;
  try {
    const stored = await listFramePhotoIds();
    // Read after the list resolves, so a photo added meanwhile counts as in use.
    const inUse = imageIdsInUse();
    const orphans = stored.filter((imageId) => !inUse.has(imageId));
    if (orphans.length > 0) await deleteFramePhotos(orphans);
  } catch (error) {
    if (!(error instanceof ImageStoreUnavailableError)) throw error;
  }
}
