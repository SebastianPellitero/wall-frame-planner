import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { matPx, mouldingPx } from "../../lib/frameLook";
import { initialProject, initialUi } from "../../state/actions";
import { useDragUi } from "../../state/dragUi";
import { framePhotoUrls } from "../../state/framePhotoUrls";
import { undo } from "../../state/frameCommands";
import { enterAdjust, exitAdjust, useSelectionUi } from "../../state/selectionUi";
import { usePlannerStore } from "../../state/store";
import type { Shape } from "../../types";
import { FrameNode } from "./FrameNode";

vi.mock("../../lib/imageStore", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../lib/imageStore")>()),
  // "broken" fails (transient); anything not remembered stays loading.
  loadFramePhoto: vi.fn((id: string) => (id === "broken" ? Promise.reject(new Error("offline")) : new Promise(() => {}))),
}));

const PHOTO = { imageId: "img", aspect: 0.75, zoom: 1, focusX: 0.5, focusY: 0.5 };
// 80 × 100 px at 2 px/cm: moulding 5, mat 8, so the opening is 54 × 74 at (13, 13).
const RECT: Shape = { id: "r1", kind: "rect", x: 10, y: 40, w: 40, h: 50, color: 3, mat: true, photo: PHOTO };

const pointer = { isPrimary: true, button: 0, pointerId: 1, pointerType: "mouse" };
const windowPointer = (type: string, init: Record<string, number>) => {
  const e = new Event(type) as Event & Record<string, number>;
  for (const [k, v] of Object.entries({ pointerId: 1, ...init })) Object.defineProperty(e, k, { value: v });
  act(() => void window.dispatchEvent(e));
};

function renderFrame(shape: Shape = RECT, { selected = false } = {}) {
  usePlannerStore.setState({ shapes: [shape], selectedId: selected ? shape.id : null });
  usePlannerStore.temporal.getState().clear();
  const result = render(
    <div data-testid="wall">
      <FrameNode shape={shape} pxPerCm={2} />
    </div>,
  );
  const rerender = () => {
    const current = usePlannerStore.getState().shapes.find((s) => s.id === shape.id)!;
    result.rerender(
      <div data-testid="wall">
        <FrameNode shape={current} pxPerCm={2} />
      </div>,
    );
  };
  return { ...result, rerender, frame: screen.getByTestId("frame") };
}

const photo = () => usePlannerStore.getState().shapes[0].photo!;
const steps = () => usePlannerStore.temporal.getState().pastStates.length;

beforeAll(() => {
  URL.createObjectURL = vi.fn(() => "blob:img");
  URL.revokeObjectURL = vi.fn();
  framePhotoUrls.remember("img", new Blob(["img"]));
});

beforeEach(() => {
  usePlannerStore.setState({ ...initialProject(), ...initialUi });
  useDragUi.getState().endDrag();
  useDragUi.setState({ spawnFrom: null });
  useSelectionUi.setState({ adjustingId: null, previewZoom: null });
});

describe("FrameNode with a photo (§3.8)", () => {
  it("adds the photo data attributes and says \"with photo\" in its name", () => {
    const { frame } = renderFrame();
    expect(frame).toHaveAttribute("data-has-photo", "true");
    expect(frame).toHaveAttribute("data-mat", "true");
    expect(screen.getByRole("button", { name: "Rectangle 40 × 50 cm with photo" })).toBe(frame);
  });

  it("draws the decorative image in the opening, covering it, with the bevel on an overlay", () => {
    const { frame } = renderFrame();
    const img = screen.getByTestId("frame-photo");
    expect(img).toHaveAttribute("alt", "");
    expect(img).toHaveAttribute("src", "blob:img");
    expect(img).toHaveAttribute("draggable", "false");
    const opening = frame.querySelector("[data-photo-opening]")!;
    expect(opening).toContainElement(img);
    expect(opening).toHaveClass("overflow-hidden", "bg-aperture");
    expect(opening.querySelector("span")).toHaveClass("inset-shadow-aperture");
    // Cover: 74 / 0.75 = 98.67 wide, 74 tall, centered.
    expect(parseFloat(img.style.width)).toBeCloseTo(98.67, 1);
    expect(parseFloat(img.style.height)).toBeCloseTo(74, 1);
    expect(parseFloat(img.style.left)).toBeCloseTo(27 - 98.67 / 2, 1);
  });

  it("shows no size label at rest, only a hidden plate that selection reveals", () => {
    renderFrame();
    expect(screen.getByTestId("label-plate")).toHaveClass("opacity-0", "bg-label-plate", "text-on-inverse", "bottom-1");
    expect(screen.getAllByText("40 × 50")).toHaveLength(1);
  });

  it("insets the plate by the mat inside the moulding box, and by moulding + mat on a circle", () => {
    const inset = () => screen.getByTestId("label-plate").parentElement!.style.inset;
    renderFrame();
    expect(inset()).toBe("8px");
    cleanup();
    renderFrame({ ...RECT, mat: false });
    expect(inset()).toBe("0px");
    cleanup();
    // 100 × 100 px circle: moulding + mat.
    renderFrame({ ...RECT, kind: "circle", w: 50, h: 50 });
    expect(inset()).toBe(`${mouldingPx(100) + matPx(100)}px`);
  });

  it("shows the plate when selected", () => {
    renderFrame(RECT, { selected: true });
    expect(screen.getByTestId("label-plate")).toHaveClass("opacity-100");
  });

  it("mat off: the opening fills the moulding, with the rebate shadow", () => {
    const { frame } = renderFrame({ ...RECT, mat: false });
    expect(frame).toHaveAttribute("data-mat", "false");
    const mat = frame.querySelector("[data-frame-body]")!.firstElementChild as HTMLElement;
    expect(mat.style.padding).toBe("0px");
    expect(frame.querySelector("[data-photo-opening] span")).toHaveClass("inset-shadow-rebate");
  });

  it("while loading shows the plain opening color and no label at all", () => {
    renderFrame({ ...RECT, photo: { ...PHOTO, imageId: "slow" } });
    expect(screen.queryByTestId("frame-photo")).not.toBeInTheDocument();
    expect(screen.queryByText("40 × 50")).not.toBeInTheDocument();
  });

  it("after a failed load keeps the photo data and follows the plain-frame rules", async () => {
    const { frame } = renderFrame({ ...RECT, photo: { ...PHOTO, imageId: "broken" } });
    await waitFor(() => expect(screen.getByText("40 × 50")).toHaveClass("text-frame-ink"));
    expect(screen.queryByTestId("label-plate")).not.toBeInTheDocument();
    expect(frame).toHaveAttribute("data-has-photo", "true");
  });

  it("a plain frame with the mat off keeps its centered label", () => {
    const { frame } = renderFrame({ ...RECT, photo: undefined, mat: false });
    expect(frame).toHaveAttribute("data-has-photo", "false");
    expect(screen.getByText("40 × 50")).toHaveClass("text-frame-ink");
    expect(screen.getByRole("button", { name: "Rectangle 40 × 50 cm" })).toBe(frame);
  });
});

describe("FrameNode in adjust mode (§5.17)", () => {
  function adjust() {
    const r = renderFrame(RECT, { selected: true });
    act(() => void enterAdjust("r1"));
    return r;
  }

  it("raises the frame over a veil in the wall, shows the overflow and the crop outline, hides brackets and plate", () => {
    const { frame } = adjust();
    const veil = screen.getByTestId("adjust-veil");
    expect(veil.parentElement).toBe(screen.getByTestId("wall"));
    expect(veil).toHaveClass("z-adjust-veil", "bg-adjust-veil");
    expect(frame).toHaveClass("z-frame-lifted");
    expect(screen.getByTestId("frame-photo-overflow")).toBeInTheDocument();
    expect(frame.querySelector("[data-photo-opening] span")).toHaveClass("inset-shadow-crop");
    expect(screen.queryByTestId("selection-brackets")).not.toBeInTheDocument();
    expect(screen.queryByTestId("label-plate")).not.toBeInTheDocument();
  });

  it("a drag pans the photo and commits once on release; the frame stays put", async () => {
    const { frame } = adjust();
    let writes = 0;
    const unsubscribe = usePlannerStore.subscribe((s, prev) => void (s.shapes !== prev.shapes && writes++));
    fireEvent.pointerDown(frame, { ...pointer, clientX: 40, clientY: 50 });
    for (let i = 1; i <= 5; i++) windowPointer("pointermove", { clientX: 40 + i * 2, clientY: 50 });
    expect(writes).toBe(0);
    // A live pan counts as a live drag, so history commands wait for the release.
    expect(useDragUi.getState().draggingId).toBe("r1");
    // Motion values reach the style on the next frame.
    await waitFor(() => expect(parseFloat(screen.getByTestId("frame-photo").style.left)).toBeCloseTo(27 - 98.67 / 2 + 10, 1));
    windowPointer("pointerup", { clientX: 50, clientY: 50 });
    unsubscribe();
    expect(writes).toBe(1);
    expect(steps()).toBe(1);
    expect(photo().focusX).toBeCloseTo(0.5 - 10 / 98.67, 3);
    expect(usePlannerStore.getState().shapes[0]).toMatchObject({ x: 10, y: 40 });
  });

  it("a pointercancel commits like a release", () => {
    const { frame } = adjust();
    fireEvent.pointerDown(frame, { ...pointer, clientX: 40, clientY: 50 });
    windowPointer("pointermove", { clientX: 30, clientY: 50 });
    windowPointer("pointercancel", { clientX: 0, clientY: 0 });
    expect(photo().focusX).toBeCloseTo(0.5 + 10 / 98.67, 3);
  });

  it("undo during a pan is a no-op, so the release does not overwrite history", () => {
    const { frame } = adjust();
    fireEvent.pointerDown(frame, { ...pointer, clientX: 40, clientY: 50 });
    windowPointer("pointermove", { clientX: 30, clientY: 50 });
    windowPointer("pointerup", { clientX: 30, clientY: 50 });
    const first = photo();
    fireEvent.pointerDown(frame, { ...pointer, clientX: 40, clientY: 50 });
    windowPointer("pointermove", { clientX: 35, clientY: 50 });
    act(() => undo());
    expect(photo()).toBe(first);
    windowPointer("pointerup", { clientX: 35, clientY: 50 });
    expect(useDragUi.getState().draggingId).toBeNull();
    expect(steps()).toBe(2);
    act(() => undo());
    expect(photo()).toBe(first);
  });

  it("leaving adjust mode mid-pan commits what is shown once and ends the gesture", () => {
    const { frame } = adjust();
    fireEvent.pointerDown(frame, { ...pointer, clientX: 40, clientY: 50 });
    windowPointer("pointermove", { clientX: 30, clientY: 50 });
    expect(frame).toHaveClass("cursor-grabbing");
    act(() => exitAdjust());
    expect(steps()).toBe(1);
    expect(photo().focusX).toBeCloseTo(0.5 + 10 / 98.67, 3);
    expect(frame).toHaveClass("cursor-grab");
    expect(useDragUi.getState().draggingId).toBeNull();
    const after = photo();
    windowPointer("pointermove", { clientX: 0, clientY: 50 });
    windowPointer("pointerup", { clientX: 0, clientY: 50 });
    expect(photo()).toBe(after);
    expect(steps()).toBe(1);
  });

  it("a tap inside the frame centers that image point (clamped)", () => {
    const { frame } = adjust();
    // 10 px left of the opening's center (13 + 27 = 40).
    fireEvent.pointerDown(frame, { ...pointer, clientX: 30, clientY: 50 });
    windowPointer("pointerup", { clientX: 30, clientY: 50 });
    expect(photo().focusX).toBeCloseTo(0.5 - 10 / 98.67, 3);
    expect(useSelectionUi.getState().adjustingId).toBe("r1");
  });

  it("a tap on the veil exits adjust mode and keeps the selection", () => {
    adjust();
    fireEvent.pointerDown(screen.getByTestId("adjust-veil"), { ...pointer, clientX: 400, clientY: 400 });
    windowPointer("pointerup", { clientX: 400, clientY: 400 });
    expect(useSelectionUi.getState().adjustingId).toBeNull();
    expect(usePlannerStore.getState().selectedId).toBe("r1");
    expect(steps()).toBe(0);
  });

  it("a drag that starts on the veil pans the photo too", () => {
    adjust();
    fireEvent.pointerDown(screen.getByTestId("adjust-veil"), { ...pointer, clientX: 400, clientY: 400 });
    windowPointer("pointermove", { clientX: 390, clientY: 400 });
    windowPointer("pointerup", { clientX: 390, clientY: 400 });
    expect(photo().focusX).toBeCloseTo(0.5 + 10 / 98.67, 3);
    expect(useSelectionUi.getState().adjustingId).toBe("r1");
  });

  it("arrow keys move the photo by 0.02 (Shift 0.1), the focus the other way, and +/- zoom by 0.1, one step each", () => {
    const { frame, rerender } = adjust();
    fireEvent.keyDown(frame, { key: "ArrowRight" });
    expect(photo().focusX).toBeCloseTo(0.48, 5);
    rerender();
    fireEvent.keyDown(frame, { key: "ArrowRight", shiftKey: true });
    expect(photo().focusX).toBeCloseTo(0.38, 5);
    rerender();
    fireEvent.keyDown(frame, { key: "+" });
    expect(photo().zoom).toBeCloseTo(1.1, 5);
    expect(steps()).toBe(3);
    expect(usePlannerStore.getState().shapes[0]).toMatchObject({ x: 10, y: 40 });
  });

  it("a two-finger pinch zooms about the midpoint, clamped to 4, with one commit when the last finger lifts", () => {
    const { frame } = adjust();
    const touch = { ...pointer, pointerType: "touch" };
    // Both fingers on the opening's center (40, 50), 20 px apart.
    fireEvent.pointerDown(frame, { ...touch, pointerId: 1, clientX: 30, clientY: 50 });
    fireEvent.pointerDown(screen.getByTestId("adjust-veil"), { ...touch, pointerId: 2, clientX: 50, clientY: 50 });
    windowPointer("pointermove", { pointerId: 2, clientX: 70, clientY: 50 });
    // Spread 20 → 40 about the moving midpoint: zoom 2.
    expect(steps()).toBe(0);
    windowPointer("pointermove", { pointerId: 1, clientX: -200, clientY: 50 });
    windowPointer("pointerup", { pointerId: 2, clientX: 70, clientY: 50 });
    expect(steps()).toBe(0);
    windowPointer("pointerup", { pointerId: 1, clientX: -200, clientY: 50 });
    expect(steps()).toBe(1);
    expect(photo().zoom).toBe(4);
    expect(useSelectionUi.getState().adjustingId).toBe("r1");
  });

  it("drops back to z-frames once the veil has faded out", async () => {
    const { frame } = adjust();
    act(() => useSelectionUi.setState({ adjustingId: null }));
    await waitFor(() => expect(screen.queryByTestId("adjust-veil")).not.toBeInTheDocument());
    await waitFor(() => expect(frame).toHaveClass("z-frames"));
  });
});
