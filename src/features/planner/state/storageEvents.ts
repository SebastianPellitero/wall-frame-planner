export type StorageEvent =
  | { type: "corrupt"; backupKey: string }
  | { type: "write-failed"; error: unknown }
  | { type: "unavailable" };

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
