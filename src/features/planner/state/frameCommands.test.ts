import { beforeEach, describe, expect, it } from "vitest";
import type { Shape } from "../types";
import { initialProject, initialUi } from "./actions";
import { useDragUi } from "./dragUi";
import { duplicateFrame, nudgeFrame, redo, undo } from "./frameCommands";
import { usePlannerStore } from "./store";

const A: Shape = { id: "a", kind: "rect", x: 20, y: 30, w: 40, h: 50, color: 4 };

beforeEach(() => {
  usePlannerStore.setState({ ...initialProject(), ...initialUi, shapes: [A], selectedId: "a" });
  usePlannerStore.temporal.getState().clear();
  useDragUi.setState({ spawnFrom: null });
});

describe("frameCommands", () => {
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
