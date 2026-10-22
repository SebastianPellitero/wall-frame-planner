import { fireEvent, render, screen, within } from "@testing-library/react";
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

  it("takes an accessible-name override that contains the visible label", () => {
    render(<CmField label="Height" name="Grid height (cm)" value={10} min={1} max={100} onCommit={() => {}} />);
    const input = screen.getByRole("textbox", { name: "Grid height (cm)" });
    expect(screen.getByText("Height")).toBeInTheDocument();
    expect(input).toHaveValue("10");
  });

  it("has a compact variant for the landscape rail", () => {
    render(<CmField label="Width" value={10} min={1} max={100} onCommit={() => {}} compact />);
    expect(screen.getByRole("textbox", { name: "Width (cm)" })).toHaveClass("pl-2", "pr-6");
    expect(screen.getByText("cm")).toHaveClass("right-1.5");
  });

  it("with errorInLabel keeps the label and adds the limits on its row, so the row keeps its height (§5.2)", async () => {
    render(<CmField label="Width" value={40} min={1} max={300} onCommit={() => {}} errorInLabel />);
    const input = screen.getByRole("textbox", { name: "Width (cm)" });
    await userEvent.clear(input);
    await userEvent.type(input, "400{Enter}");
    expect(input).toHaveAccessibleDescription("Use 1–300 cm");
    const label = screen.getByText("Width");
    expect(label).toBeVisible();
    expect(label).toHaveClass("text-ink-muted");
    const limits = label.nextElementSibling as HTMLElement;
    expect(limits).toHaveTextContent("Use 1–300 cm");
    expect(limits).toHaveClass("text-danger", "whitespace-nowrap");
    expect(within(limits).getByText("Use")).toHaveClass("sr-only");
    expect(label.parentElement).toHaveClass("flex", "justify-between", "gap-1");
    // Still the label's row: nothing is added below the field.
    expect(label.parentElement!.nextElementSibling).toContainElement(input);
    expect(label.parentElement!.nextElementSibling!.nextElementSibling).toBeNull();
  });

  it("never wraps its helper, and can center it under a centered field (§5.2)", async () => {
    render(<CmField label="Width" value={40} min={1} max={300} onCommit={() => {}} centerHelper />);
    const input = screen.getByRole("textbox", { name: "Width (cm)" });
    await userEvent.clear(input);
    await userEvent.type(input, "400{Enter}");
    expect(screen.getByText("Use 1–300 cm")).toHaveClass("whitespace-nowrap", "self-center", "text-caption", "text-danger");
  });

  it("keeps the danger outline while an invalid field has focus (§5.2)", () => {
    const { input } = setup();
    expect(input).toHaveClass("aria-invalid:focus-visible:outline-danger", "aria-invalid:focus:outline-danger");
  });

  it("condenses the compact value so three digits clear the unit", () => {
    render(<CmField label="X" value={160} min={0} max={260} onCommit={() => {}} compact />);
    expect(screen.getByRole("textbox", { name: "X (cm)" })).toHaveClass("font-stretch-semi-condensed", "text-body", "pr-6");
  });

  it("with an outside helper, renders none itself and reports its text for the owner to show once", async () => {
    const onInvalidChange = vi.fn();
    render(
      <>
        <CmField label="Width" value={40} min={1} max={300} onCommit={() => {}} helperId="shared" onInvalidChange={onInvalidChange} />
        <span id="shared">Use 1–300 cm</span>
      </>,
    );
    const input = screen.getByRole("textbox", { name: "Width (cm)" });
    await userEvent.clear(input);
    await userEvent.type(input, "400{Enter}");
    expect(screen.getAllByText("Use 1–300 cm")).toHaveLength(1);
    expect(input).toHaveAttribute("aria-describedby", "shared");
    expect(onInvalidChange).toHaveBeenLastCalledWith("Use 1–300 cm");
    await userEvent.type(input, "{Escape}");
    expect(input).not.toHaveAttribute("aria-describedby");
    expect(onInvalidChange).toHaveBeenLastCalledWith(null);
  });

  it("inside a form, Enter commits then submits; an invalid value blocks the submit", async () => {
    const onCommit = vi.fn();
    const onSubmit = vi.fn((e: { preventDefault(): void }) => e.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <CmField label="Width" value={40} min={1} max={300} onCommit={onCommit} />
        <button type="submit">Go</button>
      </form>,
    );
    const input = screen.getByRole("textbox", { name: "Width (cm)" });
    await userEvent.clear(input);
    await userEvent.type(input, "400{Enter}");
    expect(onSubmit).not.toHaveBeenCalled();
    await userEvent.clear(input);
    await userEvent.type(input, "60{Enter}");
    expect(onCommit).toHaveBeenCalledExactlyOnceWith(60);
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onCommit.mock.invocationCallOrder[0]).toBeLessThan(onSubmit.mock.invocationCallOrder[0]);
  });

  it("shows a new value from outside while not editing", () => {
    const { rerender, input, onCommit } = setup();
    rerender(<CmField label="Width" value={70} min={1} max={300} onCommit={onCommit} />);
    expect(input).toHaveValue("70");
  });
});
