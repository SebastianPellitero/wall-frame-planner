import { describe, expect, it, vi } from "vitest";

vi.mock("idb-keyval", () => {
  const fail = () => Promise.reject(new Error("IndexedDB blocked"));
  return { get: fail, set: fail, del: fail };
});

import {
  deleteBackgroundImage,
  ImageStoreUnavailableError,
  loadBackgroundImage,
  saveBackgroundImage,
} from "./imageStore";

describe("background image storage when IndexedDB fails", () => {
  it("wraps every failure in ImageStoreUnavailableError", async () => {
    await expect(saveBackgroundImage(new Blob(["x"]))).rejects.toBeInstanceOf(ImageStoreUnavailableError);
    await expect(loadBackgroundImage()).rejects.toBeInstanceOf(ImageStoreUnavailableError);
    await expect(deleteBackgroundImage()).rejects.toBeInstanceOf(ImageStoreUnavailableError);
  });
});
