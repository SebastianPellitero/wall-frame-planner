import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { createRef } from "react";
import { beforeEach, describe, expect, it } from "vitest";
import type { Shell } from "../hooks/useShell";
import { initialProject, initialUi } from "../state/actions";
import { usePlannerStore } from "../state/store";
import { ContextPanel } from "./ContextPanel";
import { WallContext } from "./wall/WallContext";

/** The Frame creator reads the wall scale and ref, so the panel renders inside the wall context. */
function renderPanel(shell: Shell, narrow?: boolean) {
  const value = { pxPerCm: 2, wallRef: createRef<HTMLDivElement>(), wallPx: { w: 600, h: 500 } };
  return render(
    <WallContext value={value}>
      <ContextPanel shell={shell} narrow={narrow} />
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
  it.each(["landscape", "desktop"] as const)("its scrolling body pans vertically only, so a pinch never zooms the page (%s)", (shell) => {
    renderPanel(shell);
    expect(screen.getByTestId("context-scroller")).toHaveClass("overflow-y-auto", "touch-pan-y");
  });


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

  it("narrow desktop: a selection takes the sidebar, titled, with labelled actions (§4.4)", () => {
    renderPanel("desktop", true);
    selectNewShape();
    expectOnly("Selected frame");
    const region = screen.getByRole("region", { name: "Selected frame" });
    expect(within(region).getByRole("heading", { name: "Selected frame" })).toHaveClass("font-serif", "text-title");
    expect(within(region).getByRole("button", { name: "Duplicate" })).toHaveTextContent("Duplicate");
    expect(within(region).getByRole("button", { name: "Delete" })).toHaveTextContent("Delete");
    act(() => usePlannerStore.getState().select(null));
    expectOnly("Frame creator");
  });

  describe("bottom fade on a scrolling rail or sidebar (§4.3)", () => {
    /** Gives the scroller a layout jsdom lacks, then scrolls it. */
    function layout(el: HTMLElement, { scrollHeight, clientHeight, scrollTop }: { scrollHeight: number; clientHeight: number; scrollTop: number }) {
      Object.defineProperty(el, "scrollHeight", { configurable: true, value: scrollHeight });
      Object.defineProperty(el, "clientHeight", { configurable: true, value: clientHeight });
      el.scrollTop = scrollTop;
      fireEvent.scroll(el);
    }

    it.each(["landscape", "desktop"] as const)("is set while more content sits below the fold (%s)", (shell) => {
      renderPanel(shell);
      const scroller = screen.getByTestId("context-scroller");
      expect(scroller).not.toHaveAttribute("data-more");
      expect(scroller.className).toContain("data-more:[mask-image:linear-gradient(to_bottom,#000_calc(100%-16px),transparent)]");
      layout(scroller, { scrollHeight: 405, clientHeight: 340, scrollTop: 0 });
      expect(scroller).toHaveAttribute("data-more");
      layout(scroller, { scrollHeight: 405, clientHeight: 340, scrollTop: 65 });
      expect(scroller).not.toHaveAttribute("data-more");
    });

    it("is never applied to the stacked dock, which does not scroll", () => {
      renderPanel("stacked");
      const scroller = screen.getByTestId("context-scroller");
      expect(scroller.className).not.toContain("mask-image");
      layout(scroller, { scrollHeight: 405, clientHeight: 128, scrollTop: 0 });
      expect(scroller).not.toHaveAttribute("data-more");
    });
  });
});
