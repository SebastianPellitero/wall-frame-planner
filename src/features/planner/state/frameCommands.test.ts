import { beforeEach, describe, expect, it } from "vitest";
import type { Shape } from "../types";
import { initialProject, initialUi } from "./actions";
import { useAnnouncer } from "./announcer";
import { useDragUi } from "./dragUi";
import { adjustPhotoStep, deleteFrame, duplicateFrame, nudgeFrame, redo, removeFramePhoto, undo } from "./frameCommands";
import { usePlannerStore } from "./store";

const A: Shape = { id: "a", kind: "rect", x: 20, y: 30, w: 40, h: 50, color: 4, mat: true };

beforeEach(() => {
  usePlannerStore.setState({ ...initialProject(), ...initialUi, shapes: [A], selectedId: "a" });
  usePlannerStore.temporal.getState().clear();
  useDragUi.setState({ spawnFrom: null, draggingId: null });
  useAnnouncer.setState({ text: "", id: 0 });
});

describe("frameCommands", () => {
  it("duplicate announces 'Frame duplicated'", () => {
    duplicateFrame("a");
    expect(useAnnouncer.getState().text).toBe("Frame duplicated");
  });

  it("delete removes the frame and announces 'Frame deleted'; an unknown id does nothing", () => {
    deleteFrame("nope");
    expect(useAnnouncer.getState().text).toBe("");
    deleteFrame("a");
    expect(usePlannerStore.getState().shapes).toEqual([]);
    expect(useAnnouncer.getState().text).toBe("Frame deleted");
  });

  it("duplicate selects a same-colored copy and leaves its spawn point at the original", () => {
    const id = duplicateFrame("a");
    expect(id).not.toBeNull();
    const { shapes, selectedId } = usePlannerStore.getState();
    const copy = shapes.find((s) => s.id === id)!;
    expect(selectedId).toBe(id);
    expect(copy.color).toBe(4);
    expect(copy.x).toBeGreaterThan(A.x + A.w);
    expect(useDragUi.getState().spawnFrom).toEqual({ id, from: { x: 20, y: 30 } });
  });

  it("duplicate of an unknown id does nothing", () => {
    expect(duplicateFrame("nope")).toBeNull();
    expect(useDragUi.getState().spawnFrom).toBeNull();
    expect(usePlannerStore.getState().shapes).toHaveLength(1);
  });

  it("nudges through commitShape, clamped to the wall", () => {
    nudgeFrame("a", 1, 0);
    expect(usePlannerStore.getState().shapes[0]).toMatchObject({ x: 21, y: 30 });
    nudgeFrame("a", 0, -10);
    expect(usePlannerStore.getState().shapes[0]).toMatchObject({ x: 21, y: 20 });
    nudgeFrame("a", -100, 0);
    expect(usePlannerStore.getState().shapes[0]).toMatchObject({ x: 0, y: 20 });
    expect(usePlannerStore.temporal.getState().pastStates).toHaveLength(3);
  });

  it("a nudge clamped against the wall edge changes nothing and records no history", () => {
    usePlannerStore.setState({ shapes: [{ ...A, x: 0 }] });
    usePlannerStore.temporal.getState().clear();
    const before = usePlannerStore.getState().shapes;
    nudgeFrame("a", -1, 0);
    nudgeFrame("a", -10, 0, { repeat: true });
    expect(usePlannerStore.getState().shapes).toBe(before);
    expect(usePlannerStore.temporal.getState().pastStates).toHaveLength(0);
  });

  it("a held arrow (first press, then repeats) is one undo step back to the start", () => {
    nudgeFrame("a", 1, 0);
    for (let i = 0; i < 20; i++) nudgeFrame("a", 1, 0, { repeat: true });
    expect(usePlannerStore.getState().shapes[0].x).toBe(41);
    expect(usePlannerStore.temporal.getState().pastStates).toHaveLength(1);
    undo();
    expect(usePlannerStore.getState().shapes[0].x).toBe(20);
    redo();
    expect(usePlannerStore.getState().shapes[0].x).toBe(41);
    // Tracking is back on afterwards.
    nudgeFrame("a", 0, 1);
    expect(usePlannerStore.temporal.getState().pastStates).toHaveLength(2);
  });

  it("undo and redo step through frame history", () => {
    nudgeFrame("a", 10, 0);
    undo();
    expect(usePlannerStore.getState().shapes[0].x).toBe(20);
    redo();
    expect(usePlannerStore.getState().shapes[0].x).toBe(30);
  });
});

describe("undo / redo after a wall shrink", () => {
  it("keeps every frame inside the current wall, with no extra history step", () => {
    usePlannerStore.getState().commitShape("a", { x: 250, y: 190 });
    usePlannerStore.getState().commitShape("a", { x: 200, y: 150 });
    usePlannerStore.getState().setWall({ width: 100, height: 80 });
    expect(usePlannerStore.temporal.getState().pastStates).toHaveLength(2);
    undo();
    expect(usePlannerStore.getState().shapes[0]).toMatchObject({ x: 60, y: 30 });
    undo();
    expect(usePlannerStore.getState().shapes[0]).toMatchObject({ x: 20, y: 30 });
    redo();
    redo();
    expect(usePlannerStore.getState().shapes[0]).toMatchObject({ x: 60, y: 30 });
    expect(usePlannerStore.temporal.getState().pastStates).toHaveLength(2);
    expect(usePlannerStore.temporal.getState().futureStates).toHaveLength(0);
  });
});

describe("while a drag is live", () => {
  it("undo, redo, duplicate, delete and nudge do nothing", () => {
    nudgeFrame("a", 10, 0);
    undo();
    useDragUi.getState().startDrag("a");
    const before = usePlannerStore.getState().shapes;
    undo();
    redo();
    expect(duplicateFrame("a")).toBeNull();
    deleteFrame("a");
    nudgeFrame("a", 5, 0);
    expect(usePlannerStore.getState().shapes).toBe(before);
    expect(useAnnouncer.getState().text).toBe("");
    useDragUi.getState().endDrag();
    redo();
    expect(usePlannerStore.getState().shapes[0].x).toBe(30);
  });
});

describe("frame photo commands", () => {
  const PHOTO = { imageId: "img", aspect: 1, zoom: 1, focusX: 0.5, focusY: 0.5 };
  beforeEach(() => {
    usePlannerStore.setState({ shapes: [{ ...A, photo: PHOTO }] });
    usePlannerStore.temporal.getState().clear();
  });
  const photo = () => usePlannerStore.getState().shapes[0].photo;
  const steps = () => usePlannerStore.temporal.getState().pastStates.length;

  it("removeFramePhoto clears the photo in one undo step and announces 'Photo removed'", () => {
    removeFramePhoto("a");
    expect(photo()).toBeUndefined();
    expect(useAnnouncer.getState().text).toBe("Photo removed");
    undo();
    expect(photo()).toEqual(PHOTO);
  });

  it("removeFramePhoto on a frame without a photo says nothing", () => {
    removeFramePhoto("a");
    useAnnouncer.setState({ text: "", id: 0 });
    removeFramePhoto("a");
    expect(useAnnouncer.getState().text).toBe("");
  });

  it("adjustPhotoStep is one step per key press; a held key's repeats add none (like the nudge)", () => {
    adjustPhotoStep("a", { zoom: 1.1 });
    for (let i = 0; i < 5; i++) adjustPhotoStep("a", { zoom: 1.2 + i / 10 }, { repeat: true });
    expect(photo()!.zoom).toBeCloseTo(1.6);
    expect(steps()).toBe(1);
    undo();
    expect(photo()!.zoom).toBe(1);
  });

  it("does nothing while a drag is live", () => {
    useDragUi.setState({ draggingId: "a" });
    adjustPhotoStep("a", { zoom: 2 });
    removeFramePhoto("a");
    expect(photo()).toEqual(PHOTO);
  });
});
