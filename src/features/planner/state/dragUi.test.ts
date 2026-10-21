import { beforeEach, describe, expect, it, vi } from "vitest";
import { useDragUi } from "./dragUi";

beforeEach(() => {
  useDragUi.getState().endDrag();
});

describe("dragUi", () => {
  it("starts with no drag and no guides", () => {
    expect(useDragUi.getState()).toMatchObject({ draggingId: null, guides: [] });
  });

  it("tracks the dragged frame and its guides, and clears both on endDrag", () => {
    useDragUi.getState().startDrag("a");
    useDragUi.getState().setGuides([{ axis: "x", position: 10 }]);
    expect(useDragUi.getState()).toMatchObject({ draggingId: "a", guides: [{ axis: "x", position: 10 }] });
    useDragUi.getState().endDrag();
    expect(useDragUi.getState()).toMatchObject({ draggingId: null, guides: [] });
  });

  it("only notifies subscribers when the guides actually change", () => {
    const listener = vi.fn();
    const unsubscribe = useDragUi.subscribe(listener);
    useDragUi.getState().setGuides([]);
    expect(listener).not.toHaveBeenCalled();
    useDragUi.getState().setGuides([{ axis: "y", position: 20 }]);
    useDragUi.getState().setGuides([{ axis: "y", position: 20 }]);
    expect(listener).toHaveBeenCalledTimes(1);
    useDragUi.getState().setGuides([{ axis: "y", position: 30 }]);
    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
  });

  it("does not notify on endDrag when nothing is active", () => {
    const listener = vi.fn();
    const unsubscribe = useDragUi.subscribe(listener);
    useDragUi.getState().endDrag();
    expect(listener).not.toHaveBeenCalled();
    unsubscribe();
  });
});
