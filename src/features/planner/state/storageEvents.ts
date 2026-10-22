export type StorageEvent =
  | { type: "corrupt"; backupKey: string }
  | { type: "write-failed"; error: unknown }
  | { type: "unavailable" }
  /** The photo could not be saved to IndexedDB; it is kept in memory for this tab only. */
  | { type: "image-session-only" }
  /** The project says there is a photo, but its image is gone (storage cleared); the photo was reset. */
  | { type: "image-missing" };

type Listener = (e: StorageEvent) => void;

const listeners = new Set<Listener>();

export const storageEvents: { emit(e: StorageEvent): void; subscribe(fn: Listener): () => void } = {
  emit(e) {
    for (const fn of [...listeners]) fn(e);
  },
  subscribe(fn) {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  },
};
