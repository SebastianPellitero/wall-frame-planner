export type StorageEvent =
  | { type: "corrupt"; backupKey: string }
  | { type: "write-failed"; error: unknown }
  | { type: "unavailable" }
  /** The photo could not be saved to IndexedDB; it is kept in memory for this tab only. */
  | { type: "image-session-only" }
  /** The project says there is a photo, but its image is gone (storage cleared); the photo was reset. */
  | { type: "image-missing" }
  /** IndexedDB failed while loading the photo; the photo and its placement are kept for a later reload. */
  | { type: "image-unavailable" };

type Listener = (e: StorageEvent) => void;

export interface StorageEvents {
  emit(e: StorageEvent): void;
  subscribe(fn: Listener): () => void;
}

/**
 * A tiny event bus. `corrupt` and `unavailable` fire while the store hydrates, before any UI
 * subscribes, so events are buffered until the first subscriber and replayed to it in order;
 * after that they are delivered live (and dropped while nobody listens).
 */
export function createStorageEvents(): StorageEvents {
  const listeners = new Set<Listener>();
  let buffer: StorageEvent[] | null = [];
  return {
    emit(e) {
      if (buffer) buffer.push(e);
      else for (const fn of [...listeners]) fn(e);
    },
    subscribe(fn) {
      listeners.add(fn);
      if (buffer) {
        const early = buffer;
        buffer = null;
        for (const e of early) fn(e);
      }
      return () => {
        listeners.delete(fn);
      };
    },
  };
}

export const storageEvents: StorageEvents = createStorageEvents();
