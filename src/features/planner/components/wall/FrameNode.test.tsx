import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { initialProject, initialUi } from "../../state/actions";
import { useDragUi } from "../../state/dragUi";
import { usePlannerStore } from "../../state/store";
import type { Shape } from "../../types";
import { FrameNode } from "./FrameNode";

const RECT: Shape = { id: "r1", kind: "rect", x: 12.3, y: 40, w: 40, h: 50, color: 3 };

function renderFrame(shape: Shape = RECT, pxPerCm = 2) {
  usePlannerStore.setState({ shapes: [shape] });
  const result = render(<FrameNode shape={shape} pxPerCm={pxPerCm} />);
  return { ...result, frame: screen.getByTestId("frame") };
}

const pointer = { isPrimary: true, button: 0, pointerId: 1, pointerType: "mouse" };
const windowPointer = (type: string, init: Record<string, number>) => {
  const e = new Event(type) as Event & Record<string, number>;
  for (const [k, v] of Object.entries({ pointerId: 1, ...init })) Object.defineProperty(e, k, { value: v });
  act(() => void window.dispatchEvent(e));
};

beforeEach(() => {
  usePlannerStore.setState({ ...initialProject(), ...initialUi });
  useDragUi.getState().endDrag();
  useDragUi.setState({ spawnFrom: null });
});

describe("FrameNode", () => {
  it("renders the e2e data contract and an accessible name", () => {
    const { frame } = renderFrame();
    expect(frame).toHaveAttribute("data-shape-id", "r1");
    expect(frame).toHaveAttribute("data-kind", "rect");
    expect(frame).toHaveAttribute("data-x", "12.3");
    expect(frame).toHaveAttribute("data-y", "40.0");
    expect(frame).toHaveAttribute("data-w", "40.0");
    expect(frame).toHaveAttribute("data-h", "50.0");
    expect(screen.getByRole("button", { name: "Rectangle 40 × 50 cm" })).toBe(frame);
    expect(frame).toHaveAttribute("tabindex", "0");
    expect(frame).toHaveAttribute("aria-pressed", "false");
    expect(frame.style.width).toBe("80px");
    expect(frame.style.height).toBe("100px");
    expect(frame).toHaveClass("touch-none");
    expect(frame).toHaveAttribute("data-frame-color", "3");
  });

  it("draws square corners and the per-frame tokens (§3.1)", () => {
    const { frame } = renderFrame();
    const layers = [frame, ...frame.querySelectorAll("*")].filter((el) => el.tagName === "DIV");
    expect(layers.some((el) => [...el.classList].some((c) => c.startsWith("rounded")))).toBe(false);
    const body = frame.querySelector("[data-frame-body]") as HTMLElement;
    // Shadows are utilities on the colored subtree, never a bare var() inline (§2).
    expect(body).toHaveClass("shadow-frame-rest");
    expect(body.getAttribute("style") ?? "").not.toMatch(/shadow/);
    expect(body.firstElementChild).toHaveClass("bg-mat", "inset-shadow-mat");
    expect(screen.getByText("40 × 50")).toHaveClass("text-frame-ink");
  });

  it("names circles by diameter", () => {
    renderFrame({ id: "c1", kind: "circle", x: 0, y: 0, w: 30, h: 30, color: 1 });
    expect(screen.getByRole("button", { name: "Circle Ø 30 cm" })).toBeInTheDocument();
  });

  it("switches the label tier with the on-screen size", () => {
    const square: Shape = { id: "s1", kind: "square", x: 0, y: 0, w: 40, h: 40, color: 1 };
    const { rerender } = renderFrame(square, 2);
    expect(screen.getByText("40 × 40")).toHaveClass("text-caption", "font-stretch-semi-condensed");
    rerender(<FrameNode shape={square} pxPerCm={1} />);
    expect(screen.getByText("40×40")).toHaveClass("text-micro", "font-stretch-condensed");
    rerender(<FrameNode shape={square} pxPerCm={0.5} />);
    expect(screen.queryByText(/40/)).not.toBeInTheDocument();
  });

  it("selects on tap and on Enter, and shows the brackets when selected", () => {
    const { frame } = renderFrame();
    expect(screen.queryByTestId("selection-brackets")).not.toBeInTheDocument();
    fireEvent.pointerDown(frame, { ...pointer, clientX: 10, clientY: 10 });
    windowPointer("pointerup", { clientX: 11, clientY: 10 });
    expect(usePlannerStore.getState().selectedId).toBe("r1");
    expect(frame).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("selection-brackets")).toHaveAttribute("stroke-linecap", "square");
    expect(screen.getByTestId("selection-brackets")).toHaveAttribute("stroke-linejoin", "miter");

    act(() => usePlannerStore.getState().select(null));
    fireEvent.keyDown(frame, { key: "Enter" });
    expect(usePlannerStore.getState().selectedId).toBe("r1");
  });

  it("writes the store once, on release, never while the pointer moves", () => {
    const { frame } = renderFrame();
    let shapeWrites = 0;
    const unsubscribe = usePlannerStore.subscribe((s, prev) => void (s.shapes !== prev.shapes && shapeWrites++));

    fireEvent.pointerDown(frame, { ...pointer, clientX: 100, clientY: 100 });
    for (let i = 1; i <= 10; i++) windowPointer("pointermove", { clientX: 100 + i * 4, clientY: 100 });
    expect(shapeWrites).toBe(0);
    expect(useDragUi.getState().draggingId).toBe("r1");
    expect(usePlannerStore.getState().selectedId).toBe("r1");
    expect(frame).toHaveClass("z-frame-lifted");

    windowPointer("pointerup", { clientX: 140, clientY: 100 });
    unsubscribe();
    expect(shapeWrites).toBe(1);
    // 40 px at 2 px/cm = 20 cm to the right
    expect(usePlannerStore.getState().shapes[0]).toMatchObject({ x: 32.3, y: 40 });
    expect(useDragUi.getState().draggingId).toBeNull();
    expect(frame).toHaveClass("z-frames");
  });

  it("commits on pointercancel like a drop", () => {
    const { frame } = renderFrame();
    fireEvent.pointerDown(frame, { ...pointer, clientX: 100, clientY: 100 });
    windowPointer("pointermove", { clientX: 100, clientY: 120 });
    windowPointer("pointercancel", { clientX: 0, clientY: 0 });
    expect(usePlannerStore.getState().shapes[0]).toMatchObject({ x: 12.3, y: 50 });
  });

  it("is non-interactive outside Arrange mode", () => {
    usePlannerStore.setState({ mode: "photo" });
    const { frame } = renderFrame();
    expect(frame).toHaveClass("pointer-events-none");
    expect(frame).toHaveAttribute("tabindex", "-1");
    fireEvent.pointerDown(frame, { ...pointer, clientX: 10, clientY: 10 });
    windowPointer("pointerup", { clientX: 10, clientY: 10 });
    fireEvent.keyDown(frame, { key: "Enter" });
    expect(usePlannerStore.getState().selectedId).toBeNull();
  });

  it("a duplicate starts over the original and takes its spawn point (§6.3)", () => {
    useDragUi.getState().setSpawnFrom("r1", { x: 5, y: 10 });
    const { frame } = renderFrame();
    // At 2 px/cm the original's (5, 10) cm is (10, 20) px; the copy's own spot is (24.6, 80).
    expect(frame.style.transform).toMatch(/translateX\(10px\) translateY\(20px\)/);
    expect(useDragUi.getState().spawnFrom).toBeNull();
  });

  it("a frame without a spawn point starts at its own spot", () => {
    useDragUi.getState().setSpawnFrom("someone-else", { x: 5, y: 10 });
    const { frame } = renderFrame();
    expect(frame.style.transform).toMatch(/translateX\(24\.6px\) translateY\(80px\)/);
    expect(useDragUi.getState().spawnFrom).not.toBeNull();
  });

  it("hides the brackets in Photo mode even when selected", () => {
    usePlannerStore.setState({ mode: "photo", selectedId: "r1" });
    renderFrame();
    expect(screen.queryByTestId("selection-brackets")).not.toBeInTheDocument();
  });
});
