import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { beforeEach, describe, expect, it } from "vitest";
import type { Shell } from "../../hooks/useShell";
import { initialProject, initialUi } from "../../state/actions";
import { PALETTE_DRAG_ID, useDragUi } from "../../state/dragUi";
import { usePlannerStore } from "../../state/store";
import { Announcer } from "../ui/Announcer";
import { WallContext } from "../wall/WallContext";
import { FrameCreator } from "./FrameCreator";

const pointer = { isPrimary: true, button: 0, pointerId: 1, pointerType: "mouse" };
const windowPointer = (type: string, init: Record<string, number>) => {
  const e = new Event(type) as Event & Record<string, number>;
  for (const [k, v] of Object.entries({ pointerId: 1, ...init })) Object.defineProperty(e, k, { value: v });
  act(() => void window.dispatchEvent(e));
};

function renderCreator(shell: Shell = "landscape") {
  const wallRef = createRef<HTMLDivElement>();
  return render(
    <WallContext value={{ pxPerCm: 2, wallRef, wallPx: { w: 600, h: 500 } }}>
      <FrameCreator shell={shell} />
      <Announcer />
    </WallContext>,
  );
}

const preview = () => screen.getByRole("button", { name: /^Add / });
const field = (name: string) => screen.getByRole("textbox", { name });
const radio = (name: string) => screen.getByRole("radio", { name });
const color = () => Number(preview().getAttribute("data-frame-color"));
const tap = (el: Element) => {
  fireEvent.pointerDown(el, { ...pointer, clientX: 10, clientY: 10 });
  windowPointer("pointerup", { clientX: 11, clientY: 10 });
};

beforeEach(() => {
  usePlannerStore.setState({ ...initialProject(), ...initialUi, creatorColor: 4 });
  useDragUi.getState().endDrag();
});

describe("FrameCreator", () => {
  it("is the 'Frame creator' region with the shape picker, fields, Generate and the preview", () => {
    renderCreator("desktop");
    const region = screen.getByRole("region", { name: "Frame creator" });
    expect(within(region).getByRole("heading", { name: "Frame creator" })).toBeInTheDocument();
    expect(within(region).getByRole("radiogroup", { name: "Shape" })).toBeInTheDocument();
    expect(radio("Rectangle")).toHaveAttribute("aria-checked", "true");
    expect(field("Width (cm)")).toHaveValue("40");
    expect(field("Height (cm)")).toHaveValue("50");
    expect(within(region).getByRole("button", { name: "Generate" })).toHaveAttribute("type", "submit");
    expect(preview()).toHaveAccessibleName("Add rectangle, 40 × 50 cm");
    expect(preview()).toHaveAttribute("data-frame-color", "4");
    expect(preview()).toHaveClass("touch-none", "rounded-tile", "bg-wall");
    expect(screen.getByText("40 × 50 cm")).toBeInTheDocument();
  });

  it("tabs picker → Width → Height → Generate → preview", async () => {
    renderCreator("desktop");
    const order = [radio("Rectangle"), field("Width (cm)"), field("Height (cm)"), screen.getByRole("button", { name: "Generate" }), preview()];
    order[0].focus();
    for (const next of order.slice(1)) {
      await userEvent.tab();
      expect(next).toHaveFocus();
    }
  });

  it("the shape picker swaps the inputs and keeps the color", async () => {
    renderCreator();
    await userEvent.click(radio("Circle"));
    expect(screen.getAllByRole("textbox").map((i) => i.getAttribute("aria-label"))).toEqual(["Diameter (cm)"]);
    expect(field("Diameter (cm)")).toHaveValue("30");
    expect(preview()).toHaveAccessibleName("Add circle, Ø 30 cm");
    expect(color()).toBe(4);
    // Arrow keys move the selection, like the mode switch.
    fireEvent.keyDown(radio("Circle"), { key: "ArrowLeft" });
    expect(radio("Square")).toHaveAttribute("aria-checked", "true");
    expect(radio("Square")).toHaveFocus();
    expect(field("Side (cm)")).toHaveValue("30");
    expect(usePlannerStore.getState().paletteKind).toBe("square");
  });

  it("changes the preview only on Generate, which also rolls a new color", async () => {
    renderCreator();
    await userEvent.clear(field("Width (cm)"));
    await userEvent.type(field("Width (cm)"), "60");
    await userEvent.clear(field("Height (cm)"));
    await userEvent.type(field("Height (cm)"), "40");
    await userEvent.tab();
    expect(preview()).toHaveAccessibleName("Add rectangle, 40 × 50 cm");
    expect(usePlannerStore.getState().paletteSizes.rect).toEqual({ w: 40, h: 50 });

    await userEvent.click(screen.getByRole("button", { name: "Generate" }));
    expect(preview()).toHaveAccessibleName("Add rectangle, 60 × 40 cm");
    expect(screen.getByText("60 × 40 cm")).toBeInTheDocument();
    expect(color()).not.toBe(4);
    expect(usePlannerStore.getState().paletteSizes.rect).toEqual({ w: 60, h: 40 });
  });

  it("Enter in a field generates", async () => {
    renderCreator();
    await userEvent.clear(field("Height (cm)"));
    await userEvent.type(field("Height (cm)"), "70{Enter}");
    expect(preview()).toHaveAccessibleName("Add rectangle, 40 × 70 cm");
    expect(field("Height (cm)")).toHaveFocus();
  });

  it("an invalid field blocks Generate, shows its error and gets focus", async () => {
    renderCreator();
    await userEvent.clear(field("Width (cm)"));
    await userEvent.type(field("Width (cm)"), "999");
    await userEvent.click(screen.getByRole("button", { name: "Generate" }));
    expect(field("Width (cm)")).toHaveAttribute("aria-invalid", "true");
    expect(field("Width (cm)")).toHaveFocus();
    expect(screen.getByText("Use 1–300 cm")).toBeInTheDocument();
    expect(preview()).toHaveAccessibleName("Add rectangle, 40 × 50 cm");
    expect(color()).toBe(4);
  });

  it("tapping the preview adds an unselected frame in its color, then the color changes", () => {
    renderCreator();
    tap(preview());
    const [shape] = usePlannerStore.getState().shapes;
    expect(shape).toMatchObject({ kind: "rect", w: 40, h: 50, color: 4 });
    expect(usePlannerStore.getState().selectedId).toBeNull();
    expect(color()).not.toBe(4);
    const next = color();
    tap(preview());
    expect(usePlannerStore.getState().shapes.map((s) => s.color)).toEqual([4, next]);
  });

  it("announces 'Frame added' on a tap and 'Ready: …' after Generate in the live region", async () => {
    renderCreator();
    const live = screen.getByTestId("announcer");
    tap(preview());
    expect(live).toHaveTextContent("Frame added");
    await userEvent.clear(field("Width (cm)"));
    await userEvent.type(field("Width (cm)"), "60{Enter}");
    expect(live).toHaveTextContent("Ready: rectangle, 60 × 50 cm");
    fireEvent.keyDown(preview(), { key: "Enter" });
    expect(live).toHaveTextContent("Frame added");
  });

  it("the click that follows a pointer tap does not add a second frame", () => {
    renderCreator();
    tap(preview());
    fireEvent.click(preview(), { detail: 1 });
    expect(usePlannerStore.getState().shapes).toHaveLength(1);
  });

  it("only a primary main-button press swallows the click that follows it", () => {
    renderCreator();
    // A right-click or a second finger never adds by itself, and never eats the next click.
    fireEvent.pointerDown(preview(), { ...pointer, button: 2, clientX: 10, clientY: 10 });
    windowPointer("pointerup", { clientX: 10, clientY: 10 });
    fireEvent.pointerDown(preview(), { ...pointer, isPrimary: false, pointerId: 2, clientX: 10, clientY: 10 });
    fireEvent.click(preview(), { detail: 0 });
    expect(usePlannerStore.getState().shapes).toHaveLength(1);
  });

  it("a drag that produces no click leaves the next assistive-tech click working", async () => {
    renderCreator();
    fireEvent.pointerDown(preview(), { ...pointer, pointerType: "touch", clientX: 10, clientY: 10 });
    windowPointer("pointermove", { clientX: 60, clientY: 10 });
    windowPointer("pointerup", { clientX: 60, clientY: 10 });
    // The click cycle is over once the pointer is up and its task has run.
    await act(() => new Promise((r) => setTimeout(r, 0)));
    fireEvent.click(preview(), { detail: 0 });
    expect(usePlannerStore.getState().shapes).toHaveLength(1);
  });

  it("a key press clears a pending pointer press", () => {
    renderCreator();
    fireEvent.pointerDown(preview(), { ...pointer, clientX: 10, clientY: 10 });
    fireEvent.keyDown(preview(), { key: "Tab" });
    fireEvent.click(preview(), { detail: 0 });
    expect(usePlannerStore.getState().shapes).toHaveLength(1);
    windowPointer("pointerup", { clientX: 10, clientY: 10 });
  });

  it("adds on Enter or Space and on an assistive-tech click, ignoring key repeat", () => {
    renderCreator();
    fireEvent.keyDown(preview(), { key: "Enter" });
    fireEvent.keyDown(preview(), { key: "Enter", repeat: true });
    fireEvent.keyDown(preview(), { key: " " });
    fireEvent.click(preview(), { detail: 0 });
    expect(usePlannerStore.getState().shapes).toHaveLength(3);
    expect(usePlannerStore.getState().selectedId).toBeNull();
  });

  it("drags a ghost in the preview's color; dropped off the wall it adds nothing and keeps the color", () => {
    renderCreator();
    fireEvent.pointerDown(preview(), { ...pointer, clientX: 10, clientY: 10 });
    windowPointer("pointermove", { clientX: 30, clientY: 10 });
    expect(screen.getByTestId("drag-ghost")).toHaveAttribute("data-frame-color", "4");
    expect(screen.getByTestId("drag-ghost")).toHaveAttribute("data-kind", "rect");
    // The wall ref is unattached, so every point is off the wall.
    windowPointer("pointerup", { clientX: 40, clientY: 10 });
    expect(usePlannerStore.getState().shapes).toEqual([]);
    expect(color()).toBe(4);
  });

  it("a ghost drag counts as a live drag (shortcuts and history wait), until release or cancel", () => {
    renderCreator();
    fireEvent.pointerDown(preview(), { ...pointer, clientX: 10, clientY: 10 });
    windowPointer("pointermove", { clientX: 12, clientY: 10 });
    // Still inside the slop: a tap so far.
    expect(useDragUi.getState().draggingId).toBeNull();
    windowPointer("pointermove", { clientX: 30, clientY: 10 });
    expect(useDragUi.getState().draggingId).toBe(PALETTE_DRAG_ID);
    windowPointer("pointerup", { clientX: 40, clientY: 10 });
    expect(useDragUi.getState().draggingId).toBeNull();

    fireEvent.pointerDown(preview(), { ...pointer, clientX: 10, clientY: 10 });
    windowPointer("pointermove", { clientX: 30, clientY: 10 });
    expect(useDragUi.getState().draggingId).toBe(PALETTE_DRAG_ID);
    windowPointer("pointercancel", {});
    expect(useDragUi.getState().draggingId).toBeNull();
  });

  it("stacked: no caption,and an invalid value keeps its label with the limits on the same row", async () => {
    renderCreator("stacked");
    expect(screen.queryByText("40 × 50 cm")).not.toBeInTheDocument();
    await userEvent.clear(field("Width (cm)"));
    await userEvent.type(field("Width (cm)"), "0{Enter}");
    expect(field("Width (cm)")).toHaveAccessibleDescription("Use 1–300 cm");
    expect(screen.getByText("Width")).toBeInTheDocument();
    expect(screen.getByText("Height")).toBeInTheDocument();
  });

  it("landscape rail: one helper line below both fields, spanning the two columns (§5.2)", async () => {
    renderCreator("landscape");
    await userEvent.clear(field("Width (cm)"));
    await userEvent.type(field("Width (cm)"), "999");
    await userEvent.click(screen.getByRole("button", { name: "Generate" }));
    const helper = screen.getByText("Use 1–300 cm");
    expect(helper.closest("[data-testid=field-helper]")).toHaveClass("col-span-2", "whitespace-nowrap", "text-caption", "text-danger");
    expect(field("Width (cm)")).toHaveAccessibleDescription("Use 1–300 cm");
    // Below the two fields, inside their grid; nothing under either field.
    const height = field("Height (cm)").closest("label")!;
    expect(height.nextElementSibling).toBe(helper.closest("[data-testid=field-helper]"));
    expect(field("Width (cm)").closest("label")!.querySelector(".text-danger")).toBeNull();

    await userEvent.clear(field("Height (cm)"));
    await userEvent.type(field("Height (cm)"), "999{Enter}");
    // Still one visible line; each field is described by its own limits.
    expect(screen.getAllByTestId("field-helper")).toHaveLength(1);
    expect(field("Height (cm)")).toHaveAccessibleDescription("Use 1–250 cm");
    expect(field("Width (cm)")).toHaveAccessibleDescription("Use 1–300 cm");
    expect(screen.getByText("Use 1–250 cm")).not.toHaveClass("sr-only");
    expect(screen.getByText("Use 1–300 cm")).toHaveClass("sr-only");

    await userEvent.clear(field("Width (cm)"));
    await userEvent.type(field("Width (cm)"), "50");
    await userEvent.clear(field("Height (cm)"));
    await userEvent.type(field("Height (cm)"), "60{Enter}");
    expect(screen.queryByTestId("field-helper")).not.toBeInTheDocument();
  });

  it("desktop: the Width helper is centered under the centered field", async () => {
    renderCreator("desktop");
    await userEvent.clear(field("Width (cm)"));
    await userEvent.type(field("Width (cm)"), "999{Enter}");
    expect(screen.getByText("Use 1–300 cm")).toHaveClass("self-center", "whitespace-nowrap");
  });
});
