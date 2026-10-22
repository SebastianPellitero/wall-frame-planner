import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { initialProject, initialUi } from "../../state/actions";
import { usePlannerStore } from "../../state/store";
import { MatrixControl } from "./MatrixControl";

beforeEach(() => {
  usePlannerStore.setState({ ...initialProject(), ...initialUi });
});

const grid = () => usePlannerStore.getState().grid;

describe("MatrixControl", () => {
  it("is the 'Matrix control' region with the grid fields and the Show grid switch", () => {
    render(<MatrixControl shell="desktop" />);
    const region = screen.getByRole("region", { name: "Matrix control" });
    expect(within(region).getByRole("heading", { name: "Matrix control" })).toBeInTheDocument();
    expect(within(region).getByRole("textbox", { name: "Grid height (cm)" })).toHaveValue("10");
    expect(within(region).getByRole("textbox", { name: "Grid width (cm)" })).toHaveValue("10");
    // Visible labels stay short (§5.16).
    expect(within(region).getByText("Height")).toBeInTheDocument();
    expect(within(region).getByRole("switch", { name: "Show grid" })).toHaveAttribute("aria-checked", "false");
  });

  it("writes the spacing (height = Y, width = X) and the switch to the store", async () => {
    render(<MatrixControl shell="desktop" />);
    const height = screen.getByRole("textbox", { name: "Grid height (cm)" });
    await userEvent.clear(height);
    await userEvent.type(height, "25{Enter}");
    const width = screen.getByRole("textbox", { name: "Grid width (cm)" });
    await userEvent.clear(width);
    await userEvent.type(width, "20{Enter}");
    expect(grid()).toMatchObject({ spacingY: 25, spacingX: 20, enabled: false });
    await userEvent.click(screen.getByRole("switch", { name: "Show grid" }));
    expect(grid().enabled).toBe(true);
    expect(screen.getByRole("switch", { name: "Show grid" })).toHaveAttribute("aria-checked", "true");
  });

  it("rejects spacing outside 1–100 cm", async () => {
    render(<MatrixControl shell="desktop" />);
    const width = screen.getByRole("textbox", { name: "Grid width (cm)" });
    await userEvent.clear(width);
    await userEvent.type(width, "0.5{Enter}");
    expect(width).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("Use 1–100 cm")).toBeInTheDocument();
    expect(grid().spacingX).toBe(10);
  });

  it("puts the switch first on landscape and after the fields on desktop (§5.16)", () => {
    const order = () =>
      [...document.querySelectorAll("[role=switch], input")].map((el) => el.getAttribute("aria-label") ?? el.textContent);
    const { unmount } = render(<MatrixControl shell="desktop" />);
    expect(order()).toEqual(["Grid height (cm)", "Grid width (cm)", "Show grid"]);
    unmount();
    render(<MatrixControl shell="landscape" />);
    expect(order()).toEqual(["Show grid", "Grid height (cm)", "Grid width (cm)"]);
    expect(screen.getByRole("textbox", { name: "Grid width (cm)" })).toHaveClass("pl-2");
  });
});
