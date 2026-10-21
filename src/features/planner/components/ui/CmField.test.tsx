import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CmField } from "./CmField";

function setup(value = 40) {
  const onCommit = vi.fn();
  const result = render(<CmField label="Width" value={value} min={1} max={300} onCommit={onCommit} />);
  return { ...result, onCommit, input: screen.getByRole("textbox", { name: "Width (cm)" }) as HTMLInputElement };
}

describe("CmField", () => {
  it("is a decimal text input named '<label> (cm)' showing the value", () => {
    const { input } = setup(42.5);
    expect(input).toHaveAttribute("type", "text");
    expect(input).toHaveAttribute("inputmode", "decimal");
    expect(input).toHaveValue("42.5");
    expect(input).not.toHaveAttribute("aria-invalid", "true");
  });

  it("selects all on focus", () => {
    const { input } = setup();
    fireEvent.focus(input);
    expect([input.selectionStart, input.selectionEnd]).toEqual([0, 2]);
  });

  it("commits the parsed value on Enter", async () => {
    const { input, onCommit } = setup();
    await userEvent.clear(input);
    await userEvent.type(input, "60,5{Enter}");
    expect(onCommit).toHaveBeenCalledExactlyOnceWith(60.5);
  });

  it("commits on blur", async () => {
    const { input, onCommit } = setup();
    await userEvent.clear(input);
    await userEvent.type(input, "55");
    fireEvent.blur(input);
    expect(onCommit).toHaveBeenCalledExactlyOnceWith(55);
  });

  it("does not commit an unchanged value", async () => {
    const { input, onCommit } = setup();
    await userEvent.type(input, "{Enter}");
    fireEvent.blur(input);
    expect(onCommit).not.toHaveBeenCalled();
  });

  it("reverts on Esc without committing", async () => {
    const { input, onCommit } = setup();
    await userEvent.clear(input);
    await userEvent.type(input, "99{Escape}");
    expect(input).toHaveValue("40");
    fireEvent.blur(input);
    expect(onCommit).not.toHaveBeenCalled();
  });

  it("marks an invalid value and shows the limits instead of committing", async () => {
    const { input, onCommit } = setup();
    await userEvent.clear(input);
    await userEvent.type(input, "400{Enter}");
    expect(onCommit).not.toHaveBeenCalled();
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription("Use 1–300 cm");
    expect(screen.getByText("Use 1–300 cm")).toBeInTheDocument();

    await userEvent.type(input, "{Escape}");
    expect(input).toHaveValue("40");
    expect(input).not.toHaveAttribute("aria-invalid", "true");
    expect(screen.queryByText("Use 1–300 cm")).not.toBeInTheDocument();
  });

  it("shows a new value from outside while not editing", () => {
    const { rerender, input, onCommit } = setup();
    rerender(<CmField label="Width" value={70} min={1} max={300} onCommit={onCommit} />);
    expect(input).toHaveValue("70");
  });
});
