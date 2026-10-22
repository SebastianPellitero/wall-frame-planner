import { beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_WALL } from "../defaults";
import { createPlannerStore } from "./store";

let n = 0;
type Store = ReturnType<typeof createPlannerStore>;
let store: Store;
let id: string;

const shape = (shapeId = id) => store.getState().shapes.find((s) => s.id === shapeId);
const history = () => store.temporal.getState().pastStates.length;
const undo = () => store.temporal.getState().undo();
const redo = () => store.temporal.getState().redo();

beforeEach(() => {
  store = createPlannerStore({ name: `test-frame-photo-${n++}` });
  id = store.getState().addShape("rect", { x: 100, y: 100 });
});

describe("new frames", () => {
  it("have the mat on and no photo", () => {
    expect(shape()).toMatchObject({ mat: true });
    expect(shape()).not.toHaveProperty("photo");
  });
});

describe("setFramePhoto", () => {
  it("sets the photo at cover, centered, as one history step", () => {
    const before = history();
    store.getState().setFramePhoto(id, { imageId: "img-1", aspect: 0.75 });
    expect(shape()?.photo).toEqual({ imageId: "img-1", aspect: 0.75, zoom: 1, focusX: 0.5, focusY: 0.5 });
    expect(history()).toBe(before + 1);
  });

  it("replacing resets the crop", () => {
    store.getState().setFramePhoto(id, { imageId: "img-1", aspect: 0.75 });
    store.getState().adjustFramePhoto(id, { zoom: 2, focusX: 0.2 });
    store.getState().setFramePhoto(id, { imageId: "img-2", aspect: 1.5 });
    expect(shape()?.photo).toEqual({ imageId: "img-2", aspect: 1.5, zoom: 1, focusX: 0.5, focusY: 0.5 });
  });

  it("ignores an unknown frame or an invalid aspect", () => {
    const before = history();
    store.getState().setFramePhoto("nope", { imageId: "img-1", aspect: 1 });
    store.getState().setFramePhoto(id, { imageId: "img-1", aspect: 0 });
    store.getState().setFramePhoto(id, { imageId: "", aspect: 1 });
    expect(shape()).not.toHaveProperty("photo");
    expect(history()).toBe(before);
  });
});

describe("adjustFramePhoto", () => {
  beforeEach(() => store.getState().setFramePhoto(id, { imageId: "img-1", aspect: 0.75 }));

  it("patches zoom and focus as one history step, which undo and redo restore", () => {
    const before = history();
    store.getState().adjustFramePhoto(id, { zoom: 2.5, focusX: 0.3, focusY: 0.7 });
    expect(shape()?.photo).toMatchObject({ zoom: 2.5, focusX: 0.3, focusY: 0.7 });
    expect(history()).toBe(before + 1);
    undo();
    expect(shape()?.photo).toMatchObject({ zoom: 1, focusX: 0.5, focusY: 0.5 });
    redo();
    expect(shape()?.photo).toMatchObject({ zoom: 2.5, focusX: 0.3, focusY: 0.7 });
  });

  it("clamps zoom to 1–4 and focus to 0–1", () => {
    store.getState().adjustFramePhoto(id, { zoom: 7, focusX: -2, focusY: 5 });
    expect(shape()?.photo).toMatchObject({ zoom: 4, focusX: 0, focusY: 1 });
  });

  it("records nothing when nothing changes or the frame has no photo", () => {
    const before = history();
    store.getState().adjustFramePhoto(id, { zoom: 1, focusX: 0.5 });
    store.getState().adjustFramePhoto(id, {});
    const plain = store.getState().addShape("square", { x: 250, y: 200 }, { select: false });
    const afterAdd = history();
    store.getState().adjustFramePhoto(plain, { zoom: 2 });
    expect(history()).toBe(before + 1);
    expect(afterAdd).toBe(before + 1);
    expect(shape(plain)).not.toHaveProperty("photo");
  });
});

describe("clearFramePhoto", () => {
  it("removes the photo as one history step, and undo brings it back", () => {
    store.getState().setFramePhoto(id, { imageId: "img-1", aspect: 0.75 });
    store.getState().adjustFramePhoto(id, { zoom: 2 });
    const before = history();
    store.getState().clearFramePhoto(id);
    expect(shape()).not.toHaveProperty("photo");
    expect(history()).toBe(before + 1);
    undo();
    expect(shape()?.photo).toEqual({ imageId: "img-1", aspect: 0.75, zoom: 2, focusX: 0.5, focusY: 0.5 });
  });

  it("does nothing for a frame without a photo", () => {
    const before = history();
    store.getState().clearFramePhoto(id);
    expect(history()).toBe(before);
  });
});

describe("setMat", () => {
  it("switches the mat as one history step, undoable", () => {
    const before = history();
    store.getState().setMat(id, false);
    expect(shape()?.mat).toBe(false);
    expect(history()).toBe(before + 1);
    undo();
    expect(shape()?.mat).toBe(true);
  });

  it("records nothing when the mat is already in that state or the frame is unknown", () => {
    const before = history();
    store.getState().setMat(id, true);
    store.getState().setMat("nope", false);
    expect(history()).toBe(before);
  });
});

describe("duplicateShape", () => {
  it("copies the photo (sharing its imageId) and the mat", () => {
    store.getState().setFramePhoto(id, { imageId: "img-1", aspect: 0.75 });
    store.getState().adjustFramePhoto(id, { zoom: 1.5, focusX: 0.4 });
    store.getState().setMat(id, false);
    const copyId = store.getState().duplicateShape(id);
    expect(copyId).not.toBeNull();
    expect(shape(copyId!)?.photo).toEqual(shape()?.photo);
    expect(shape(copyId!)?.photo?.imageId).toBe("img-1");
    expect(shape(copyId!)?.mat).toBe(false);
  });
});

describe("forgetFramePhoto", () => {
  it("removes a missing image from every frame that uses it, without a history step", () => {
    store.getState().setFramePhoto(id, { imageId: "gone", aspect: 1 });
    const copyId = store.getState().duplicateShape(id)!;
    const other = store.getState().addShape("square", { x: 250, y: 200 }, { select: false });
    store.getState().setFramePhoto(other, { imageId: "kept", aspect: 1 });
    const before = history();
    store.getState().forgetFramePhoto("gone");
    expect(shape()).not.toHaveProperty("photo");
    expect(shape(copyId)).not.toHaveProperty("photo");
    expect(shape(other)?.photo?.imageId).toBe("kept");
    expect(history()).toBe(before);
  });
});

describe("setWall color", () => {
  it("sets a #rrggbb color (lowercased) without a history step or touching frames", () => {
    const shapes = store.getState().shapes;
    const before = history();
    store.getState().setWall({ color: "#2F4A3F" });
    expect(store.getState().wall).toEqual({ ...DEFAULT_WALL, color: "#2f4a3f" });
    expect(store.getState().shapes).toBe(shapes);
    expect(history()).toBe(before);
  });

  it("ignores an invalid color", () => {
    store.getState().setWall({ color: "teal" });
    expect(store.getState().wall.color).toBe(DEFAULT_WALL.color);
  });

  it("resetProject restores the default color", () => {
    store.getState().setWall({ color: "#34383b" });
    store.getState().resetProject();
    expect(store.getState().wall.color).toBe(DEFAULT_WALL.color);
  });
});
