import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { initialProject, initialUi } from "../../state/actions";
import { usePlannerStore } from "../../state/store";
import { GridSettings } from "./GridSettings";
import { SettingsSections } from "./SettingsSections";
import { WallSettings } from "./WallSettings";

beforeEach(() => {
  usePlannerStore.setState({ ...initialProject(), ...initialUi });
});

const state = () => usePlannerStore.getState();

async function typeAndEnter(name: string, value: string) {
  const field = screen.getByRole("textbox", { name });
  await userEvent.clear(field);
  await userEvent.type(field, `${value}{Enter}`);
  return field;
}

describe("WallSettings", () => {
  it("is the 'Wall' region with short visible labels and full accessible names", () => {
    render(<WallSettings />);
    const region = screen.getByRole("region", { name: "Wall" });
    expect(within(region).getByRole("textbox", { name: "Wall width (cm)" })).toHaveValue("300");
    expect(within(region).getByRole("textbox", { name: "Wall height (cm)" })).toHaveValue("250");
    expect(within(region).getByRole("textbox", { name: "Push gap (cm)" })).toHaveValue("3");
    expect(within(region).getByText("Width")).toBeInTheDocument();
    expect(within(region).getByText("Space kept between frames when they push each other apart.")).toBeInTheDocument();
  });

  it("commits the wall size through setWall, which clamps frames inside a shrunken wall", async () => {
    usePlannerStore.setState({ shapes: [{ id: "a", kind: "rect", x: 250, y: 20, w: 40, h: 50, color: 1 }] });
    render(<WallSettings />);
    await typeAndEnter("Wall width (cm)", "200");
    expect(state().wall.width).toBe(200);
    expect(state().shapes[0].x).toBe(160);
    await typeAndEnter("Wall height (cm)", "180");
    await typeAndEnter("Push gap (cm)", "5");
    expect(state().wall).toEqual({ width: 200, height: 180, pushGap: 5 });
  });

  it("rejects a wall under 10 cm and a push gap over 50 cm", async () => {
    render(<WallSettings />);
    expect(await typeAndEnter("Wall width (cm)", "9")).toHaveAttribute("aria-invalid", "true");
    expect(await typeAndEnter("Push gap (cm)", "51")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("Use 0–50 cm")).toBeInTheDocument();
    expect(state().wall).toEqual({ width: 300, height: 250, pushGap: 3 });
  });
});

describe("GridSettings", () => {
  it("Snap to grid writes the store and is disabled while the grid is off", async () => {
    render(<GridSettings shell="desktop" />);
    const snap = screen.getByRole("switch", { name: "Snap to grid" });
    expect(snap).toHaveAttribute("aria-checked", "true");
    expect(snap).toBeDisabled();
    act(() => state().setGrid({ enabled: true }));
    expect(snap).toBeEnabled();
    await userEvent.click(snap);
    expect(state().grid.snap).toBe(false);
    expect(snap).toHaveAttribute("aria-checked", "false");
  });

  it("reads out the origin and follows it live", () => {
    render(<GridSettings shell="desktop" />);
    expect(screen.getByText("Grid starts at 0 × 0 cm")).toBeInTheDocument();
    act(() => state().setGridOrigin({ x: 20, y: 40 }));
    expect(screen.getByText("Grid starts at 20 × 40 cm")).toBeInTheDocument();
  });

  it("'Set origin on the wall' enters Grid origin mode with the grid on, then tells the sheet", async () => {
    const onSetOrigin = vi.fn();
    render(<GridSettings shell="stacked" onSetOrigin={onSetOrigin} />);
    await userEvent.click(screen.getByRole("button", { name: "Set origin on the wall" }));
    expect(state().mode).toBe("gridOrigin");
    expect(state().grid.enabled).toBe(true);
    expect(onSetOrigin).toHaveBeenCalledOnce();
  });

  it("holds the Matrix control on stacked only, switch first (§5.6, §5.16)", () => {
    const { unmount } = render(<GridSettings shell="stacked" />);
    const matrix = screen.getByRole("region", { name: "Matrix control" });
    const order = [...matrix.querySelectorAll("[role=switch], input")].map((el) => el.getAttribute("aria-label") ?? el.textContent);
    expect(order).toEqual(["Show grid", "Grid height (cm)", "Grid width (cm)"]);
    unmount();
    for (const shell of ["landscape", "desktop"] as const) {
      const { unmount: u } = render(<GridSettings shell={shell} />);
      expect(screen.queryByRole("region", { name: "Matrix control" })).not.toBeInTheDocument();
      u();
    }
  });
});

describe("SettingsSections", () => {
  it("orders Wall, Grid, then Photo", () => {
    render(<SettingsSections shell="desktop" />);
    expect(screen.getAllByRole("heading").map((h) => h.textContent)).toEqual(["Wall", "Grid", "Photo"]);
    expect(screen.getByRole("region", { name: "Wall" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Grid" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Photo settings" })).toBeInTheDocument();
  });

  it("ends with Reset wall, the last button in the content", () => {
    render(<SettingsSections shell="desktop" />);
    expect(screen.getAllByRole("button").at(-1)).toHaveAccessibleName("Reset wall");
  });

  it.each(["stacked", "landscape", "desktop"] as const)("names every control once (%s)", (shell) => {
    render(<SettingsSections shell={shell} />);
    for (const name of ["Wall width (cm)", "Wall height (cm)", "Push gap (cm)"]) {
      expect(screen.getAllByRole("textbox", { name })).toHaveLength(1);
    }
    expect(screen.getAllByRole("switch", { name: "Snap to grid" })).toHaveLength(1);
  });
});
