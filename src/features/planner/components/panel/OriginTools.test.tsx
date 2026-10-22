import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { initialProject, initialUi } from "../../state/actions";
import { usePlannerStore } from "../../state/store";
import { OriginTools } from "./OriginTools";

beforeEach(() => {
  usePlannerStore.setState({ ...initialProject(), ...initialUi });
  act(() => usePlannerStore.getState().setMode("gridOrigin"));
  act(() => usePlannerStore.getState().setGridOrigin({ x: 20, y: 40 }));
});

const tools = () => within(screen.getByRole("region", { name: "Grid origin" }));

describe("OriginTools", () => {
  it.each(["stacked", "landscape", "desktop"] as const)("shows the instruction and a live readout (%s)", (shell) => {
    render(<OriginTools shell={shell} />);
    expect(tools().getByText("Tap the wall where the grid should start.")).toBeInTheDocument();
    expect(tools().getByText("Grid starts at 20 × 40 cm")).toBeInTheDocument();
    act(() => usePlannerStore.getState().setGridOrigin({ x: 12.5, y: 0 }));
    expect(tools().getByText("Grid starts at 12.5 × 0 cm")).toBeInTheDocument();
  });

  it("Reset to corner puts the origin at 0 × 0 and stays in the mode", async () => {
    render(<OriginTools shell="landscape" />);
    await userEvent.click(tools().getByRole("button", { name: "Reset to corner" }));
    expect(usePlannerStore.getState().grid).toMatchObject({ originX: 0, originY: 0 });
    expect(usePlannerStore.getState().mode).toBe("gridOrigin");
    expect(tools().getByText("Grid starts at 0 × 0 cm")).toBeInTheDocument();
  });

  it("Done returns to Arrange", async () => {
    render(<OriginTools shell="stacked" />);
    await userEvent.click(tools().getByRole("button", { name: "Done" }));
    expect(usePlannerStore.getState().mode).toBe("arrange");
  });
});
