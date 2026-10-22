import { deleteAllFramePhotos } from "../lib/imageStore";
import { framePhotoUrls } from "./framePhotoUrls";
import { removePhoto } from "./photoCommands";
import { usePlannerStore } from "./store";
import { showToast } from "./toasts";

/**
 * Reset wall (after the confirm dialog, design-system.md §5.11): removes the photo (its image in
 * memory and in IndexedDB) and every frame photo, then puts frames, wall size and color, push gap,
 * grid, palette sizes and the undo history back to a fresh start, and says so in a short toast.
 * Irreversible.
 */
export async function resetWall(): Promise<void> {
  // Best effort: the wall resets even if the stored images can't be deleted.
  const removing = Promise.all([removePhoto().catch(() => {}), deleteAllFramePhotos().catch(() => {})]);
  usePlannerStore.getState().resetProject();
  framePhotoUrls.clear();
  showToast({ key: "wall-reset", tone: "info", message: "Wall reset." });
  await removing;
}
