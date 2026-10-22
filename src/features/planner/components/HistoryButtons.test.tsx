import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { initialProject, initialUi } from "../state/actions";
import { usePlannerStore } from "../state/store";
import type { Shape } from "../types";
import { HistoryButtons } from "./HistoryButtons";

const A: Shape = { id: "a", kind: "rect", x: 20, y: 30, w: 40, h: 50, color: 4, mat: true };

const undoButton = () => screen.getByRole("button", { name: "Undo" });
const redoButton = () => screen.getByRole("button", { name: "Redo" });
const moveA = () => act(() => usePlannerStore.getState().commitShape("a", { x: 60 }));

beforeEach(() => {
  usePlannerStore.setState({ ...initialProject(), ...initialUi, shapes: [A] });
  usePlannerStore.temporal.getState().clear();
});

describe("HistoryButtons", () => {
  it("are disabled with no history, and follow it as frames change", () => {
    render(<HistoryButtons shell="desktop" />);
    expect(undoButton()).toBeDisabled();
    expect(redoButton()).toBeDisabled();

    moveA();
    expect(undoButton()).toBeEnabled();
    expect(redoButton()).toBeDisabled();

    fireEvent.click(undoButton());
    expect(usePlannerStore.getState().shapes[0].x).toBe(20);
    expect(undoButton()).toBeDisabled();
    expect(redoButton()).toBeEnabled();

    fireEvent.click(redoButton());
    expect(usePlannerStore.getState().shapes[0].x).toBe(60);
    expect(redoButton()).toBeDisabled();
  });

  it("are hidden on the stacked dock in Photo and Grid origin, where Done takes their slot (§4.6)", () => {
    render(<HistoryButtons shell="stacked" />);
    expect(undoButton()).toBeInTheDocument();
    act(() => usePlannerStore.getState().setMode("photo"));
    expect(screen.queryByRole("button", { name: "Undo" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Redo" })).not.toBeInTheDocument();
    act(() => usePlannerStore.getState().setMode("gridOrigin"));
    expect(screen.queryByRole("button", { name: "Undo" })).not.toBeInTheDocument();
    act(() => usePlannerStore.getState().setMode("arrange"));
    expect(undoButton()).toBeInTheDocument();
  });

  it("stay in the landscape right rail in Photo and Grid origin, disabled (§4.3)", () => {
    moveA();
    render(<HistoryButtons shell="landscape" />);
    expect(undoButton()).toBeEnabled();
    act(() => usePlannerStore.getState().setMode("photo"));
    expect(undoButton()).toBeDisabled();
    act(() => usePlannerStore.getState().setMode("gridOrigin"));
    expect(undoButton()).toBeDisabled();
  });

  it("work in every mode on desktop", () => {
    moveA();
    usePlannerStore.setState({ mode: "photo" });
    render(<HistoryButtons shell="desktop" />);
    expect(undoButton()).toBeEnabled();
  });
});
