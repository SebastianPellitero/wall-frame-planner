import { useId, type CSSProperties } from "react";
import { clamp } from "../../lib/geometry";
import { cx } from "./cx";

interface SliderProps {
  /** The visible label, which is also the accessible name. */
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  /** Shown right-aligned and announced as the value, e.g. "60%". */
  readout: string;
  onChange(value: number): void;
  /**
   * "row" (default): label, track, readout in one 44px row. "stacked": label and readout over a
   * full-width track, for the 132px landscape rail. "cells": the three parts become cells of the
   * parent's `grid-cols-[auto_1fr_auto]`, so stacked sliders share one track start and end.
   */
  layout?: "row" | "stacked" | "cells";
  className?: string;
}

/**
 * A slider row (design-system.md §5.7): label, a native `<input type="range">` (restyled in
 * globals.css, `.slider`, so keyboard and screen readers get the platform control) and a
 * readout. The 44px row is the hit area; the track fills with the accent up to the thumb.
 */
export function Slider({ label, value, min, max, step, readout, onChange, layout = "row", className }: SliderProps) {
  const id = useId();
  const pos = max > min ? clamp((value - min) / (max - min), 0, 1) : 0;
  const stacked = layout === "stacked";
  const cells = layout === "cells";

  return (
    <div
      className={cx(
        stacked ? "grid grid-cols-[1fr_auto] items-center gap-x-2" : cells ? "contents" : "flex h-touch items-center gap-3",
        className,
      )}
    >
      <label htmlFor={id} className="shrink-0 text-ui font-medium text-ink">
        {label}
      </label>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-valuetext={readout}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ "--slider-pos": String(pos) } as CSSProperties}
        className={cx("slider h-touch min-w-0", stacked ? "col-span-2 row-start-2" : !cells && "flex-1")}
      />
      <span
        aria-hidden="true"
        className={cx(
          "shrink-0 text-right text-ui text-ink-muted tabular-nums",
          // Fixed, so the track end holds still as the value changes; 5ch fits "100%" (a % is wider than 1ch).
          cells ? "w-[5ch]" : "min-w-[4ch]",
          stacked && "col-start-2 row-start-1",
        )}
      >
        {readout}
      </span>
    </div>
  );
}
