import { loadFramePhoto } from "../lib/imageStore";
import { storageEvents } from "./storageEvents";
import { usePlannerStore } from "./store";

export type FramePhotoStatus = "idle" | "loading" | "ready" | "failed";
export interface FramePhotoView {
  url: string | null;
  status: FramePhotoStatus;
}

export interface FramePhotoUrlDeps {
  load(imageId: string): Promise<Blob | undefined>;
  createUrl(blob: Blob): string;
  revokeUrl(url: string): void;
  /** The image is gone from storage. */
  onMissing(imageId: string): void;
  /** Storage failed while loading; the photo data stays. */
  onUnavailable(imageId: string): void;
}

interface Entry {
  refs: number;
  view: FramePhotoView;
}

export const IDLE_FRAME_PHOTO: FramePhotoView = { url: null, status: "idle" };

/**
 * Object URLs for frame photos, keyed by `imageId` and ref-counted: every mounted frame showing
 * an image holds one reference, the image is read once and its URL is shared (duplicates show the
 * same photo at once), and the URL is revoked when the last frame lets go. Images uploaded this
 * session are remembered in memory, so they show without a read and survive an IndexedDB that
 * can't store them.
 */
export function createFramePhotoUrls(deps: FramePhotoUrlDeps) {
  const entries = new Map<string, Entry>();
  const remembered = new Map<string, Blob>();
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((fn) => fn());

  const settle = (imageId: string, entry: Entry, view: FramePhotoView) => {
    // A load that finishes after its last user left (or after a reset) is dropped.
    if (entries.get(imageId) !== entry) return false;
    entry.view = view;
    notify();
    return true;
  };

  const load = (imageId: string, entry: Entry) => {
    deps.load(imageId).then(
      (blob) => {
        if (entries.get(imageId) !== entry) return;
        if (blob) {
          settle(imageId, entry, { url: deps.createUrl(blob), status: "ready" });
        } else if (settle(imageId, entry, { url: null, status: "failed" })) {
          deps.onMissing(imageId);
        }
      },
      () => {
        if (settle(imageId, entry, { url: null, status: "failed" })) deps.onUnavailable(imageId);
      },
    );
  };

  return {
    /** Keeps an uploaded image in memory for the session. */
    remember(imageId: string, blob: Blob): void {
      remembered.set(imageId, blob);
    },

    /** The ids of the images kept in memory (garbage collection keeps them). */
    rememberedIds: (): string[] => [...remembered.keys()],

    acquire(imageId: string): void {
      const existing = entries.get(imageId);
      if (existing) {
        existing.refs += 1;
        return;
      }
      const blob = remembered.get(imageId);
      const entry: Entry = { refs: 1, view: blob ? { url: deps.createUrl(blob), status: "ready" } : { url: null, status: "loading" } };
      entries.set(imageId, entry);
      notify();
      if (!blob) load(imageId, entry);
    },

    /** Lets go of one reference. The URL is revoked a microtask later, so a remount in the same tick keeps it. */
    release(imageId: string): void {
      const entry = entries.get(imageId);
      if (!entry) return;
      entry.refs -= 1;
      queueMicrotask(() => {
        if (entry.refs > 0 || entries.get(imageId) !== entry) return;
        entries.delete(imageId);
        if (entry.view.url) deps.revokeUrl(entry.view.url);
        notify();
      });
    },

    /** The image's URL and load state; a stable object until it changes. */
    snapshot: (imageId: string): FramePhotoView => entries.get(imageId)?.view ?? IDLE_FRAME_PHOTO,

    subscribe(fn: () => void): () => void {
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
      };
    },

    /** Reset wall: revokes every URL and forgets every remembered image. */
    clear(): void {
      for (const entry of entries.values()) if (entry.view.url) deps.revokeUrl(entry.view.url);
      entries.clear();
      remembered.clear();
      notify();
    },
  };
}

export type FramePhotoUrls = ReturnType<typeof createFramePhotoUrls>;

/**
 * The app's cache. A missing image is removed from every frame using it (not an undo step) with a
 * `frame-photo-missing` toast; a transient failure keeps the photo data and says
 * `frame-photo-unavailable` (spec "Failures").
 */
export const framePhotoUrls: FramePhotoUrls = createFramePhotoUrls({
  load: loadFramePhoto,
  createUrl: (blob) => URL.createObjectURL(blob),
  revokeUrl: (url) => URL.revokeObjectURL(url),
  onMissing(imageId) {
    usePlannerStore.getState().forgetFramePhoto(imageId);
    storageEvents.emit({ type: "frame-photo-missing" });
  },
  onUnavailable: () => storageEvents.emit({ type: "frame-photo-unavailable" }),
});
