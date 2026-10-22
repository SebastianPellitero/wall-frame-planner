import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../lib/imageStore", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/imageStore")>();
  return {
    ...actual,
    downscaleImage: vi.fn(),
    saveFramePhoto: vi.fn(),
    loadFramePhoto: vi.fn(),
    listFramePhotoIds: vi.fn(),
    deleteFramePhotos: vi.fn(),
  };
});

import * as imageStore from "../lib/imageStore";
import { ImageStoreUnavailableError } from "../lib/imageStore";
import { initialProject, initialUi } from "./actions";
import { FRAME_PHOTO_MAX_EDGE, gcFramePhotos, uploadFramePhoto } from "./framePhotoCommands";
import { framePhotoUrls } from "./framePhotoUrls";
import { storageEvents, type StorageEvent } from "./storageEvents";
import { usePlannerStore } from "./store";

const mocked = vi.mocked(imageStore);
const file = new File(["raw"], "kid.jpg", { type: "image/jpeg" });
const small = new Blob(["small"], { type: "image/jpeg" });
const flush = () => new Promise((r) => setTimeout(r, 0));

function listen() {
  const events: StorageEvent[] = [];
  const off = storageEvents.subscribe((e) => events.push(e));
  return { events, off };
}

const frame = (id: string) => usePlannerStore.getState().shapes.find((s) => s.id === id);
let id: string;

beforeEach(() => {
  vi.resetAllMocks();
  framePhotoUrls.clear();
  usePlannerStore.setState({ ...initialProject(), ...initialUi });
  usePlannerStore.temporal.getState().clear();
  id = usePlannerStore.getState().addShape("rect", { x: 100, y: 100 });
});

describe("uploadFramePhoto", () => {
  it("downscales to 1600 px JPEG 0.85, saves under a new id, then sets the frame's photo", async () => {
    const calls: string[] = [];
    mocked.downscaleImage.mockImplementation(async () => {
      calls.push("downscale");
      return { blob: small, width: 1600, height: 1200 };
    });
    mocked.saveFramePhoto.mockImplementation(async () => void calls.push("save"));

    await uploadFramePhoto(id, file);

    expect(calls).toEqual(["downscale", "save"]);
    expect(mocked.downscaleImage).toHaveBeenCalledWith(file, FRAME_PHOTO_MAX_EDGE, 0.85);
    expect(FRAME_PHOTO_MAX_EDGE).toBe(1600);
    const photo = frame(id)?.photo;
    expect(photo).toMatchObject({ aspect: 0.75, zoom: 1, focusX: 0.5, focusY: 0.5 });
    expect(mocked.saveFramePhoto).toHaveBeenCalledWith(photo?.imageId, small);
    // Shown from memory at once, without reading storage back.
    expect(framePhotoUrls.rememberedIds()).toEqual([photo?.imageId]);
  });

  it("gives every upload a new image id, so Replace never overwrites a photo undo may need", async () => {
    mocked.downscaleImage.mockResolvedValue({ blob: small, width: 100, height: 100 });
    await uploadFramePhoto(id, file);
    const first = frame(id)?.photo?.imageId;
    await uploadFramePhoto(id, file);
    expect(frame(id)?.photo?.imageId).not.toBe(first);
    usePlannerStore.temporal.getState().undo();
    expect(frame(id)?.photo?.imageId).toBe(first);
  });

  it("keeps the photo for the session and says so when IndexedDB is unavailable", async () => {
    mocked.downscaleImage.mockResolvedValue({ blob: small, width: 800, height: 400 });
    mocked.saveFramePhoto.mockRejectedValue(new ImageStoreUnavailableError());
    const { events, off } = listen();
    await uploadFramePhoto(id, file);
    off();
    expect(events).toEqual([{ type: "image-session-only" }]);
    const imageId = frame(id)?.photo?.imageId as string;
    expect(frame(id)?.photo?.aspect).toBe(0.5);
    framePhotoUrls.acquire(imageId);
    expect(framePhotoUrls.snapshot(imageId).status).toBe("ready");
    expect(mocked.loadFramePhoto).not.toHaveBeenCalled();
    framePhotoUrls.release(imageId);
  });

  it("rejects and changes nothing when the file can't be decoded", async () => {
    mocked.downscaleImage.mockRejectedValue(new Error("not an image"));
    await expect(uploadFramePhoto(id, file)).rejects.toThrow("not an image");
    expect(frame(id)).not.toHaveProperty("photo");
    expect(mocked.saveFramePhoto).not.toHaveBeenCalled();
  });
});

describe("gcFramePhotos", () => {
  it("deletes only the stored images no frame, undo step or upload of this session uses", async () => {
    const s = usePlannerStore.getState();
    s.setFramePhoto(id, { imageId: "on-wall", aspect: 1 });
    s.duplicateShape(id);
    const other = s.addShape("square", { x: 250, y: 200 }, { select: false });
    s.setFramePhoto(other, { imageId: "in-undo", aspect: 1 });
    s.clearFramePhoto(other);
    framePhotoUrls.remember("just-uploaded", small);
    mocked.listFramePhotoIds.mockResolvedValue(["on-wall", "in-undo", "orphan-1", "just-uploaded", "orphan-2"]);
    mocked.deleteFramePhotos.mockResolvedValue();

    await gcFramePhotos();

    expect(mocked.deleteFramePhotos).toHaveBeenCalledWith(["orphan-1", "orphan-2"]);
  });

  it("deletes nothing when every stored image is in use", async () => {
    usePlannerStore.getState().setFramePhoto(id, { imageId: "on-wall", aspect: 1 });
    mocked.listFramePhotoIds.mockResolvedValue(["on-wall"]);
    await gcFramePhotos();
    expect(mocked.deleteFramePhotos).not.toHaveBeenCalled();
  });

  it("is silent when IndexedDB is unavailable", async () => {
    mocked.listFramePhotoIds.mockRejectedValue(new ImageStoreUnavailableError());
    await expect(gcFramePhotos()).resolves.toBeUndefined();
  });
});

describe("loading a frame's image (framePhotoUrls, app wiring)", () => {
  beforeEach(() => {
    usePlannerStore.getState().setFramePhoto(id, { imageId: "img", aspect: 1 });
    usePlannerStore.getState().duplicateShape(id);
  });

  it("removes a missing image from the frames using it, without an undo step, and says so", async () => {
    mocked.loadFramePhoto.mockResolvedValue(undefined);
    const past = usePlannerStore.temporal.getState().pastStates.length;
    const { events, off } = listen();
    framePhotoUrls.acquire("img");
    await flush();
    off();
    expect(usePlannerStore.getState().shapes.every((s) => s.photo === undefined)).toBe(true);
    expect(usePlannerStore.temporal.getState().pastStates.length).toBe(past);
    expect(events).toEqual([{ type: "frame-photo-missing" }]);
    framePhotoUrls.release("img");
  });

  it("keeps the photo data on a transient failure and says so", async () => {
    mocked.loadFramePhoto.mockRejectedValue(new ImageStoreUnavailableError());
    const { events, off } = listen();
    framePhotoUrls.acquire("img");
    await flush();
    off();
    expect(frame(id)?.photo?.imageId).toBe("img");
    expect(framePhotoUrls.snapshot("img").status).toBe("failed");
    expect(events).toEqual([{ type: "frame-photo-unavailable" }]);
    framePhotoUrls.release("img");
  });
});
