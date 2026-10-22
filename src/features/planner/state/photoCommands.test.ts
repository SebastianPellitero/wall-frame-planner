import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../lib/imageStore", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/imageStore")>();
  return {
    ...actual,
    downscaleImage: vi.fn(),
    saveBackgroundImage: vi.fn(),
    loadBackgroundImage: vi.fn(),
    deleteBackgroundImage: vi.fn(),
  };
});

import { DEFAULT_BACKGROUND } from "../defaults";
import * as imageStore from "../lib/imageStore";
import { ImageStoreUnavailableError } from "../lib/imageStore";
import { initialProject, initialUi } from "./actions";
import { removePhoto, restorePhoto, uploadPhoto } from "./photoCommands";
import { usePhotoImage } from "./photoImage";
import { storageEvents, type StorageEvent } from "./storageEvents";
import { usePlannerStore } from "./store";

const mocked = vi.mocked(imageStore);
const file = new File(["raw"], "wall.jpg", { type: "image/jpeg" });
const small = new Blob(["small"], { type: "image/jpeg" });

function listen() {
  const events: StorageEvent[] = [];
  const off = storageEvents.subscribe((e) => events.push(e));
  return { events, off };
}

beforeEach(() => {
  vi.resetAllMocks();
  usePlannerStore.setState({ ...initialProject(), ...initialUi });
  usePhotoImage.setState({ blob: null });
});

describe("uploadPhoto", () => {
  it("downscales, saves, places the photo to cover the wall and enters Photo mode", async () => {
    const calls: string[] = [];
    mocked.downscaleImage.mockImplementation(async () => {
      calls.push("downscale");
      return { blob: small, width: 2000, height: 1000 };
    });
    mocked.saveBackgroundImage.mockImplementation(async () => void calls.push("save"));
    usePlannerStore.setState({ background: { ...DEFAULT_BACKGROUND, opacity: 0.3, visible: false } });

    await uploadPhoto(file);

    expect(calls).toEqual(["downscale", "save"]);
    expect(mocked.downscaleImage).toHaveBeenCalledWith(file);
    expect(mocked.saveBackgroundImage).toHaveBeenCalledWith(small);
    const s = usePlannerStore.getState();
    expect(s.background).toEqual({ hasImage: true, x: -100, y: 0, width: 500, aspect: 0.5, opacity: 1, visible: true });
    expect(s.mode).toBe("photo");
    expect(usePhotoImage.getState().blob).toBe(small);
  });

  it("keeps the photo for the session and says so when IndexedDB is unavailable", async () => {
    mocked.downscaleImage.mockResolvedValue({ blob: small, width: 600, height: 500 });
    mocked.saveBackgroundImage.mockRejectedValue(new ImageStoreUnavailableError());
    const { events, off } = listen();
    await uploadPhoto(file);
    off();
    expect(events).toEqual([{ type: "image-session-only" }]);
    expect(usePlannerStore.getState().background.hasImage).toBe(true);
    expect(usePhotoImage.getState().blob).toBe(small);
  });

  it("changes nothing when the file can't be decoded", async () => {
    mocked.downscaleImage.mockRejectedValue(new Error("not an image"));
    await expect(uploadPhoto(file)).rejects.toThrow("not an image");
    expect(usePlannerStore.getState().background).toEqual(DEFAULT_BACKGROUND);
    expect(usePlannerStore.getState().mode).toBe("arrange");
  });
});

describe("removePhoto", () => {
  it("deletes the stored image and resets the background", async () => {
    usePlannerStore.setState({ background: { ...DEFAULT_BACKGROUND, hasImage: true, x: 5, opacity: 0.4 } });
    usePhotoImage.setState({ blob: small });
    mocked.deleteBackgroundImage.mockResolvedValue();
    await removePhoto();
    expect(mocked.deleteBackgroundImage).toHaveBeenCalledOnce();
    expect(usePlannerStore.getState().background).toEqual(DEFAULT_BACKGROUND);
    expect(usePhotoImage.getState().blob).toBeNull();
  });

  it("still resets when IndexedDB is unavailable", async () => {
    usePlannerStore.setState({ background: { ...DEFAULT_BACKGROUND, hasImage: true } });
    mocked.deleteBackgroundImage.mockRejectedValue(new ImageStoreUnavailableError());
    await removePhoto();
    expect(usePlannerStore.getState().background).toEqual(DEFAULT_BACKGROUND);
  });
});

describe("restorePhoto", () => {
  it("loads the stored image into memory", async () => {
    usePlannerStore.setState({ background: { ...DEFAULT_BACKGROUND, hasImage: true, x: 7 } });
    mocked.loadBackgroundImage.mockResolvedValue(small);
    await restorePhoto();
    expect(usePhotoImage.getState().blob).toBe(small);
    expect(usePlannerStore.getState().background.x).toBe(7);
  });

  it("does nothing without a photo or when the image is already in memory", async () => {
    await restorePhoto();
    usePlannerStore.setState({ background: { ...DEFAULT_BACKGROUND, hasImage: true } });
    usePhotoImage.setState({ blob: small });
    await restorePhoto();
    expect(mocked.loadBackgroundImage).not.toHaveBeenCalled();
  });

  it.each([
    ["the image is gone", () => mocked.loadBackgroundImage.mockResolvedValue(undefined)],
    ["IndexedDB is unavailable", () => mocked.loadBackgroundImage.mockRejectedValue(new ImageStoreUnavailableError())],
  ])("drops the photo and reports image-missing when %s", async (_, arrange) => {
    arrange();
    usePlannerStore.setState({ background: { ...DEFAULT_BACKGROUND, hasImage: true, x: 7 } });
    const { events, off } = listen();
    await restorePhoto();
    off();
    expect(usePlannerStore.getState().background.hasImage).toBe(false);
    expect(events).toEqual([{ type: "image-missing" }]);
  });

  it("keeps a photo uploaded while the load was in flight", async () => {
    let resolve!: (b: Blob | undefined) => void;
    mocked.loadBackgroundImage.mockReturnValue(new Promise((r) => (resolve = r)));
    usePlannerStore.setState({ background: { ...DEFAULT_BACKGROUND, hasImage: true } });
    const pending = restorePhoto();
    const fresh = new Blob(["fresh"]);
    usePhotoImage.setState({ blob: fresh });
    resolve(undefined);
    await pending;
    expect(usePhotoImage.getState().blob).toBe(fresh);
    expect(usePlannerStore.getState().background.hasImage).toBe(true);
  });
});
