import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { createFramePhotoUrls } from "../state/framePhotoUrls";
import { useFramePhotoUrl } from "./useFramePhotoUrl";

const flush = () => act(() => new Promise((r) => setTimeout(r, 0)));

function setup() {
  const revokeUrl = vi.fn();
  const load = vi.fn(async () => new Blob(["img"]));
  const cache = createFramePhotoUrls({ load, createUrl: () => "blob:1", revokeUrl, onMissing: vi.fn(), onUnavailable: vi.fn() });
  return { cache, load, revokeUrl };
}

describe("useFramePhotoUrl", () => {
  it("is idle without an image", () => {
    const { cache, load } = setup();
    const { result } = renderHook(() => useFramePhotoUrl(undefined, cache));
    expect(result.current).toEqual({ url: null, status: "idle" });
    expect(load).not.toHaveBeenCalled();
  });

  it("loads the image while mounted and revokes its URL after unmount", async () => {
    const { cache, revokeUrl } = setup();
    const { result, unmount } = renderHook(() => useFramePhotoUrl("a", cache));
    expect(result.current.status).toBe("loading");
    await flush();
    expect(result.current).toEqual({ url: "blob:1", status: "ready" });
    unmount();
    await flush();
    expect(revokeUrl).toHaveBeenCalledWith("blob:1");
  });

  it("shares one load between two frames with the same image", async () => {
    const { cache, load, revokeUrl } = setup();
    const a = renderHook(() => useFramePhotoUrl("a", cache));
    const b = renderHook(() => useFramePhotoUrl("a", cache));
    await flush();
    expect(load).toHaveBeenCalledTimes(1);
    expect(b.result.current.url).toBe("blob:1");
    a.unmount();
    await flush();
    expect(revokeUrl).not.toHaveBeenCalled();
    b.unmount();
    await flush();
    expect(revokeUrl).toHaveBeenCalledTimes(1);
  });
});
