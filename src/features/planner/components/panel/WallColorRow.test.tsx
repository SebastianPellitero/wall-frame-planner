import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { initialProject, initialUi } from "../../state/actions";
import { usePlannerStore } from "../../state/store";
import { useWallPaintPreview } from "../../state/wallPaintUi";
import { WallColorRow } from "./WallColorRow";
import { WallSettings } from "./WallSettings";

beforeEach(() => {
  usePlannerStore.setState({ ...initialProject(), ...initialUi });
  useWallPaintPreview.setState({ color: null });
});

const color = () => usePlannerStore.getState().wall.color;
const radio = (name: string) => screen.getByRole("radio", { name });
const custom = () => screen.getByLabelText("Custom") as HTMLInputElement;

describe("WallColorRow", () => {
  it("sits in the Wall section as the 'Wall color' radiogroup of eight swatches plus Custom", () => {
    render(<WallSettings />);
    const group = within(screen.getByRole("region", { name: "Wall" })).getByRole("radiogroup", { name: "Wall color" });
    expect(within(group).getAllByRole("radio").map((r) => r.getAttribute("aria-label"))).toEqual([
      "Gallery white",
      "Warm linen",
      "Plaster pink",
      "Pale sage",
      "Mist blue",
      "Stone",
      "Forest green",
      "Charcoal",
    ]);
    expect(custom()).toHaveAttribute("type", "color");
    expect(custom()).toHaveValue("#f4f5f1");
  });

  it("checks the current swatch, shows its name, and gives it the only tab stop", () => {
    render(<WallColorRow />);
    expect(radio("Gallery white")).toHaveAttribute("aria-checked", "true");
    expect(radio("Gallery white")).toHaveAttribute("tabindex", "0");
    expect(radio("Stone")).toHaveAttribute("aria-checked", "false");
    expect(radio("Stone")).toHaveAttribute("tabindex", "-1");
    expect(screen.getByText("Gallery white", { selector: "span" })).toHaveClass("text-ink-muted");
  });

  it("commits a clicked swatch at once, outside history", async () => {
    render(<WallColorRow />);
    const past = usePlannerStore.temporal.getState().pastStates.length;
    await userEvent.click(radio("Pale sage"));
    expect(color()).toBe("#d3dbcb");
    expect(radio("Pale sage")).toHaveAttribute("aria-checked", "true");
    expect(usePlannerStore.temporal.getState().pastStates).toHaveLength(past);
  });

  it("moves and selects with the arrow keys, wrapping around", async () => {
    render(<WallColorRow />);
    radio("Gallery white").focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(color()).toBe("#ebe3d3");
    expect(radio("Warm linen")).toHaveFocus();
    await userEvent.keyboard("{ArrowLeft}{ArrowUp}");
    expect(color()).toBe("#34383b");
    expect(radio("Charcoal")).toHaveFocus();
    await userEvent.keyboard("{ArrowDown}");
    expect(radio("Gallery white")).toHaveFocus();
  });

  it("previews Custom on input without touching the store, and commits once on change", () => {
    render(<WallColorRow />);
    fireEvent.input(custom(), { target: { value: "#8a6f5c" } });
    expect(useWallPaintPreview.getState().color).toBe("#8a6f5c");
    expect(color()).toBe("#f4f5f1");
    fireEvent.change(custom(), { target: { value: "#8a6f5c" } });
    expect(color()).toBe("#8a6f5c");
    expect(useWallPaintPreview.getState().color).toBeNull();
  });

  it("with a color off the swatches: no radio checked, the first takes Tab, Custom is active", () => {
    usePlannerStore.getState().setWall({ color: "#8A6F5C" });
    render(<WallColorRow />);
    expect(screen.queryByRole("radio", { checked: true })).not.toBeInTheDocument();
    expect(radio("Gallery white")).toHaveAttribute("tabindex", "0");
    expect(screen.getByText("Custom #8a6f5c")).toBeInTheDocument();
    const tile = custom().closest("label")!;
    expect(tile).toHaveClass("border-solid", "ring-2", "ring-accent", "text-on-inverse");
    expect(tile.style.backgroundColor).toBe("rgb(138, 111, 92)");
    expect(custom()).toHaveValue("#8a6f5c");
  });

  it("marks the checked chip with a check in the ink that reads on it", async () => {
    render(<WallColorRow />);
    expect(radio("Gallery white").querySelector("svg")).toHaveClass("text-ink");
    await userEvent.click(radio("Forest green"));
    expect(radio("Forest green").querySelector("svg")).toHaveClass("text-on-inverse");
    expect(radio("Gallery white").querySelector("svg")).toBeNull();
  });
});
