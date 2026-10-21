import { act, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { beforeEach, describe, expect, it } from "vitest";
import type { Shell } from "../../hooks/useShell";
import { initialProject, initialUi } from "../../state/actions";
import { usePlannerStore } from "../../state/store";
import { WallContext } from "./WallContext";
import { WallStage } from "./WallStage";

function renderStage({ pxPerCm = 2, shell = "landscape" as Shell } = {}) {
  const { width, height } = usePlannerStore.getState().wall;
  const value = { pxPerCm, wallRef: createRef<HTMLDivElement>(), wallPx: { w: width * pxPerCm, h: height * pxPerCm } };
  const result = render(
    <WallContext value={value}>
      <WallStage stageRef={() => {}} shell={shell} />
    </WallContext>,
  );
  return { ...result, wallRef: value.wallRef };
}

const EMPTY_COPY = /Drag a frame onto the wall, or/;

beforeEach(() => {
  usePlannerStore.setState({ ...initialProject(), ...initialUi });
});

describe("WallStage", () => {
  it("draws the wall to scale and exposes it through wallRef", () => {
    const { wallRef } = renderStage({ pxPerCm: 2 });
    const wall = screen.getByTestId("wall");
    expect(wall.style.width).toBe("600px");
    expect(wall.style.height).toBe("500px");
    expect(wall).toHaveClass("touch-none");
    expect(wallRef.current).toBe(wall);
  });

  it("draws no wall before the stage is measured", () => {
    renderStage({ pxPerCm: 0 });
    expect(screen.queryByTestId("wall")).not.toBeInTheDocument();
  });

  it("shows the empty-wall copy with tap/click switched by CSS only", () => {
    renderStage();
    const copy = screen.getByText(EMPTY_COPY);
    expect(copy).toHaveTextContent("Drag a frame onto the wall, or tapclick one to add it.");
    expect(screen.getByText("tap")).toHaveClass("can-hover:hidden");
    expect(screen.getByText("click")).toHaveClass("hidden", "can-hover:inline");
  });

  it("hides the empty-wall copy once the wall has a frame, and outside Arrange", () => {
    renderStage();
    act(() => void usePlannerStore.getState().addShape("rect"));
    expect(screen.queryByText(EMPTY_COPY)).not.toBeInTheDocument();
    act(() => usePlannerStore.setState({ shapes: [], mode: "photo" }));
    expect(screen.queryByText(EMPTY_COPY)).not.toBeInTheDocument();
  });

  it("makes the whole stage touch-none in Photo mode only", () => {
    renderStage();
    const stage = screen.getByTestId("stage");
    expect(stage).not.toHaveClass("touch-none");
    act(() => usePlannerStore.getState().setMode("photo"));
    expect(stage).toHaveClass("touch-none");
  });

  it("shows the wall dimensions on desktop only", () => {
    const { unmount } = renderStage({ shell: "desktop" });
    expect(screen.getByText("300 cm")).toBeInTheDocument();
    expect(screen.getByText("250 cm")).toBeInTheDocument();
    unmount();
    renderStage({ shell: "landscape" });
    expect(screen.queryByText("300 cm")).not.toBeInTheDocument();
  });
});

describe("GridLayer", () => {
  it("is not drawn while the grid is off", () => {
    renderStage();
    expect(screen.queryByTestId("grid")).not.toBeInTheDocument();
  });

  it("draws a line per grid position and marks the origin lines", () => {
    usePlannerStore.setState({ grid: { ...initialProject().grid, enabled: true, spacingX: 100, spacingY: 50, originX: 50, originY: 0 } });
    renderStage({ pxPerCm: 2 });
    const grid = screen.getByTestId("grid");
    expect(grid).toHaveClass("pointer-events-none");
    // x: 50 (origin), 150, 250; y: 0 (origin), 50, 100, 150, 200, 250
    expect(grid.querySelectorAll("[data-line='grid']")).toHaveLength(2 + 5);
    const origin = grid.querySelectorAll("[data-line='origin']");
    expect(origin).toHaveLength(2);
    expect(origin[0].getAttribute("x1")).toBe("100.5");
    expect(screen.getByTestId("grid-origin-marker")).toBeInTheDocument();
  });

  it("shows the origin marker in Grid origin mode even with the grid off", () => {
    usePlannerStore.setState({ mode: "gridOrigin" });
    renderStage();
    expect(screen.getByTestId("grid-origin-marker")).toBeInTheDocument();
    expect(screen.getByTestId("grid").querySelectorAll("[data-line]")).toHaveLength(0);
  });
});
