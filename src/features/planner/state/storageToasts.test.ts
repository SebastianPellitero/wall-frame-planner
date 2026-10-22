import { describe, expect, it } from "vitest";
import { createStorageEvents } from "./storageEvents";
import { connectStorageToasts, STORAGE_COPY, storageToast } from "./storageToasts";
import type { ToastInput } from "./toasts";

describe("storageToast", () => {
  it("uses the §8 copy where it is defined, the brief's otherwise", () => {
    expect(STORAGE_COPY).toEqual({
      corrupt: "Saved data couldn't be read, so the wall started fresh. A backup was kept.",
      "write-failed": "Storage is full, so changes aren't being saved. They stay until you close this tab.",
      unavailable: "Saving is off in this browser, so changes last only for this visit.",
      "image-session-only": "Photos can't be saved in this browser. Your photo stays until you close this tab.",
      "image-missing": "Your wall photo couldn't be found. Upload it again to see it.",
      "image-unavailable": "Your wall photo couldn't be loaded right now. Reload to try again.",
      "frame-photo-missing": "A frame's photo couldn't be found, so that frame is plain again. Add the photo again to see it.",
      "frame-photo-unavailable": "A frame's photo couldn't be loaded right now. Reload to try again.",
    });
  });

  it("maps every storage problem to an error toast keyed by the event type", () => {
    expect(storageToast({ type: "corrupt", backupKey: "k" })).toEqual({ key: "corrupt", tone: "error", message: STORAGE_COPY.corrupt });
    expect(storageToast({ type: "image-missing" })).toMatchObject({ key: "image-missing", tone: "error" });
    // Several frames can share a missing image; one toast (same key) covers them.
    expect(storageToast({ type: "frame-photo-missing" })).toMatchObject({ key: "frame-photo-missing", tone: "error" });
    expect(storageToast({ type: "frame-photo-unavailable" })).toMatchObject({ key: "frame-photo-unavailable", tone: "error" });
  });

  it("throttles write-failed to once per 30 s, since it can fire on every commit", () => {
    expect(storageToast({ type: "write-failed", error: new Error("quota") }).throttleMs).toBe(30_000);
    expect(storageToast({ type: "unavailable" }).throttleMs).toBeUndefined();
  });
});

describe("connectStorageToasts", () => {
  it("shows early (buffered) events and later ones", () => {
    const bus = createStorageEvents();
    bus.emit({ type: "corrupt", backupKey: "k" });
    const shown: ToastInput[] = [];
    const off = connectStorageToasts(bus, (t) => shown.push(t));
    bus.emit({ type: "unavailable" });
    expect(shown.map((t) => t.key)).toEqual(["corrupt", "unavailable"]);
    off();
    bus.emit({ type: "image-missing" });
    expect(shown).toHaveLength(2);
  });
});
