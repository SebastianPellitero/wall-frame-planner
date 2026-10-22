import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { createRef } from "react";
import { beforeEach, describe, expect, it } from "vitest";
import type { Shell } from "../../hooks/useShell";
import { initialProject, initialUi } from "../../state/actions";
import { useDragUi } from "../../state/dragUi";
import { usePlannerStore } from "../../state/store";
import type { Shape } from "../../types";
import { ContextPanel } from "../ContextPanel";
import { textColors } from "../ui/textColors.testUtil";
import { WallContext } from "../wall/WallContext";
import { SelectionBar } from "./SelectionBar";

const A: Shape = { id: "a", kind: "rect", x: 20, y: 30, w: 40, h: 50, color: 4, mat: true };
const B: Shape = { id: "b", kind: "rect", x: 70, y: 30, w: 40, h: 50, color: 6, mat: true };
const SQUARE: Shape = { id: "s", kind: "square", x: 0, y: 0, w: 30, h: 30, color: 2, mat: true };
const CIRCLE: Shape = { id: "c", kind: "circle", x: 0, y: 0, w: 30, h: 30, color: 1, mat: true };

function select(shapes: Shape[], id: string) {
  usePlannerStore.setState({ shapes, selectedId: id });
  usePlannerStore.temporal.getState().clear();
}

/** The context panel, as the phones show it: the selection replaces the Frame creator. */
function renderPanel(shell: Shell) {
  const value = { pxPerCm: 2, wallRef: createRef<HTMLDivElement>(), wallPx: { w: 600, h: 500 } };
  return render(
    <WallContext value={value}>
      <ContextPanel shell={shell} />
    </WallContext>,
  );
}

const bar = () => within(screen.getByRole("region", { name: "Selected frame" }));
const field = (name: string) => bar().getByRole("textbox", { name });
const shape = (id: string) => usePlannerStore.getState().shapes.find((s) => s.id === id);

function typeAndEnter(name: string, value: string) {
  const input = field(name);
  fireEvent.change(input, { target: { value } });
  fireEvent.keyDown(input, { key: "Enter" });
}

beforeEach(() => {
  usePlannerStore.setState({ ...initialProject(), ...initialUi });
  usePlannerStore.temporal.getState().clear();
  useDragUi.setState({ spawnFrom: null });
});

describe("SelectionBar", () => {
  it.each(["stacked", "landscape", "desktop"] as const)("shows Width, Height, X and Y for a rectangle (%s)", (shell) => {
    select([A], "a");
    render(<SelectionBar shell={shell} />);
    const names = bar()
      .getAllByRole("textbox")
      .map((el) => el.getAttribute("aria-label"));
    expect(names).toEqual(["Width (cm)", "Height (cm)", "X (cm)", "Y (cm)"]);
    expect(field("Width (cm)")).toHaveValue("40");
    expect(field("Y (cm)")).toHaveValue("30");
    expect(bar().getByRole("button", { name: "Duplicate" })).toBeInTheDocument();
    expect(bar().getByRole("button", { name: "Delete" })).toBeInTheDocument();
  });

  it("shows Side for a square and Diameter for a circle, then X and Y", () => {
    select([SQUARE], "s");
    const { unmount } = render(<SelectionBar shell="desktop" />);
    expect(bar().getAllByRole("textbox").map((el) => el.getAttribute("aria-label"))).toEqual(["Side (cm)", "X (cm)", "Y (cm)"]);
    unmount();
    select([CIRCLE], "c");
    render(<SelectionBar shell="desktop" />);
    expect(bar().getAllByRole("textbox").map((el) => el.getAttribute("aria-label"))).toEqual(["Diameter (cm)", "X (cm)", "Y (cm)"]);
  });

  it("commits X through the store, which pushes the neighbor clear", () => {
    select([A, B], "a");
    render(<SelectionBar shell="desktop" />);
    typeAndEnter("X (cm)", "50");
    expect(shape("a")).toMatchObject({ x: 50, y: 30 });
    const b = shape("b")!;
    const apart = b.x >= 50 + 40 || b.x + b.w <= 50 || b.y >= 30 + 50 || b.y + b.h <= 30;
    expect(apart).toBe(true);
    expect(usePlannerStore.temporal.getState().pastStates).toHaveLength(1);
  });

  it("sets a square's side on both axes", () => {
    select([SQUARE], "s");
    render(<SelectionBar shell="desktop" />);
    typeAndEnter("Side (cm)", "45");
    expect(shape("s")).toMatchObject({ w: 45, h: 45 });
  });

  it("limits X and Y so the frame stays on the wall", () => {
    select([A], "a");
    render(<SelectionBar shell="desktop" />);
    typeAndEnter("X (cm)", "261");
    expect(field("X (cm)")).toHaveAttribute("aria-invalid", "true");
    expect(bar().getByText("Use 0–260 cm")).toBeInTheDocument();
    expect(shape("a")!.x).toBe(20);
    typeAndEnter("Y (cm)", "200");
    expect(shape("a")!.y).toBe(200);
  });

  it("follows the frame live when it moves by another path", () => {
    select([A], "a");
    render(<SelectionBar shell="desktop" />);
    act(() => usePlannerStore.getState().commitShape("a", { x: 99 }));
    expect(field("X (cm)")).toHaveValue("99");
  });

  it("Duplicate selects a copy that springs out from the original", () => {
    select([A], "a");
    render(<SelectionBar shell="desktop" />);
    fireEvent.click(bar().getByRole("button", { name: "Duplicate" }));
    const { shapes, selectedId } = usePlannerStore.getState();
    expect(shapes).toHaveLength(2);
    expect(selectedId).not.toBe("a");
    expect(useDragUi.getState().spawnFrom).toEqual({ id: selectedId, from: { x: 20, y: 30 } });
  });

  it.each(["stacked", "landscape"] as const)("Delete removes the frame, returns to the Frame creator and keeps focus off <body> (%s)", async (shell) => {
    select([A], "a");
    renderPanel(shell);
    const del = bar().getByRole("button", { name: "Delete" });
    del.focus();
    fireEvent.click(del);
    expect(shape("a")).toBeUndefined();
    expect(usePlannerStore.getState().selectedId).toBeNull();
    expect(screen.getByRole("region", { name: "Frame creator" })).toBeInTheDocument();
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("radio", { name: "Rectangle" })));
  });

  it.each(["stacked", "landscape", "desktop"] as const)("Delete is danger red: text-danger is its only text color (%s)", (shell) => {
    select([A], "a");
    render(<SelectionBar shell={shell} />);
    expect(textColors(bar().getByRole("button", { name: "Delete" }).className)).toEqual(["text-danger"]);
    expect(textColors(bar().getByRole("button", { name: "Duplicate" }).className)).toEqual(["text-ink"]);
  });

  it("landscape: a header with the size readout and Deselect", async () => {
    select([A], "a");
    renderPanel("landscape");
    expect(bar().getByText("40 × 50 cm")).toBeInTheDocument();
    const deselect = bar().getByRole("button", { name: "Deselect" });
    deselect.focus();
    fireEvent.click(deselect);
    expect(usePlannerStore.getState().selectedId).toBeNull();
    expect(shape("a")).toBeDefined();
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("radio", { name: "Rectangle" })));
  });

  it("landscape: each compact pair shares one helper line below it (§5.2)", () => {
    select([A], "a");
    renderPanel("landscape");
    typeAndEnter("X (cm)", "999");
    const helpers = () => bar().getAllByTestId("field-helper");
    expect(helpers()).toHaveLength(1);
    expect(helpers()[0]).toHaveClass("col-span-2", "whitespace-nowrap");
    expect(field("X (cm)")).toHaveAccessibleDescription("Use 0–260 cm");
    // After the X/Y pair.
    expect(field("Y (cm)").closest("label")!.nextElementSibling).toBe(helpers()[0]);

    typeAndEnter("Width (cm)", "0");
    expect(helpers()).toHaveLength(2);
    // After the Width/Height pair, before X.
    expect(field("Height (cm)").closest("label")!.nextElementSibling).toBe(helpers()[0]);
    expect(field("Width (cm)")).toHaveAccessibleDescription("Use 1–300 cm");
  });

  it("only landscape has Deselect; the other shells deselect by tapping the wall or Esc", () => {
    select([A], "a");
    render(<SelectionBar shell="stacked" />);
    expect(bar().queryByRole("button", { name: "Deselect" })).not.toBeInTheDocument();
  });
});
