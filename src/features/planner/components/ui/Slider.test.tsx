import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { Slider } from "./Slider";

function Controlled({ onChange }: { onChange?: (v: number) => void }) {
  const [v, setV] = useState(60);
  return (
    <Slider
      label="Opacity"
      value={v}
      min={0}
      max={100}
      step={5}
      readout={`${v}%`}
      onChange={(next) => {
        setV(next);
        onChange?.(next);
      }}
    />
  );
}

describe("Slider", () => {
  it("is a native range input named by its visible label, with the readout as its value text", () => {
    render(<Controlled />);
    const slider = screen.getByRole("slider", { name: "Opacity" });
    expect(slider.tagName).toBe("INPUT");
    expect(slider).toHaveAttribute("type", "range");
    expect(slider).toHaveAttribute("min", "0");
    expect(slider).toHaveAttribute("max", "100");
    expect(slider).toHaveAttribute("step", "5");
    expect(slider).toHaveValue("60");
    expect(slider).toHaveAttribute("aria-valuetext", "60%");
    expect(screen.getByText("60%")).toHaveClass("tabular-nums");
  });

  it("is keyboard reachable and reports numeric changes", async () => {
    const onChange = vi.fn();
    render(<Controlled onChange={onChange} />);
    const slider = screen.getByRole("slider", { name: "Opacity" });
    await userEvent.tab();
    expect(slider).toHaveFocus();
    // The browser steps the native range on arrow keys; jsdom only fires the resulting change.
    fireEvent.change(slider, { target: { value: "65" } });
    expect(onChange).toHaveBeenCalledWith(65);
    expect(slider).toHaveAttribute("aria-valuetext", "65%");
  });

  it("fills the track up to the value", () => {
    render(<Controlled />);
    expect(screen.getByRole("slider", { name: "Opacity" }).style.getPropertyValue("--slider-pos")).toBe("0.6");
  });
});

describe("Slider, stacked layout", () => {
  it("puts the label and readout over a full-width track, for narrow rails", () => {
    render(<Slider label="Scale" value={0} min={-2} max={2} step={0.01} readout="100%" onChange={() => {}} layout="stacked" />);
    const slider = screen.getByRole("slider", { name: "Scale" });
    const row = slider.parentElement!;
    expect(row).toHaveClass("grid", "grid-cols-[1fr_auto]");
    expect(slider).toHaveClass("col-span-2");
    expect(screen.getByText("100%")).toBeInTheDocument();
  });
});
