import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { beforeEach, describe, expect, it } from "vitest";
import type { Shell } from "../../hooks/useShell";
import { initialProject, initialUi } from "../../state/actions";
import { useDragUi } from "../../state/dragUi";
import { usePlannerStore } from "../../state/store";
import { WallContext } from "../wall/WallContext";
import { ShapePalette } from "./ShapePalette";

const pointer = { isPrimary: true, button: 0, pointerId: 1, pointerType: "mouse" };
const windowPointer = (type: string, init: Record<string, number>) => {
  const e = new Event(type) as Event & Record<string, number>;
  for (const [k, v] of Object.entries({ pointerId: 1, ...init })) Object.defineProperty(e, k, { value: v });
  act(() => void window.dispatchEvent(e));
};

function renderPalette(shell: Shell = "stacked") {
  const wallRef = createRef<HTMLDivElement>();
  return render(
    <WallContext value={{ pxPerCm: 2, wallRef, wallPx: { w: 600, h: 500 } }}>
      <ShapePalette shell={shell} />
    </WallContext>,
  );
}

const tile = (name: RegExp) => screen.getByRole("button", { name });

beforeEach(() => {
  usePlannerStore.setState({ ...initialProject(), ...initialUi });
  useDragUi.getState().endDrag();
});

describe("ShapePalette", () => {
  it("names each tile with its live size", () => {
    renderPalette();
    expect(screen.getByRole("button", { name: "Add rectangle, 40 × 50 cm" })).toHaveClass("touch-none");
    expect(screen.getByRole("button", { name: "Add square, 30 × 30 cm" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add circle, Ø 30 cm" })).toBeInTheDocument();
    act(() => usePlannerStore.getState().setPaletteSize("rect", { w: 60, h: 50 }));
    expect(screen.getByRole("button", { name: "Add rectangle, 60 × 50 cm" })).toBeInTheDocument();
  });

  it("shows only the active tile's inputs", () => {
    renderPalette();
    expect(screen.getByRole("textbox", { name: "Width (cm)" })).toHaveValue("40");
    expect(screen.getByRole("textbox", { name: "Height (cm)" })).toHaveValue("50");
    expect(screen.queryByRole("textbox", { name: "Side (cm)" })).not.toBeInTheDocument();
    expect(tile(/rectangle/)).toHaveAttribute("aria-pressed", "true");

    act(() => usePlannerStore.getState().setPaletteKind("circle"));
    expect(screen.getAllByRole("textbox").map((i) => i.getAttribute("aria-label"))).toEqual(["Diameter (cm)"]);
    expect(tile(/circle/)).toHaveAttribute("aria-pressed", "true");
  });

  it("writes typed sizes to the palette, clamped by the wall", async () => {
    renderPalette();
    const width = screen.getByRole("textbox", { name: "Width (cm)" });
    await userEvent.clear(width);
    await userEvent.type(width, "60{Enter}");
    expect(usePlannerStore.getState().paletteSizes.rect).toEqual({ w: 60, h: 50 });

    act(() => usePlannerStore.getState().setPaletteKind("square"));
    const side = screen.getByRole("textbox", { name: "Side (cm)" });
    await userEvent.clear(side);
    await userEvent.type(side, "260{Enter}");
    // 250 is the shorter wall side: out of range, nothing written.
    expect(side).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("Use 1–250 cm")).toBeInTheDocument();
    expect(usePlannerStore.getState().paletteSizes.square).toEqual({ w: 30, h: 30 });
  });

  it("adds an unselected frame on tap and makes the tile active", () => {
    renderPalette();
    const square = tile(/square/);
    for (let i = 0; i < 2; i++) {
      fireEvent.pointerDown(square, { ...pointer, clientX: 10, clientY: 10 });
      windowPointer("pointerup", { clientX: 11, clientY: 10 });
    }
    const { shapes, selectedId, paletteKind } = usePlannerStore.getState();
    expect(shapes.map((s) => s.kind)).toEqual(["square", "square"]);
    expect(shapes[0]).not.toMatchObject({ x: shapes[1].x, y: shapes[1].y });
    expect(selectedId).toBeNull();
    expect(paletteKind).toBe("square");
  });

  it("adds on Enter for keyboard users", () => {
    renderPalette();
    fireEvent.keyDown(tile(/circle/), { key: "Enter" });
    expect(usePlannerStore.getState().shapes.map((s) => s.kind)).toEqual(["circle"]);
  });

  it("starts a ghost past the slop and adds nothing when dropped off the wall", () => {
    renderPalette();
    fireEvent.pointerDown(tile(/circle/), { ...pointer, clientX: 10, clientY: 10 });
    windowPointer("pointermove", { clientX: 30, clientY: 10 });
    expect(screen.getByTestId("drag-ghost")).toHaveAttribute("data-kind", "circle");
    expect(usePlannerStore.getState().paletteKind).toBe("circle");
    // The wall ref is unattached, so every point is off the wall.
    windowPointer("pointerup", { clientX: 40, clientY: 10 });
    expect(usePlannerStore.getState().shapes).toEqual([]);
  });

  it("on desktop titles the section 'Frames'", () => {
    renderPalette("desktop");
    expect(within(screen.getByRole("region", { name: "Frames" })).getByRole("heading", { name: "Frames" })).toBeInTheDocument();
  });
});
