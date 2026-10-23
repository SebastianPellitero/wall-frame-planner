import { beforeEach, describe, expect, it } from "vitest";
import type { Shape } from "../types";
import { initialProject, initialUi } from "./actions";
import { useAnnouncer } from "./announcer";
import { ADJUST_ANNOUNCEMENT, enterAdjust, exitAdjust, useSelectionUi } from "./selectionUi";
import { usePlannerStore } from "./store";

const PHOTO = { imageId: "img", aspect: 0.75, zoom: 1, focusX: 0.5, focusY: 0.5 };
const A: Shape = { id: "a", kind: "rect", x: 0, y: 0, w: 40, h: 50, color: 1, mat: true, photo: PHOTO };
const B: Shape = { id: "b", kind: "rect", x: 100, y: 0, w: 40, h: 50, color: 2, mat: true, photo: PHOTO };
const PLAIN: Shape = { id: "p", kind: "rect", x: 200, y: 0, w: 40, h: 50, color: 3, mat: true };

const adjusting = () => useSelectionUi.getState().adjustingId;

beforeEach(() => {
  usePlannerStore.setState({ ...initialProject(), ...initialUi, shapes: [A, B, PLAIN], selectedId: "a" });
  usePlannerStore.temporal.getState().clear();
  useSelectionUi.setState({ adjustingId: null, previewZoom: null, detailsTab: "size" });
});

describe("selectionUi", () => {
  it("starts with no adjust mode, no preview and the Size tab", () => {
    useSelectionUi.setState(useSelectionUi.getInitialState());
    expect(useSelectionUi.getState()).toMatchObject({ adjustingId: null, previewZoom: null, detailsTab: "size" });
  });

  it("enters adjust mode for the selected frame with a photo, and announces it", () => {
    expect(enterAdjust("a")).toBe(true);
    expect(adjusting()).toBe("a");
    expect(useAnnouncer.getState().text).toBe(ADJUST_ANNOUNCEMENT);
    expect(ADJUST_ANNOUNCEMENT).toBe("Adjusting photo. Drag or use the arrow keys to move it, Escape to finish.");
  });

  it("refuses a frame that is not selected, has no photo, or outside Arrange", () => {
    expect(enterAdjust("b")).toBe(false);
    usePlannerStore.setState({ selectedId: "p" });
    expect(enterAdjust("p")).toBe(false);
    usePlannerStore.setState({ selectedId: "a", mode: "photo" });
    expect(enterAdjust("a")).toBe(false);
    expect(adjusting()).toBeNull();
  });

  it("exits with exitAdjust, clearing a live zoom preview", () => {
    enterAdjust("a");
    useSelectionUi.getState().setPreviewZoom(2);
    exitAdjust();
    expect(useSelectionUi.getState()).toMatchObject({ adjustingId: null, previewZoom: null });
  });

  it.each([
    ["the mode changes", () => usePlannerStore.getState().setMode("photo")],
    ["the selection is cleared", () => usePlannerStore.getState().select(null)],
    ["the selection changes", () => usePlannerStore.getState().select("b")],
    ["the frame is deleted", () => usePlannerStore.getState().deleteShape("a")],
    ["the frame loses its photo", () => usePlannerStore.getState().clearFramePhoto("a")],
  ])("exits on its own when %s", (_, change) => {
    enterAdjust("a");
    change();
    expect(adjusting()).toBeNull();
  });

  it("stays in adjust mode through an adjust commit and its undo while the photo remains", () => {
    enterAdjust("a");
    usePlannerStore.getState().adjustFramePhoto("a", { zoom: 2 });
    usePlannerStore.temporal.getState().undo();
    expect(adjusting()).toBe("a");
  });

  it("keeps the details tab across selections (session state)", () => {
    useSelectionUi.getState().setDetailsTab("photo");
    usePlannerStore.getState().select("b");
    expect(useSelectionUi.getState().detailsTab).toBe("photo");
  });
});
