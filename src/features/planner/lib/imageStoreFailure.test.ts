import { describe, expect, it, vi } from "vitest";

vi.mock("idb-keyval", () => {
  const fail = () => Promise.reject(new Error("IndexedDB blocked"));
  return { get: fail, set: fail, del: fail, delMany: fail, keys: fail };
});

import {
  deleteAllFramePhotos,
  deleteBackgroundImage,
  deleteFramePhotos,
  ImageStoreUnavailableError,
  listFramePhotoIds,
  loadBackgroundImage,
  loadFramePhoto,
  saveBackgroundImage,
  saveFramePhoto,
} from "./imageStore";

describe("background image storage when IndexedDB fails", () => {
  it("wraps every failure in ImageStoreUnavailableError", async () => {
    await expect(saveBackgroundImage(new Blob(["x"]))).rejects.toBeInstanceOf(ImageStoreUnavailableError);
    await expect(loadBackgroundImage()).rejects.toBeInstanceOf(ImageStoreUnavailableError);
    await expect(deleteBackgroundImage()).rejects.toBeInstanceOf(ImageStoreUnavailableError);
  });

  it("wraps frame photo failures too", async () => {
    await expect(saveFramePhoto("a", new Blob(["x"]))).rejects.toBeInstanceOf(ImageStoreUnavailableError);
    await expect(loadFramePhoto("a")).rejects.toBeInstanceOf(ImageStoreUnavailableError);
    await expect(listFramePhotoIds()).rejects.toBeInstanceOf(ImageStoreUnavailableError);
    await expect(deleteFramePhotos(["a"])).rejects.toBeInstanceOf(ImageStoreUnavailableError);
    await expect(deleteAllFramePhotos()).rejects.toBeInstanceOf(ImageStoreUnavailableError);
  });
});
