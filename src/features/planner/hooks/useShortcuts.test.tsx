import { fireEvent, render, screen } from "@testing-library/react";
import { act } from "react";
import { beforeEach, describe, expect, it } from "vitest";
import { initialProject, initialUi } from "../state/actions";
import { useDragUi } from "../state/dragUi";
import { enterAdjust, useSelectionUi } from "../state/selectionUi";
import { usePlannerStore } from "../state/store";
import type { Shape } from "../types";
import { useShortcuts } from "./useShortcuts";

const A: Shape = { id: "a", kind: "rect", x: 20, y: 30, w: 40, h: 50, color: 4, mat: true };

function Harness() {
  useShortcuts();
  return (
    <>
      <input aria-label="Field" />
      <textarea aria-label="Notes" />
      <div contentEditable suppressContentEditableWarning data-testid="editable">
        <span data-testid="inside-editable">text</span>
      </div>
      <div role="radiogroup" aria-label="Mode">
        <button type="button" role="radio" aria-checked="true">
          Arrange
        </button>
      </div>
      <button type="button">Other</button>
      <input type="range" aria-label="Zoom" />
      <div data-shape-id="a" tabIndex={0} data-testid="frame" />
      <div role="tablist" aria-label="Frame details">
        <button type="button" role="tab" aria-selected="true">
          Size
        </button>
      </div>
      <div role="dialog" aria-modal="true" aria-label="Settings">
        <button type="button">In dialog</button>
      </div>
    </>
  );
}

const a = () => usePlannerStore.getState().shapes.find((s) => s.id === "a");
/** Fires on `target` (default: body) and returns whether the default was prevented. */
const press = (key: string, init: Partial<KeyboardEventInit> = {}, target: Element = document.body) => {
  let notPrevented = true;
  act(() => {
    notPrevented = fireEvent.keyDown(target, { key, ...init });
  });
  return !notPrevented;
};

beforeEach(() => {
  usePlannerStore.setState({ ...initialProject(), ...initialUi, shapes: [A], selectedId: "a" });
  usePlannerStore.temporal.getState().clear();
  useDragUi.setState({ spawnFrom: null, draggingId: null });
  useSelectionUi.setState({ adjustingId: null, previewZoom: null });
  render(<Harness />);
});

describe("useShortcuts", () => {
  it("nudges the selected frame 1 cm, or 10 cm with Shift, and keeps the page from scrolling", () => {
    expect(press("ArrowRight")).toBe(true);
    expect(a()!.x).toBe(21);
    press("ArrowRight", { shiftKey: true });
    expect(a()!.x).toBe(31);
    press("ArrowUp");
    expect(a()!.y).toBe(29);
  });

  it("a held arrow moves live and saves, but is one undo step back to the start", () => {
    press("ArrowRight");
    for (let i = 0; i < 9; i++) press("ArrowRight", { repeat: true });
    expect(a()!.x).toBe(30);
    expect(usePlannerStore.temporal.getState().pastStates).toHaveLength(1);
    const saved = JSON.parse(localStorage.getItem("wallplanner:project")!);
    expect(saved.state.shapes[0].x).toBe(30);
    press("z", { ctrlKey: true });
    expect(a()!.x).toBe(20);
    expect(usePlannerStore.temporal.getState().pastStates).toHaveLength(0);
  });

  it("deletes with Delete and Backspace, and deselects with Escape", () => {
    press("Escape");
    expect(usePlannerStore.getState().selectedId).toBeNull();
    expect(a()).toBeDefined();
    act(() => usePlannerStore.getState().select("a"));
    press("Backspace");
    expect(a()).toBeUndefined();
    expect(usePlannerStore.getState().selectedId).toBeNull();
  });

  it("duplicates with Ctrl+D and keeps the browser's bookmark dialog away", () => {
    expect(press("d", { ctrlKey: true })).toBe(true);
    expect(usePlannerStore.getState().shapes).toHaveLength(2);
    expect(usePlannerStore.getState().selectedId).not.toBe("a");
  });

  it("undoes and redoes, with Ctrl+Z, Ctrl+Shift+Z and Ctrl+Y", () => {
    press("ArrowRight");
    expect(press("z", { ctrlKey: true })).toBe(true);
    expect(a()!.x).toBe(20);
    press("Z", { ctrlKey: true, shiftKey: true });
    expect(a()!.x).toBe(21);
    press("z", { ctrlKey: true });
    press("y", { ctrlKey: true });
    expect(a()!.x).toBe(21);
  });

  it("ignores keys typed into inputs, textareas and contenteditable", () => {
    for (const target of [
      screen.getByRole("textbox", { name: "Field" }),
      screen.getByRole("textbox", { name: "Notes" }),
      screen.getByTestId("inside-editable"),
    ]) {
      expect(press("ArrowRight", {}, target)).toBe(false);
      press("Backspace", {}, target);
      press("z", { ctrlKey: true }, target);
    }
    expect(a()).toMatchObject({ x: 20, y: 30 });
    expect(usePlannerStore.getState().selectedId).toBe("a");
  });

  it("leaves arrow keys to radio groups, where they move the checked option", () => {
    expect(press("ArrowRight", {}, screen.getByRole("radio"))).toBe(false);
    expect(a()!.x).toBe(20);
    // Other keys still act from there.
    press("Delete", {}, screen.getByRole("radio"));
    expect(a()).toBeUndefined();
  });

  it("leaves every key alone inside a modal dialog (the Settings sheet), where Delete must not remove the frame", () => {
    const inDialog = screen.getByRole("button", { name: "In dialog" });
    expect(press("Delete", {}, inDialog)).toBe(false);
    expect(press("z", { ctrlKey: true }, inDialog)).toBe(false);
    expect(press("ArrowRight", {}, inDialog)).toBe(false);
    expect(a()).toMatchObject({ x: 20 });
  });

  it("acts from ordinary buttons", () => {
    press("ArrowDown", {}, screen.getByRole("button", { name: "Other" }));
    expect(a()!.y).toBe(31);
  });

  it("outside Arrange only undo and redo work", () => {
    press("ArrowRight");
    act(() => usePlannerStore.getState().setMode("photo"));
    expect(press("ArrowRight")).toBe(false);
    press("Delete");
    press("d", { ctrlKey: true });
    press("Escape");
    expect(usePlannerStore.getState().shapes).toHaveLength(1);
    expect(a()!.x).toBe(21);
    press("z", { ctrlKey: true });
    expect(a()!.x).toBe(20);
  });

  it("does nothing without a selection, and lets the key through", () => {
    act(() => usePlannerStore.getState().select(null));
    expect(press("ArrowRight")).toBe(false);
    expect(press("d", { ctrlKey: true })).toBe(false);
    expect(press("Escape")).toBe(false);
    expect(a()!.x).toBe(20);
  });

  it("does nothing while a frame is being dragged", () => {
    useDragUi.getState().startDrag("a");
    press("ArrowRight");
    press("Delete");
    expect(a()).toMatchObject({ x: 20 });
    useDragUi.getState().endDrag();
  });

  it("respects a handler that already took the key", () => {
    const input = screen.getByRole("button", { name: "Other" });
    input.addEventListener("keydown", (e) => e.preventDefault(), { once: true });
    press("Escape", {}, input);
    expect(usePlannerStore.getState().selectedId).toBe("a");
  });
});

describe("useShortcuts in adjust mode (§5.17)", () => {
  const PHOTO = { imageId: "img", aspect: 1, zoom: 1, focusX: 0.5, focusY: 0.5 };
  beforeEach(() => {
    act(() => {
      usePlannerStore.setState({ shapes: [{ ...A, photo: PHOTO }], selectedId: "a" });
      enterAdjust("a");
    });
  });

  it("never nudges or deletes the frame", () => {
    press("ArrowRight");
    press("Delete");
    press("Backspace");
    expect(a()).toMatchObject({ x: 20, y: 30 });
  });

  it("Escape exits adjust mode and keeps the selection, from the Zoom slider too", () => {
    const slider = screen.getByRole("slider", { name: "Zoom" });
    slider.focus();
    expect(press("Escape", {}, slider)).toBe(true);
    expect(useSelectionUi.getState().adjustingId).toBeNull();
    expect(usePlannerStore.getState().selectedId).toBe("a");
    // The tools unmount with the focused control: focus goes to the frame, not <body> (§5.17).
    expect(document.activeElement).toBe(screen.getByTestId("frame"));
  });

  it("still undoes and redoes", () => {
    act(() => usePlannerStore.getState().adjustFramePhoto("a", { zoom: 2 }));
    press("z", { ctrlKey: true });
    expect(a()!.photo!.zoom).toBe(1);
  });
});

describe("useShortcuts and the Frame details tabs", () => {
  it("leaves the arrows to a tablist", () => {
    press("ArrowRight", {}, screen.getByRole("tab", { name: "Size" }));
    expect(a()!.x).toBe(20);
  });
});
