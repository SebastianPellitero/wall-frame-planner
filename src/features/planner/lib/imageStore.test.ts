import { afterEach, describe, expect, it, vi } from "vitest";
import { get, set } from "idb-keyval";
import {
  deleteAllFramePhotos,
  deleteBackgroundImage,
  deleteFramePhotos,
  downscaleImage,
  fitWithin,
  listFramePhotoIds,
  loadBackgroundImage,
  loadFramePhoto,
  saveBackgroundImage,
  saveFramePhoto,
} from "./imageStore";

afterEach(() => vi.unstubAllGlobals());

describe("fitWithin", () => {
  it("keeps the aspect ratio when scaling the long edge down", () => {
    expect(fitWithin(4000, 3000, 2000)).toEqual({ w: 2000, h: 1500 });
    expect(fitWithin(3000, 6000, 2000)).toEqual({ w: 1000, h: 2000 });
  });

  it("never upscales", () => {
    expect(fitWithin(800, 600, 2560)).toEqual({ w: 800, h: 600 });
    expect(fitWithin(2560, 100, 2560)).toEqual({ w: 2560, h: 100 });
  });

  it("never returns a zero side", () => {
    expect(fitWithin(10000, 1, 100)).toEqual({ w: 100, h: 1 });
  });
});

describe("downscaleImage", () => {
  it("returns the original blob when it already fits and is small", async () => {
    const close = vi.fn();
    vi.stubGlobal("createImageBitmap", vi.fn().mockResolvedValue({ width: 1200, height: 800, close }));
    const blob = new Blob(["tiny"], { type: "image/png" });
    const out = await downscaleImage(blob);
    expect(out.blob).toBe(blob);
    expect(out).toMatchObject({ width: 1200, height: 800 });
    expect(close).toHaveBeenCalled();
  });
});

describe("background image storage", () => {
  it("round-trips save, load and delete", async () => {
    expect(await loadBackgroundImage()).toBeUndefined();
    const blob = new Blob(["photo-bytes"], { type: "image/jpeg" });
    await saveBackgroundImage(blob);
    const loaded = await loadBackgroundImage();
    // fake-indexeddb cannot structured-clone jsdom's Blob (real browsers can), so only presence is checked.
    expect(loaded).toBeDefined();
    await deleteBackgroundImage();
    expect(await loadBackgroundImage()).toBeUndefined();
  });
});

describe("frame photo storage", () => {
  const blob = () => new Blob(["frame-bytes"], { type: "image/jpeg" });

  it("saves each photo under wallplanner:frame-photo:<imageId>, and loads it back", async () => {
    expect(await loadFramePhoto("a")).toBeUndefined();
    await saveFramePhoto("a", blob());
    expect(await get("wallplanner:frame-photo:a")).toBeDefined();
    expect(await loadFramePhoto("a")).toBeDefined();
  });

  it("lists only frame photo ids, and deletes some or all of them, leaving other keys alone", async () => {
    await saveFramePhoto("b", blob());
    await saveFramePhoto("c", blob());
    await saveBackgroundImage(blob());
    await set("unrelated", 1);
    expect((await listFramePhotoIds()).sort()).toEqual(["a", "b", "c"]);

    await deleteFramePhotos(["a", "c"]);
    expect(await listFramePhotoIds()).toEqual(["b"]);
    await deleteFramePhotos([]);

    await deleteAllFramePhotos();
    expect(await listFramePhotoIds()).toEqual([]);
    expect(await loadBackgroundImage()).toBeDefined();
    expect(await get("unrelated")).toBe(1);
  });
});
