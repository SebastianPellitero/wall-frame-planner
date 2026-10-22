import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { Toggle } from "./Toggle";

function Controlled({ onChange }: { onChange?: (v: boolean) => void }) {
  const [on, setOn] = useState(false);
  return (
    <Toggle
      label="Show grid"
      checked={on}
      onChange={(v) => {
        setOn(v);
        onChange?.(v);
      }}
    />
  );
}

describe("Toggle", () => {
  it("is a switch named by its visible label, and the whole row is the button", () => {
    render(<Toggle label="Show grid" checked={false} onChange={() => {}} />);
    const sw = screen.getByRole("switch", { name: "Show grid" });
    expect(sw.tagName).toBe("BUTTON");
    expect(sw).toHaveAttribute("type", "button");
    expect(sw).toHaveAttribute("aria-checked", "false");
    expect(sw).toHaveClass("h-touch", "w-full");
    expect(sw).toContainElement(screen.getByText("Show grid"));
  });

  it("flips on click, Space and Enter, and reports the new value", async () => {
    const onChange = vi.fn();
    render(<Controlled onChange={onChange} />);
    const sw = screen.getByRole("switch", { name: "Show grid" });
    await userEvent.click(sw);
    expect(sw).toHaveAttribute("aria-checked", "true");
    sw.focus();
    await userEvent.keyboard(" ");
    expect(sw).toHaveAttribute("aria-checked", "false");
    await userEvent.keyboard("{Enter}");
    expect(sw).toHaveAttribute("aria-checked", "true");
    expect(onChange.mock.calls).toEqual([[true], [false], [true]]);
  });

  it("moves the knob as the non-color cue and fills the track with the accent when on", () => {
    const { rerender } = render(<Toggle label="Show grid" checked={false} onChange={() => {}} />);
    const knob = screen.getByTestId("toggle-knob");
    expect(knob).not.toHaveClass("translate-x-[18px]");
    expect(knob.parentElement).toHaveClass("bg-surface-sunken");
    rerender(<Toggle label="Show grid" checked onChange={() => {}} />);
    expect(knob).toHaveClass("translate-x-[18px]");
    expect(knob.parentElement).toHaveClass("bg-accent");
  });
});

describe("Toggle, disabled", () => {
  it("cannot be flipped and says so", async () => {
    const onChange = vi.fn();
    render(<Toggle label="Snap to grid" checked onChange={onChange} disabled />);
    const sw = screen.getByRole("switch", { name: "Snap to grid" });
    expect(sw).toBeDisabled();
    await userEvent.click(sw);
    expect(onChange).not.toHaveBeenCalled();
    expect(sw).toHaveClass("text-ink-disabled");
  });
});
