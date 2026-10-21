import { act, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { beforeEach, describe, expect, it } from "vitest";
import type { Shell } from "../hooks/useShell";
import { initialProject, initialUi } from "../state/actions";
import { usePlannerStore } from "../state/store";
import { ContextPanel } from "./ContextPanel";
import { WallContext } from "./wall/WallContext";

/** The palette reads the wall scale and ref, so the panel renders inside the wall context. */
function renderPanel(shell: Shell) {
  const value = { pxPerCm: 2, wallRef: createRef<HTMLDivElement>(), wallPx: { w: 600, h: 500 } };
  return render(
    <WallContext value={value}>
      <ContextPanel shell={shell} />
    </WallContext>,
  );
}

const PANELS = ["Frames", "Selected frame", "Photo", "Grid origin"];

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
    expectOnly("Frames");
  });

  it.each(["stacked", "landscape"] as const)("shows the selection when a frame is selected (%s)", (shell) => {
    renderPanel(shell);
    selectNewShape();
    expectOnly("Selected frame");
    act(() => usePlannerStore.getState().select(null));
    expectOnly("Frames");
  });

  it("keeps the palette on desktop, where the selection lives in the right panel", () => {
    renderPanel("desktop");
    selectNewShape();
    expectOnly("Frames");
  });

  it.each(["stacked", "landscape", "desktop"] as const)("shows the photo and origin tools by mode, even with a selection (%s)", (shell) => {
    renderPanel(shell);
    selectNewShape();
    act(() => usePlannerStore.getState().setMode("photo"));
    expectOnly("Photo");
    act(() => usePlannerStore.getState().setMode("gridOrigin"));
    expectOnly("Grid origin");
    act(() => usePlannerStore.getState().setMode("arrange"));
    expectOnly(shell === "desktop" ? "Frames" : "Selected frame");
  });

  it("keeps the same container element while the content swaps", () => {
    renderPanel("stacked");
    const container = screen.getByTestId("context-panel");
    act(() => usePlannerStore.getState().setMode("photo"));
    expect(screen.getByTestId("context-panel")).toBe(container);
  });
});
