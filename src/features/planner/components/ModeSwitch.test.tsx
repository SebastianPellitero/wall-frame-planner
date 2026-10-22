import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { usePlannerStore } from "../state/store";
import { ModeSwitch } from "./ModeSwitch";

beforeEach(() => {
  usePlannerStore.setState({ mode: "arrange" });
});

describe("ModeSwitch", () => {
  it.each(["horizontal", "vertical"] as const)("exposes the three modes as radios by name (%s)", (orientation) => {
    render(<ModeSwitch orientation={orientation} />);
    expect(screen.getByRole("radiogroup", { name: "Mode" })).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(3);
    for (const name of ["Arrange", "Photo", "Grid origin"]) {
      expect(screen.getByRole("radio", { name })).toBeInTheDocument();
    }
    expect(screen.getByRole("radio", { name: "Arrange" })).toBeChecked();
  });

  it("sets the store mode on click", async () => {
    render(<ModeSwitch orientation="horizontal" />);
    await userEvent.click(screen.getByRole("radio", { name: "Photo" }));
    expect(usePlannerStore.getState().mode).toBe("photo");
    expect(screen.getByRole("radio", { name: "Photo" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Arrange" })).not.toBeChecked();
  });

  it("reflects mode changes made elsewhere", async () => {
    const { rerender } = render(<ModeSwitch orientation="horizontal" />);
    usePlannerStore.getState().setMode("gridOrigin");
    rerender(<ModeSwitch orientation="horizontal" />);
    expect(await screen.findByRole("radio", { name: "Grid origin", checked: true })).toBeInTheDocument();
  });

  it("is one tab stop on the checked radio, and arrow keys move the selection", async () => {
    render(<ModeSwitch orientation="vertical" />);
    await userEvent.tab();
    expect(screen.getByRole("radio", { name: "Arrange" })).toHaveFocus();
    await userEvent.keyboard("{ArrowDown}");
    expect(usePlannerStore.getState().mode).toBe("photo");
    expect(screen.getByRole("radio", { name: "Photo" })).toHaveFocus();
    await userEvent.keyboard("{ArrowRight}{ArrowRight}");
    expect(usePlannerStore.getState().mode).toBe("arrange");
    await userEvent.keyboard("{ArrowLeft}");
    expect(usePlannerStore.getState().mode).toBe("gridOrigin");
    await userEvent.keyboard("{Home}");
    expect(usePlannerStore.getState().mode).toBe("arrange");
    await userEvent.keyboard("{End}");
    expect(usePlannerStore.getState().mode).toBe("gridOrigin");
  });

  it("vertical: below 340px tall the items shrink to icon-only 44px, keeping name and title (§4.3)", () => {
    render(<ModeSwitch orientation="vertical" />);
    const photo = screen.getByRole("radio", { name: "Photo" });
    expect(photo).toHaveClass("size-[52px]", "[@media(max-height:340px)]:size-touch");
    expect(photo).toHaveAttribute("title", "Photo");
    expect(screen.getByText("Photo")).toHaveClass("[@media(max-height:340px)]:hidden");
  });
});
