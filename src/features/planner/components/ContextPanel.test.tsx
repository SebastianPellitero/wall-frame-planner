import { act, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { beforeEach, describe, expect, it } from "vitest";
import type { Shell } from "../hooks/useShell";
import { initialProject, initialUi } from "../state/actions";
import { usePlannerStore } from "../state/store";
import { ContextPanel } from "./ContextPanel";
import { WallContext } from "./wall/WallContext";

/** The Frame creator reads the wall scale and ref, so the panel renders inside the wall context. */
function renderPanel(shell: Shell) {
  const value = { pxPerCm: 2, wallRef: createRef<HTMLDivElement>(), wallPx: { w: 600, h: 500 } };
  return render(
    <WallContext value={value}>
      <ContextPanel shell={shell} />
    </WallContext>,
  );
}

const PANELS = ["Frame creator", "Selected frame", "Photo tools", "Grid origin"];

function expectOnly(name: string) {
  expect(screen.getByRole("region", { name })).toBeInTheDocument();
  for (const other of PANELS.filter((p) => p !== name)) {
    expect(screen.queryByRole("region", { name: other })).not.toBeInTheDocument();
  }
}

const selectNewShape = () => act(() => void usePlannerStore.getState().addShape("rect"));

beforeEach(() => {
  usePlannerStore.setState({ ...initialProject(), ...initialUi });
});

describe("ContextPanel", () => {
  it.each(["stacked", "landscape", "desktop"] as const)("shows the palette in Arrange with nothing selected (%s)", (shell) => {
    renderPanel(shell);
    expectOnly("Frame creator");
  });

  it.each(["stacked", "landscape"] as const)("shows the selection when a frame is selected (%s)", (shell) => {
    renderPanel(shell);
    selectNewShape();
    expectOnly("Selected frame");
    act(() => usePlannerStore.getState().select(null));
    expectOnly("Frame creator");
  });

  it("keeps the palette on desktop, where the selection lives in the right panel", () => {
    renderPanel("desktop");
    selectNewShape();
    expectOnly("Frame creator");
  });

  it.each(["stacked", "landscape", "desktop"] as const)("shows the photo and origin tools by mode, even with a selection (%s)", (shell) => {
    renderPanel(shell);
    selectNewShape();
    act(() => usePlannerStore.getState().setMode("photo"));
    expectOnly("Photo tools");
    act(() => usePlannerStore.getState().setMode("gridOrigin"));
    expectOnly("Grid origin");
    act(() => usePlannerStore.getState().setMode("arrange"));
    expectOnly(shell === "desktop" ? "Frame creator" : "Selected frame");
  });

  it.each(["landscape", "desktop"] as const)("shows the Matrix control under the Frame creator (%s)", (shell) => {
    renderPanel(shell);
    const creator = screen.getByRole("region", { name: "Frame creator" });
    const matrix = screen.getByRole("region", { name: "Matrix control" });
    expect(creator.compareDocumentPosition(matrix) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("leaves the Matrix control to Settings on stacked, where the dock has no room (§4.2)", () => {
    renderPanel("stacked");
    expect(screen.queryByRole("region", { name: "Matrix control" })).not.toBeInTheDocument();
    expect(screen.getByTestId("context-panel")).toHaveClass("h-[128px]");
  });

  it("keeps the same container element while the content swaps", () => {
    renderPanel("stacked");
    const container = screen.getByTestId("context-panel");
    act(() => usePlannerStore.getState().setMode("photo"));
    expect(screen.getByTestId("context-panel")).toBe(container);
  });
});
