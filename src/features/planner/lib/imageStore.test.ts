import { afterEach, describe, expect, it, vi } from "vitest";
import {
  deleteBackgroundImage,
  downscaleImage,
  fitWithin,
  loadBackgroundImage,
  saveBackgroundImage,
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
