import { beforeEach, describe, expect, it, vi } from "vitest";
import { ImageStoreUnavailableError } from "../lib/imageStore";
import { createFramePhotoUrls, type FramePhotoUrlDeps } from "./framePhotoUrls";

const flush = () => new Promise((r) => setTimeout(r, 0));
const blob = (name = "img") => new Blob([name], { type: "image/jpeg" });

let deps: { [K in keyof FramePhotoUrlDeps]: ReturnType<typeof vi.fn> };
let urls: ReturnType<typeof createFramePhotoUrls>;
let n = 0;

beforeEach(() => {
  n = 0;
  deps = {
    load: vi.fn(async () => blob()),
    createUrl: vi.fn(() => `blob:${++n}`),
    revokeUrl: vi.fn(),
    onMissing: vi.fn(),
    onUnavailable: vi.fn(),
  };
  urls = createFramePhotoUrls(deps as unknown as FramePhotoUrlDeps);
});

describe("framePhotoUrls", () => {
  it("is idle for an image nobody uses", () => {
    expect(urls.snapshot("a")).toEqual({ url: null, status: "idle" });
  });

  it("loads once and shares one URL between every frame using the image", async () => {
    urls.acquire("a");
    expect(urls.snapshot("a")).toEqual({ url: null, status: "loading" });
    urls.acquire("a");
    await flush();
    expect(urls.snapshot("a")).toEqual({ url: "blob:1", status: "ready" });
    expect(deps.load).toHaveBeenCalledTimes(1);
    expect(deps.load).toHaveBeenCalledWith("a");
    expect(deps.createUrl).toHaveBeenCalledTimes(1);
  });

  it("revokes the URL when the last user releases it", async () => {
    urls.acquire("a");
    urls.acquire("a");
    await flush();
    urls.release("a");
    await flush();
    expect(deps.revokeUrl).not.toHaveBeenCalled();
    urls.release("a");
    await flush();
    expect(deps.revokeUrl).toHaveBeenCalledWith("blob:1");
    expect(urls.snapshot("a").status).toBe("idle");
  });

  it("keeps the URL through a release and re-acquire in the same tick (a remount)", async () => {
    urls.acquire("a");
    await flush();
    urls.release("a");
    urls.acquire("a");
    await flush();
    expect(deps.revokeUrl).not.toHaveBeenCalled();
    expect(deps.load).toHaveBeenCalledTimes(1);
    expect(urls.snapshot("a").url).toBe("blob:1");
  });

  it("uses a remembered (uploaded) image without reading storage", () => {
    const uploaded = blob("fresh");
    urls.remember("a", uploaded);
    urls.acquire("a");
    expect(deps.load).not.toHaveBeenCalled();
    expect(deps.createUrl).toHaveBeenCalledWith(uploaded);
    expect(urls.snapshot("a")).toEqual({ url: "blob:1", status: "ready" });
    expect(urls.rememberedIds()).toEqual(["a"]);
  });

  it("forget drops a remembered image", () => {
    urls.remember("a", blob());
    urls.forget("a");
    expect(urls.rememberedIds()).toEqual([]);
  });

  it("reports a missing image and marks it failed", async () => {
    deps.load.mockResolvedValue(undefined);
    urls.acquire("a");
    await flush();
    expect(urls.snapshot("a")).toEqual({ url: null, status: "failed" });
    expect(deps.onMissing).toHaveBeenCalledWith("a");
    expect(deps.onUnavailable).not.toHaveBeenCalled();
  });

  it("reports a transient load failure without calling it missing", async () => {
    deps.load.mockRejectedValue(new ImageStoreUnavailableError());
    urls.acquire("a");
    await flush();
    expect(urls.snapshot("a")).toEqual({ url: null, status: "failed" });
    expect(deps.onUnavailable).toHaveBeenCalledWith("a");
    expect(deps.onMissing).not.toHaveBeenCalled();
  });

  it("drops a load that resolves after its last user left", async () => {
    let resolve!: (b: Blob) => void;
    deps.load.mockReturnValue(new Promise((r) => (resolve = r)));
    urls.acquire("a");
    urls.release("a");
    await flush();
    resolve(blob());
    await flush();
    expect(deps.createUrl).not.toHaveBeenCalled();
    expect(urls.snapshot("a").status).toBe("idle");
  });

  it("notifies subscribers on every change", async () => {
    const fn = vi.fn();
    const off = urls.subscribe(fn);
    urls.acquire("a");
    await flush();
    expect(fn).toHaveBeenCalledTimes(2); // loading, ready
    off();
    urls.release("a");
    await flush();
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("clear revokes every URL and forgets remembered images (Reset wall)", async () => {
    urls.remember("a", blob());
    urls.acquire("a");
    urls.acquire("b");
    await flush();
    urls.clear();
    expect(deps.revokeUrl).toHaveBeenCalledWith("blob:1");
    expect(deps.revokeUrl).toHaveBeenCalledWith("blob:2");
    expect(urls.rememberedIds()).toEqual([]);
    expect(urls.snapshot("a").status).toBe("idle");
    // Late releases from frames that were still mounted are harmless.
    urls.release("a");
    await flush();
    expect(deps.revokeUrl).toHaveBeenCalledTimes(2);
  });
});
