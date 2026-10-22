import { storageEvents, type StorageEvent, type StorageEvents } from "./storageEvents";
import { showToast, type ToastInput } from "./toasts";

/** Toast copy per storage event (design-system.md §8; the Task 10 brief where §8 has none). */
export const STORAGE_COPY: Record<StorageEvent["type"], string> = {
  corrupt: "Saved data couldn't be read, so the wall started fresh. A backup was kept.",
  "write-failed": "Storage is full, so changes aren't being saved. They stay until you close this tab.",
  unavailable: "Saving is off in this browser, so changes last only for this visit.",
  "image-session-only": "Photos can't be saved in this browser. Your photo stays until you close this tab.",
  "image-missing": "Your wall photo couldn't be found. Upload it again to see it.",
  "image-unavailable": "Your wall photo couldn't be loaded right now. Reload to try again.",
  "frame-photo-missing": "A frame's photo couldn't be found, so that frame is plain again. Add the photo again to see it.",
  "frame-photo-unavailable": "A frame's photo couldn't be loaded right now. Reload to try again.",
};

/** A failed save can fire on every commit; the toast shows at most once per this window. */
export const WRITE_FAILED_THROTTLE_MS = 30_000;

/** Every storage event means progress may be lost, so each is an error toast that stays until dismissed. */
export function storageToast(e: StorageEvent): ToastInput {
  const toast: ToastInput = { key: e.type, tone: "error", message: STORAGE_COPY[e.type] };
  if (e.type === "write-failed") toast.throttleMs = WRITE_FAILED_THROTTLE_MS;
  return toast;
}

/** Turns storage events (including the ones buffered during hydration) into toasts. Returns the unsubscribe. */
export function connectStorageToasts(bus: StorageEvents = storageEvents, show: (t: ToastInput) => void = showToast): () => void {
  return bus.subscribe((e) => show(storageToast(e)));
}
